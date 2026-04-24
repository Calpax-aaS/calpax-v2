import { basePrisma } from '@/lib/db/base'
import { fetchWeatherFromAPI } from '@/lib/weather/open-meteo'
import { parseOpenMeteoResponse, type OpenMeteoResponse } from '@/lib/weather/parse'
import { extractCreneauHours } from '@/lib/weather/extract'
import { summarizeWeather } from '@/lib/weather/classify'
import { verifyCronRequest } from '@/lib/auth/cron'
import { logger } from '@/lib/logger'

const CACHE_TTL_MS = 30 * 60 * 1000 // 30 minutes

// 15 min cooldown: supports any cadence ≥ every-15-min, caps abuse of a leaked
// CRON_SECRET to ~96 invocations/day even though current Vercel schedule is
// once-daily at 05:00 UTC (cf. vercel.json).
const MIN_INTERVAL_MS = 15 * 60 * 1000

/**
 * Weather alert cron endpoint.
 * Flags or clears meteoAlert on vols scheduled for today based on wind threshold.
 * Requires Authorization: Bearer <CRON_SECRET> header + per-endpoint cooldown.
 */
export async function GET(request: Request): Promise<Response> {
  const guard = await verifyCronRequest(request, 'meteo-alert', {
    minIntervalMs: MIN_INTERVAL_MS,
  })
  if (!guard.ok) return guard.response

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayStr = today.toISOString().slice(0, 10)

  const vols = await basePrisma.vol.findMany({
    where: {
      date: today,
      statut: { in: ['PLANIFIE', 'CONFIRME'] },
    },
    include: {
      exploitant: {
        select: {
          id: true,
          meteoLatitude: true,
          meteoLongitude: true,
          meteoSeuilVent: true,
        },
      },
      ballon: { select: { nom: true } },
    },
  })

  if (vols.length === 0) {
    logger.info('No vols to check for meteo alerts today')
    return Response.json({ checked: 0, flagged: 0, cleared: 0 })
  }

  let flagged = 0
  let cleared = 0

  // Group vols by exploitant to avoid duplicate weather fetches
  const byExploitant = new Map<string, typeof vols>()
  for (const vol of vols) {
    const key = vol.exploitantId
    if (!byExploitant.has(key)) byExploitant.set(key, [])
    byExploitant.get(key)!.push(vol)
  }

  for (const [, expVols] of byExploitant) {
    const exp = expVols[0]!.exploitant
    if (!exp.meteoLatitude || !exp.meteoLongitude) {
      logger.warn({ exploitantId: exp.id }, 'No coordinates configured — skipping meteo alert')
      continue
    }

    let forecast
    try {
      // Use basePrisma directly since this cron runs outside a tenant request context.
      // Mirrors getWeather() from lib/weather/cache.ts but with basePrisma instead of db.
      const cached = await basePrisma.weatherCache.findUnique({
        where: {
          exploitantId_date: {
            exploitantId: exp.id,
            date: new Date(todayStr + 'T00:00:00Z'),
          },
        },
      })

      if (cached && Date.now() - cached.fetchedAt.getTime() < CACHE_TTL_MS) {
        forecast = parseOpenMeteoResponse(cached.data as OpenMeteoResponse, todayStr)
      } else {
        const response = await fetchWeatherFromAPI({
          latitude: exp.meteoLatitude,
          longitude: exp.meteoLongitude,
          date: todayStr,
        })

        await basePrisma.weatherCache.upsert({
          where: {
            exploitantId_date: {
              exploitantId: exp.id,
              date: new Date(todayStr + 'T00:00:00Z'),
            },
          },
          update: {
            data: response as object,
            fetchedAt: new Date(),
            latitude: exp.meteoLatitude,
            longitude: exp.meteoLongitude,
          },
          create: {
            exploitantId: exp.id,
            date: new Date(todayStr + 'T00:00:00Z'),
            data: response as object,
            latitude: exp.meteoLatitude,
            longitude: exp.meteoLongitude,
          },
        })

        forecast = parseOpenMeteoResponse(response, todayStr)
      }
    } catch (err) {
      logger.warn({ exploitantId: exp.id, err }, '[meteo-alert] Failed to fetch weather')
      continue
    }

    const threshold = exp.meteoSeuilVent ?? 15

    for (const vol of expVols) {
      const hours = extractCreneauHours(forecast, vol.creneau)
      const summary = summarizeWeather(hours, threshold)
      const shouldAlert = summary.level !== 'OK'

      if (shouldAlert && !vol.meteoAlert) {
        await basePrisma.vol.update({
          where: { id: vol.id },
          data: { meteoAlert: true },
        })
        logger.info(
          { volId: vol.id, ballon: vol.ballon.nom, maxWind: summary.maxWindKmh, threshold },
          '[meteo-alert] Vol flagged',
        )
        flagged++
      } else if (!shouldAlert && vol.meteoAlert) {
        await basePrisma.vol.update({
          where: { id: vol.id },
          data: { meteoAlert: false },
        })
        logger.info(
          { volId: vol.id, ballon: vol.ballon.nom, maxWind: summary.maxWindKmh, threshold },
          '[meteo-alert] Vol cleared',
        )
        cleared++
      }
    }
  }

  logger.info({ checked: vols.length, flagged, cleared }, 'Cron meteo-alert complete')
  return Response.json({ checked: vols.length, flagged, cleared })
}
