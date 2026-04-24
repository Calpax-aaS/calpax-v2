import { Suspense } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { AlertTriangle, Thermometer } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Chip } from '@/components/cockpit/chip'
import { LoadBar } from '@/components/cockpit/load-bar'
import { MonoValue } from '@/components/cockpit/mono-value'
import { WindArrow } from '@/components/cockpit/wind-arrow'
import { MonoLabel } from '@/components/cockpit/mono-label'
import { WeatherStripSkeleton } from '@/components/cockpit/weather-strip-skeleton'
import { cn } from '@/lib/utils'
import type { UserRole } from '@/lib/context'
import type { FlightCardData, FlightCardWeather, MassBudget } from '@/lib/vol/flight-card-types'

export type { FlightCardData } from '@/lib/vol/flight-card-types'

type Props = {
  flight: FlightCardData
  locale: string
  showActions?: boolean
  userRole?: UserRole
}

const CAN_ORGANIZE: UserRole[] = ['ADMIN_CALPAX', 'GERANT']

const STATUT_CHIP: Record<string, Parameters<typeof Chip>[0]['tone']> = {
  PLANIFIE: 'neutral',
  CONFIRME: 'info',
  TERMINE: 'ok',
  ARCHIVE: 'neutral',
  ANNULE: 'danger',
}

const MASS_TONE: Record<MassBudget['status'], Parameters<typeof LoadBar>[0]['tone']> = {
  OK: 'ok',
  WARNING: 'warn',
  OVER: 'danger',
}

const MASS_CHIP: Record<MassBudget['status'], Parameters<typeof Chip>[0]['tone']> = {
  OK: 'ok',
  WARNING: 'warn',
  OVER: 'danger',
}

const MASS_LABEL_KEY: Record<MassBudget['status'], string> = {
  OK: 'massOk',
  WARNING: 'massWarning',
  OVER: 'massOver',
}

const GONOGO_CHIP: Record<FlightCardWeather['goNogo'], Parameters<typeof Chip>[0]['tone']> = {
  GO: 'ok',
  NOGO: 'danger',
  MARGINAL: 'warn',
}

const CAPACITY_TONE: (c: number, m: number) => Parameters<typeof LoadBar>[0]['tone'] = (
  count,
  max,
) => {
  if (max === 0) return 'ink'
  if (count > max) return 'danger'
  if (count / max >= 0.8) return 'warn'
  return 'ok'
}

