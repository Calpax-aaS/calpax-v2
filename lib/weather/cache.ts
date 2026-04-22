import { AuditAction } from '@prisma/client'
import { db } from '@/lib/db'
import { writeAudit } from '@/lib/audit/write'
import { fetchWeatherFromAPI } from './open-meteo'
import { parseOpenMeteoResponse } from './parse'
import type { WeatherForecast } from './types'
import type { OpenMeteoResponse } from './parse'

const CACHE_TTL_MS = 30 * 60 * 1000 // 30 minutes

/**
 * Per-instance in-flight deduplication: coalesces concurrent `getWeather()`
 * calls for the same `(exploitantId, date)` so a cache-miss burst only hits
 * Open-Meteo once. Entries are removed as soon as the promise settles.
 *
 * This is intentionally in-memory (Map) — a single Vercel serverless
 * invocation rarely needs more, and cross-instance coalescing would require
 * Redis which isn't in the stack today.
 */
const inFlight = new Map<string, Promise<WeatherForecast>>()

type GetWeatherParams = {
  exploitantId: string
  latitude: number
  longitude: number
  date: string // YYYY-MM-DD
  forceRefresh?: boolean
}

export async function getWeather(params: GetWeatherParams): Promise<WeatherForecast> {
  const { exploitantId, date, forceRefresh } = params

  if (!forceRefresh) {
    const pending = inFlight.get(`${exploitantId}:${date}`)
    if (pending) return pending
  }

  const promise = getWeatherUncoalesced(params)
  const key = `${exploitantId}:${date}`
  inFlight.set(key, promise)
  try {
    return await promise
  } finally {
    inFlight.delete(key)
  }
}

async function getWeatherUncoalesced(params: GetWeatherParams): Promise<WeatherForecast> {
  const { exploitantId, latitude, longitude, date, forceRefresh } = params

  try {
    if (!forceRefresh) {
      const cached = await db.weatherCache.findUnique({
        where: { exploitantId_date: { exploitantId, date: new Date(date + 'T00:00:00Z') } },
      })

      if (cached) {
        const age = Date.now() - cached.fetchedAt.getTime()
        if (age < CACHE_TTL_MS) {
          return parseOpenMeteoResponse(cached.data as OpenMeteoResponse, date)
        }
      }
    }

    const response = await fetchWeatherFromAPI({ latitude, longitude, date })

    await db.weatherCache.upsert({
      where: { exploitantId_date: { exploitantId, date: new Date(date + 'T00:00:00Z') } },
      update: {
        data: response as object,
        fetchedAt: new Date(),
        latitude,
        longitude,
      },
      create: {
        exploitantId,
        date: new Date(date + 'T00:00:00Z'),
        data: response as object,
        latitude,
        longitude,
      },
    })

    return parseOpenMeteoResponse(response, date)
  } catch (err) {
    // Emit a best-effort audit entry so super-admins notice repeated Open-Meteo
    // outages in the audit view instead of a silent `catch {}` at the call site.
    // No PII here — only exploitant + date + error message.
    await writeAudit({
      exploitantId,
      entityType: 'Weather',
      entityId: `${exploitantId}:${date}`,
      action: AuditAction.UPDATE,
      field: 'fetch_failed',
      afterValue: {
        date,
        error: err instanceof Error ? err.message : String(err),
      },
    })
    throw err
  }
}
