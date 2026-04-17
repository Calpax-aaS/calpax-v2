import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { Users, Wind, Thermometer, AlertTriangle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type MassBudget = {
  totalWeight: number
  maxPayload: number
  status: 'OK' | 'WARNING' | 'OVER'
}

type WeatherSummary = {
  maxWindKt: number
  avgTemperature: number
  goNogo: 'GO' | 'NOGO' | 'MARGINAL'
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
}

const STATUT_VARIANT: Record<string, 'outline' | 'secondary' | 'default' | 'destructive'> = {
  PLANIFIE: 'outline',
  CONFIRME: 'secondary',
  TERMINE: 'default',
  ARCHIVE: 'default',
  ANNULE: 'destructive',
}

const MASS_COLORS: Record<string, string> = {
  OK: 'text-green-600',
  WARNING: 'text-amber-600',
  OVER: 'text-red-600',
}

export function FlightCard({ flight, locale, showActions = true }: Props) {
  const t = useTranslations('dashboard')
  const tv = useTranslations('vols')

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
          {flight.equipierNom && (
            <div>
              <span className="text-xs text-muted-foreground">{tv('fields.equipier')}</span>
              <p className="font-medium">{flight.equipierNom}</p>
            </div>
          )}
          {flight.siteDeco && (
            <div>
              <span className="text-xs text-muted-foreground">{tv('fields.lieuDecollage')}</span>
              <p className="font-medium">{flight.siteDeco}</p>
            </div>
          )}
        </div>

        {/* Passengers + mass */}
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1">
            <Users className="h-3.5 w-3.5 text-muted-foreground" />
            <span>
              {flight.passagerCount}/{flight.passagerMax} {t('passengers')}
            </span>
          </div>
          {flight.massBudget && (
            <span className={cn('font-medium', MASS_COLORS[flight.massBudget.status])}>
              {flight.massBudget.totalWeight}kg / {flight.massBudget.maxPayload}kg
            </span>
          )}
        </div>

        {/* Weather */}
        {flight.weather && (
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1">
              <Wind className="h-3.5 w-3.5 text-muted-foreground" />
              <span>{flight.weather.maxWindKt} kt</span>
            </div>
            <div className="flex items-center gap-1">
              <Thermometer className="h-3.5 w-3.5 text-muted-foreground" />
              <span>{flight.weather.avgTemperature}°C</span>
            </div>
            <Badge
              variant={
                flight.weather.goNogo === 'GO'
                  ? 'secondary'
                  : flight.weather.goNogo === 'NOGO'
                    ? 'destructive'
                    : 'warning'
              }
            >
              {t(`goNogo.${flight.weather.goNogo}`)}
            </Badge>
          </div>
        )}

        {/* Meteo alert */}
        {flight.meteoAlert && (
          <div className="flex items-center gap-2 rounded-md bg-amber-100 px-3 py-2 text-sm text-amber-800">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{t('meteoAlert')}</span>
          </div>
        )}

        {/* Actions */}
        {showActions && (
          <div className="flex flex-wrap gap-2 pt-1">
            <Button asChild size="sm" variant="outline">
              <Link href={`/${locale}/vols/${flight.id}`}>{tv('detail')}</Link>
            </Button>
            {flight.statut === 'PLANIFIE' && (
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
