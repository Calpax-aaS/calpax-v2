import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { AlertTriangle, Thermometer } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Chip } from '@/components/cockpit/chip'
import { LoadBar } from '@/components/cockpit/load-bar'
import { MonoValue } from '@/components/cockpit/mono-value'
import { WindArrow } from '@/components/cockpit/wind-arrow'
import { cn } from '@/lib/utils'
import type { UserRole } from '@/lib/context'

type MassBudget = {
  totalWeight: number
  maxPayload: number
  status: 'OK' | 'WARNING' | 'OVER'
}

type WeatherSummary = {
  maxWindKt: number
  maxWindAltitude: string
  avgTemperature: number
  goNogo: 'GO' | 'NOGO' | 'MARGINAL'
  creneauRange: string
}

export type FlightCardData = {
  id: string
  date: string
  creneau: 'MATIN' | 'SOIR'
  statut: string
  ballonNom: string
  ballonImmat: string
  piloteNom: string
  equipierNom: string | null
  siteDeco: string | null
  passagerCount: number
  passagerMax: number
  massBudget: MassBudget | null
  weather: WeatherSummary | null
  meteoAlert: boolean
}

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

const GONOGO_CHIP: Record<WeatherSummary['goNogo'], Parameters<typeof Chip>[0]['tone']> = {
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
          className="-mx-4 -mt-4 flex items-center gap-2 border-b border-dusk-200 bg-dusk-50 px-4 py-2 text-xs font-medium text-dusk-700"
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

      {/* Meta grid 2x2 */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
        <MetaField label={tv('fields.pilote')} value={flight.piloteNom} />
        <MetaField label={tv('fields.equipier')} value={flight.equipierNom ?? '—'} />
        <MetaField label={tv('fields.lieuDecollage')} value={flight.siteDeco ?? '—'} />
        <div className="space-y-1">
          <div className="mono cap text-[10px] text-sky-500">{t('capacity')}</div>
          <LoadBar
            value={flight.passagerCount}
            max={flight.passagerMax}
            tone={CAPACITY_TONE(flight.passagerCount, flight.passagerMax)}
            showText
          />
        </div>
      </div>

      {/* Mass budget */}
      {flight.massBudget ? (
        <div className="space-y-1.5 rounded-md bg-sky-50 px-3 py-2.5">
          <div className="flex items-center justify-between gap-2">
            <span className="mono cap text-[10px] text-sky-500">{t('massLabel')}</span>
            <Chip tone={MASS_CHIP[flight.massBudget.status]} size="sm">
              {t(MASS_LABEL_KEY[flight.massBudget.status])}
            </Chip>
          </div>
          <LoadBar
            value={flight.massBudget.totalWeight}
            max={flight.massBudget.maxPayload}
            tone={MASS_TONE[flight.massBudget.status]}
            height={6}
          />
          <div className="flex justify-between text-[11px]">
            <MonoValue value={flight.massBudget.totalWeight} unit="kg" size={11} />
            <MonoValue value={flight.massBudget.maxPayload} unit="kg" tone="muted" size={11} />
          </div>
        </div>
      ) : (
        <div className="text-xs italic text-sky-400">{t('massUnavailable')}</div>
      )}

      {/* Weather strip */}
      {flight.weather && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-md bg-sky-50 px-3 py-2 text-sm">
          <span className="mono cap text-[10px] text-sky-500">
            {tv(`creneau.${flight.creneau}`)} · {flight.weather.creneauRange}
          </span>
          <div className="flex items-center gap-1.5 text-sky-700">
            <WindArrow
              direction={0}
              speed={flight.weather.maxWindKt}
              size={16}
              className="text-sky-500"
            />
            <MonoValue value={flight.weather.maxWindKt} unit="kt" size={12} />
            <span className="text-[10px] text-sky-400">({flight.weather.maxWindAltitude})</span>
          </div>
          <div className="flex items-center gap-1 text-sky-700">
            <Thermometer className="h-3.5 w-3.5 text-sky-500" aria-hidden />
            <MonoValue value={flight.weather.avgTemperature} unit="°C" size={12} />
          </div>
          <Chip tone={GONOGO_CHIP[flight.weather.goNogo]} size="sm" className="ml-auto">
            {t(`goNogo.${flight.weather.goNogo}`)}
          </Chip>
        </div>
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
      <div className="mono cap text-[10px] text-sky-500">{label}</div>
      <div className="truncate font-medium text-sky-900">{value}</div>
    </div>
  )
}
