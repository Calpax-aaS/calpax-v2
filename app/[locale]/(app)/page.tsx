import { getTranslations } from 'next-intl/server'
import Link from 'next/link'
import { Plane } from 'lucide-react'
import { requireAuth } from '@/lib/auth/requireAuth'
import { getContext } from '@/lib/context'
import { db } from '@/lib/db'
import { buildVolWhereForRole } from '@/lib/vol/role-filter'
import { getWeather } from '@/lib/weather/cache'
import { extractCreneauHours } from '@/lib/weather/extract'
import { summarizeWeather } from '@/lib/weather/classify'
import { buildBallonAlerts, buildPiloteAlerts, sortAlerts } from '@/lib/regulatory/alerts'
import { safeDecryptInt } from '@/lib/crypto'
import { AlertsBanner } from '@/components/alerts-banner'
import { FlightCard, type FlightCardData } from '@/components/flight-card'
import { KpiRow, KpiTile } from '@/components/cockpit/kpi-tile'
import { WindArrow } from '@/components/cockpit/wind-arrow'
import { Button } from '@/components/ui/button'
import type { Prisma } from '@prisma/client'
import type { WeatherForecast, WeatherSummary } from '@/lib/weather/types'

type Props = {
  params: Promise<{ locale: string }>
}

type MassBudget = {
  totalWeight: number
  maxPayload: number
  status: 'OK' | 'WARNING' | 'OVER'
}

type VolWithRelations = Prisma.VolGetPayload<{
  include: {
    ballon: true
    pilote: true
    equipierEntity: true
    siteDecollageEntity: true
    passagers: true
  }
}>

function computeMassBudget(vol: VolWithRelations, forecastTemp: number | null): MassBudget | null {
  const chart = vol.ballon.performanceChart as Record<string, number> | null
  if (!chart || forecastTemp === null) return null

  const temps = Object.keys(chart)
    .map(Number)
    .sort((a, b) => a - b)
  if (temps.length === 0) return null

  const closest = temps.reduce((prev, curr) =>
    Math.abs(curr - forecastTemp) < Math.abs(prev - forecastTemp) ? curr : prev,
  )
  const maxPayload = chart[String(closest)] ?? 0

  const totalWeight = vol.passagers.reduce((sum, p) => {
    return sum + safeDecryptInt(p.poidsEncrypted)
  }, 0)

  const status: 'OK' | 'WARNING' | 'OVER' =
    totalWeight > maxPayload ? 'OVER' : totalWeight > maxPayload * 0.9 ? 'WARNING' : 'OK'

  return { totalWeight, maxPayload, status }
}

function levelToGoNogo(level: WeatherSummary['level']): 'GO' | 'NOGO' | 'MARGINAL' {
  if (level === 'OK') return 'GO'
  if (level === 'DANGER') return 'NOGO'
  return 'MARGINAL'
}