export function FlightCard({ flight, locale, showActions = true, userRole }: Props) {
  const t = useTranslations('dashboard')
  const tv = useTranslations('vols')
  const canOrganize = !!userRole && CAN_ORGANIZE.includes(userRole)

  return (
    <article
      className={cn(
        'flex flex-col gap-4 rounded-lg border border-sky-100 bg-card p-4 shadow-[var(--sh-1)]',
        flight.meteoAlert && 'border-dusk-200',
      )}
    >
      {/* Meteo alert strip */}
      {flight.meteoAlert && (
        <div
          role="status"
          className="-mx-4 -mt-4 flex items-center gap-2 border-b border-dusk-300 bg-dusk-100 px-4 py-2 text-xs font-medium text-dusk-800"
        >
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden />
          <span>{t('meteoAlert')}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <Chip tone="dusk" size="sm">
            {tv(`creneau.${flight.creneau}`)}
          </Chip>
          <MonoValue value={flight.ballonImmat} size={12} tone="muted" />
          <span className="font-display text-sm font-medium text-sky-900">{flight.ballonNom}</span>
        </div>
        <Chip tone={STATUT_CHIP[flight.statut] ?? 'neutral'} size="sm">
          {tv(`statut.${flight.statut}`)}
        </Chip>
      </div>

      {/* Meta grid: 1 col on narrow phones, 2 cols from ~380px up */}
      <div className="grid grid-cols-1 gap-x-4 gap-y-3 text-sm min-[380px]:grid-cols-2">
        <MetaField label={tv('fields.pilote')} value={flight.piloteNom} />
        <MetaField label={tv('fields.equipier')} value={flight.equipierNom ?? '—'} />
        <MetaField label={tv('fields.lieuDecollage')} value={flight.siteDeco ?? '—'} />
        <div className="space-y-1">
          <MonoLabel as="div">{t('capacity')}</MonoLabel>
          <LoadBar
            value={flight.passagerCount}
            max={flight.passagerMax}
            tone={CAPACITY_TONE(flight.passagerCount, flight.passagerMax)}
            showText
            ariaLabel={t('capacity')}
          />
        </div>
      </div>

      {/* Mass budget */}
      {flight.massBudget ? (
        <div className="space-y-1.5 rounded-md bg-sky-50 px-3 py-2.5">
          <div className="flex items-center justify-between gap-2">
            <MonoLabel>{t('massLabel')}</MonoLabel>
            <TooltipProvider delayDuration={150}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span>
                    <Chip tone={MASS_CHIP[flight.massBudget.status]} size="sm">
                      {t(MASS_LABEL_KEY[flight.massBudget.status])}
                    </Chip>
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  <span className="mono">
                    {t('massTooltip', {
                      charge: flight.massBudget.totalWeight,
                      max: flight.massBudget.maxPayload,
                      marge: flight.massBudget.maxPayload - flight.massBudget.totalWeight,
                    })}
                  </span>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <LoadBar
            value={flight.massBudget.totalWeight}
            max={flight.massBudget.maxPayload}
            tone={MASS_TONE[flight.massBudget.status]}
            height={6}
            ariaLabel={t('massLabel')}
          />
          <div className="flex justify-between text-[11px]">
            <MonoValue value={flight.massBudget.totalWeight} unit="kg" size={11} />
            <MonoValue value={flight.massBudget.maxPayload} unit="kg" tone="muted" size={11} />
          </div>
        </div>
      ) : (
        <div className="text-xs italic text-sky-400">{t('massUnavailable')}</div>
      )}

      {/* Weather strip — wrapped in Suspense so a descendant can `use()` a
          weather promise and fall back to the skeleton. Today `flight.weather`
          is pre-computed server-side, so the boundary is a no-op; it stays
          here for when the dashboard moves weather fetching into a streaming
          boundary (see #48 follow-up). */}
      {flight.weather && (
        <Suspense fallback={<WeatherStripSkeleton />}>
          <WeatherStrip
            weather={flight.weather}
            creneauLabel={tv(`creneau.${flight.creneau}`)}
            goNogoLabel={t(`goNogo.${flight.weather.goNogo}`)}
            windLabel={t('windAriaLabel', {
              speed: flight.weather.maxWindKmh,
              altitude: flight.weather.maxWindAltitude,
            })}
          />
        </Suspense>
      )}

      {/* Actions */}
      {showActions && (
        <div className="flex flex-wrap gap-2 pt-0.5">
          <Button asChild size="sm" variant="outline">
            <Link href={`/${locale}/vols/${flight.id}`}>{tv('detail')}</Link>
          </Button>
          {canOrganize && flight.statut === 'PLANIFIE' && (
            <Button asChild size="sm">
              <Link href={`/${locale}/vols/${flight.id}/organiser`}>{tv('organiser')}</Link>
            </Button>
          )}
        </div>
      )}
    </article>
  )
}

function MetaField({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-0.5 min-w-0">
      <MonoLabel as="div">{label}</MonoLabel>
      <div className="truncate font-medium text-sky-900">{value}</div>
    </div>
  )
}

function WeatherStrip({
  weather,
  creneauLabel,
  goNogoLabel,
  windLabel,
}: {
  weather: FlightCardWeather
  creneauLabel: string
  goNogoLabel: string
  windLabel: string
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-md bg-sky-50 px-3 py-2 text-sm">
      <MonoLabel>
        {creneauLabel} · {weather.creneauRange}
      </MonoLabel>
      <div className="flex items-center gap-1.5 text-sky-700">
        <WindArrow
          direction={0}
          speed={weather.maxWindKmh}
          unit="km/h"
          label={windLabel}
          size={16}
          className="text-sky-500"
        />
        <MonoValue value={weather.maxWindKmh} unit="km/h" size={12} />
        <span className="text-[10px] text-sky-400">({weather.maxWindAltitude})</span>
      </div>
      <div className="flex items-center gap-1 text-sky-700">
        <Thermometer className="h-3.5 w-3.5 text-sky-500" aria-hidden />
        <MonoValue value={weather.avgTemperature} unit="°C" size={12} />
      </div>
      <Chip tone={GONOGO_CHIP[weather.goNogo]} size="sm" className="ml-auto">
        {goNogoLabel}
      </Chip>
    </div>
  )
}
