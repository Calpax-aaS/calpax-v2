import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { Wind, Thermometer, AlertTriangle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
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

function capacityColorClass(count: number, max: number): string {
  if (max === 0) return ''
  if (count > max) return 'text-red-700'
  if (count / max >= 0.8) return 'text-amber-700'
  return 'text-green-700'
}

type BadgeVariant = 'outline' | 'secondary' | 'default' | 'destructive' | 'warning'

const STATUT_VARIANT: Record<string, BadgeVariant> = {
  PLANIFIE: 'outline',
  CONFIRME: 'secondary',
  TERMINE: 'default',
  ARCHIVE: 'default',
  ANNULE: 'destructive',
}

const MASS_COLORS: Record<MassBudget['status'], string> = {
  OK: 'text-green-700',
  WARNING: 'text-amber-700',
  OVER: 'text-red-700',
}

const MASS_VARIANT: Record<MassBudget['status'], BadgeVariant> = {
  OK: 'secondary',
  WARNING: 'warning',
  OVER: 'destructive',
}

const MASS_LABEL_KEY: Record<MassBudget['status'], string> = {
  OK: 'massOk',
  WARNING: 'massWarning',
  OVER: 'massOver',
}

const GONOGO_VARIANT: Record<WeatherSummary['goNogo'], BadgeVariant> = {
  GO: 'secondary',
  NOGO: 'destructive',
  MARGINAL: 'warning',
}

export function FlightCard({ flight, locale, showActions = true, userRole }: Props) {
  const t = useTranslations('dashboard')
  const tv = useTranslations('vols')
  const canOrganize = !!userRole && CAN_ORGANIZE.includes(userRole)

  return (
    <Card className={cn(flight.meteoAlert && 'border-amber-400 bg-amber-50/50')}>
      <CardContent className="p-4 space-y-3">
        {/* Header: créneau + statut */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {tv(`creneau.${flight.creneau}`)}
            </Badge>
            <span className="text-sm font-semibold">{flight.ballonNom}</span>
            <span className="text-xs text-muted-foreground">({flight.ballonImmat})</span>
          </div>
          <Badge variant={STATUT_VARIANT[flight.statut] ?? 'outline'}>
            {tv(`statut.${flight.statut}`)}
          </Badge>
        </div>

        {/* Crew + site */}
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <span className="text-xs text-muted-foreground">{tv('fields.pilote')}</span>
            <p className="font-medium">{flight.piloteNom}</p>
          </div>
          <div>
            <span className="text-xs text-muted-foreground">{tv('fields.equipier')}</span>
            <p className="font-medium">{flight.equipierNom ?? '—'}</p>
          </div>
          <div>
            <span className="text-xs text-muted-foreground">{tv('fields.lieuDecollage')}</span>
            <p className="font-medium">{flight.siteDeco ?? '—'}</p>
          </div>
          <div>
            <span className="text-xs text-muted-foreground">{t('capacity')}</span>
            <p
              className={cn(
                'font-medium',
                capacityColorClass(flight.passagerCount, flight.passagerMax),
              )}
            >
              {flight.passagerCount}/{flight.passagerMax}
            </p>
          </div>
        </div>

        {/* Mass budget */}
        {flight.massBudget ? (
          <div className="flex items-center gap-3 text-sm rounded-md bg-muted/50 px-3 py-2">
            <span className="text-muted-foreground">{t('massLabel')}</span>
            <span className={cn('font-semibold', MASS_COLORS[flight.massBudget.status])}>
              {flight.massBudget.totalWeight} kg / {flight.massBudget.maxPayload} kg
            </span>
            <Badge variant={MASS_VARIANT[flight.massBudget.status]} className="text-xs">
              {t(MASS_LABEL_KEY[flight.massBudget.status])}
            </Badge>
          </div>
        ) : (
          <div className="text-xs text-muted-foreground italic">{t('massUnavailable')}</div>
        )}

        {/* Weather */}
        {flight.weather && (
          <div
            className={cn(
              'rounded-md px-3 py-2 text-sm space-y-1.5',
              flight.meteoAlert ? 'bg-amber-100' : 'bg-muted/50',
            )}
          >
            <div className="flex items-center gap-4 flex-wrap">
              <span className="text-muted-foreground">
                {tv(`creneau.${flight.creneau}`)} ({flight.weather.creneauRange})
              </span>
              <div className="flex items-center gap-1">
                <Wind className="h-4 w-4 text-muted-foreground" />
                <span>
                  {flight.weather.maxWindKt} km/h ({flight.weather.maxWindAltitude})
                </span>
              </div>
              <div className="flex items-center gap-1">
                <Thermometer className="h-4 w-4 text-muted-foreground" />
                <span>{flight.weather.avgTemperature}°C</span>
              </div>
              <Badge variant={GONOGO_VARIANT[flight.weather.goNogo]}>
                {t(`goNogo.${flight.weather.goNogo}`)}
              </Badge>
            </div>
            {flight.meteoAlert && (
              <div role="status" className="flex items-center gap-2 text-amber-900 font-medium">
                <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>{t('meteoAlert')}</span>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        {showActions && (
          <div className="flex flex-wrap gap-2 pt-1">
            <Button asChild size="sm" variant="outline">
              <Link href={`/${locale}/vols/${flight.id}`}>{tv('detail')}</Link>
            </Button>
            {canOrganize && flight.statut === 'PLANIFIE' && (
              <Button asChild size="sm" variant="outline">
                <Link href={`/${locale}/vols/${flight.id}/organiser`}>{tv('organiser')}</Link>
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