export default async function HomePage({ params }: Props) {
  const { locale } = await params

  return requireAuth(async () => {
    const t = await getTranslations('dashboard')
    const ctx = getContext()

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayStr = today.toISOString().slice(0, 10)

    // 1. Fetch today's vols with role-based filtering
    const baseWhere = { date: today, statut: { not: 'ANNULE' as const } }
    const where = buildVolWhereForRole(baseWhere, ctx.role, ctx.userId)

    const vols = await db.vol.findMany({
      where,
      include: {
        ballon: true,
        pilote: true,
        equipierEntity: true,
        siteDecollageEntity: true,
        passagers: true,
      },
      orderBy: [{ creneau: 'asc' }, { createdAt: 'asc' }],
    })

    // 2. Fetch exploitant weather config
    const exploitant = await db.exploitant.findUniqueOrThrow({
      where: { id: ctx.exploitantId },
      select: { meteoLatitude: true, meteoLongitude: true, meteoSeuilVent: true },
    })

    // 3. Fetch weather forecast (non-blocking)
    let forecast: WeatherForecast | null = null
    if (exploitant.meteoLatitude && exploitant.meteoLongitude) {
      try {
        forecast = await getWeather({
          exploitantId: ctx.exploitantId,
          latitude: exploitant.meteoLatitude,
          longitude: exploitant.meteoLongitude,
          date: todayStr,
        })
      } catch {
        // Weather fetch failure is non-blocking
      }
    }

    const seuilVent = exploitant.meteoSeuilVent ?? 15

    const CRENEAU_LABELS: Record<string, string> = {
      MATIN: '05h — 10h',
      SOIR: '17h — 22h',
    }

    // Helper: get weather summary per créneau
    function getWeatherForCreneau(creneau: 'MATIN' | 'SOIR'): FlightCardData['weather'] {
      if (!forecast) return null
      const hours = extractCreneauHours(forecast, creneau)
      if (hours.length === 0) return null
      const summary = summarizeWeather(hours, seuilVent)
      return {
        maxWindKt: summary.maxWindKt,
        maxWindAltitude: summary.maxWindAltitude,
        avgTemperature: summary.avgTemperature,
        goNogo: levelToGoNogo(summary.level),
        creneauRange: CRENEAU_LABELS[creneau] ?? '',
      }
    }

    // 4. Build regulatory alerts filtered to today's entities
    const todayBallonIds = [...new Set(vols.map((v) => v.ballonId))]
    const todayPiloteIds = [...new Set(vols.map((v) => v.piloteId))]

    const [todayBallons, todayPilotes] = await Promise.all([
      todayBallonIds.length > 0
        ? db.ballon.findMany({
            where: { id: { in: todayBallonIds }, actif: true },
            select: {
              id: true,
              nom: true,
              immatriculation: true,
              camoExpiryDate: true,
              actif: true,
            },
          })
        : Promise.resolve([]),
      todayPiloteIds.length > 0
        ? db.pilote.findMany({
            where: { id: { in: todayPiloteIds }, actif: true },
            select: { id: true, prenom: true, nom: true, dateExpirationLicence: true, actif: true },
          })
        : Promise.resolve([]),
    ])

    const alerts = sortAlerts([
      ...buildBallonAlerts(todayBallons, today),
      ...buildPiloteAlerts(todayPilotes, today),
    ])
    const criticalAlerts = alerts.filter(
      (a) => a.severity === 'EXPIRED' || a.severity === 'CRITICAL',
    )

    // 5. Map vols to FlightCardData
    const cards: FlightCardData[] = vols.map((vol) => {
      const weatherSummary = getWeatherForCreneau(vol.creneau as 'MATIN' | 'SOIR')
      const forecastTemp = weatherSummary?.avgTemperature ?? null
      return {
        id: vol.id,
        date: todayStr,
        creneau: vol.creneau as 'MATIN' | 'SOIR',
        statut: vol.statut,
        ballonNom: vol.ballon.nom,
        ballonImmat: vol.ballon.immatriculation,
        piloteNom: `${vol.pilote.prenom} ${vol.pilote.nom}`,
        equipierNom: vol.equipierEntity
          ? `${vol.equipierEntity.prenom} ${vol.equipierEntity.nom}`
          : (vol.equipierAutre ?? null),
        siteDeco: vol.siteDecollageEntity?.nom ?? vol.lieuDecollageAutre ?? null,
        passagerCount: vol.passagers.length,
        passagerMax: vol.ballon.nbPassagerMax,
        massBudget: computeMassBudget(vol, forecastTemp),
        weather: weatherSummary,
        meteoAlert: vol.meteoAlert,
      }
    })

    // 6. Derive cockpit KPIs from today's data
    const nextFlight = cards[0] ?? null
    const maxWindKt = cards.reduce(
      (max, c) => (c.weather && c.weather.maxWindKt > max ? c.weather.maxWindKt : max),
      0,
    )
    const paxBooked = cards.reduce((sum, c) => sum + c.passagerCount, 0)
    const paxSeats = cards.reduce((sum, c) => sum + c.passagerMax, 0)

    const dateLabel = today.toLocaleDateString(locale === 'fr' ? 'fr-FR' : 'en-US', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })

    return (
      <div className="space-y-6">
        {/* Header */}
        <header className="space-y-1">
          <div className="mono cap text-[11px] text-dusk-700">{t('kicker')}</div>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <h1 className="font-display text-3xl font-semibold tracking-tight text-sky-900">
              {t('title')}
            </h1>
            <div className="mono text-[11px] text-sky-500">
              <span className="cap">{dateLabel}</span>
              <span className="mx-2 opacity-50">·</span>
              <span>{t('flightCount', { count: vols.length })}</span>
            </div>
          </div>
        </header>

        {/* KPI row */}
        <KpiRow>
          <KpiTile
            label={t('kpi.nextFlight')}
            value={nextFlight ? CRENEAU_LABELS[nextFlight.creneau] : t('kpi.nextFlightEmpty')}
            sub={nextFlight ? `${nextFlight.ballonImmat} · ${nextFlight.ballonNom}` : null}
            tone={nextFlight ? 'dusk' : 'default'}
          />
          <KpiTile
            label={t('kpi.wind')}
            value={maxWindKt > 0 ? `${maxWindKt}` : t('kpi.windEmpty')}
            sub={maxWindKt > 0 ? t('kpi.windUnit') : null}
            icon={maxWindKt > 0 ? <WindArrow speed={maxWindKt} size={16} /> : null}
            tone={maxWindKt >= seuilVent ? 'warn' : 'default'}
          />
          <KpiTile
            label={t('kpi.pax')}
            value={t('kpi.paxCovered', { booked: paxBooked, seats: paxSeats })}
            tone="default"
          />
          <KpiTile
            label={t('kpi.flights')}
            value={vols.length}
            sub={t('kpi.flightsSub')}
            tone="default"
          />
        </KpiRow>

        {criticalAlerts.length > 0 && <AlertsBanner alerts={criticalAlerts} />}

        {vols.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-sky-200 bg-card py-16 text-center">
            <Plane className="mb-4 h-12 w-12 text-sky-300" aria-hidden />
            <p className="mb-4 text-sky-500">{t('noFlights')}</p>
            <Button asChild variant="outline">
              <Link href={`/${locale}/vols`}>{t('goToPlanning')}</Link>
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {cards.map((card) => (
              <FlightCard key={card.id} flight={card} locale={locale} userRole={ctx.role} />
            ))}
          </div>
        )}
      </div>
    )
  })
}
