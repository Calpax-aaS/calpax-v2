import { getTranslations } from 'next-intl/server'
import { requireAuth } from '@/lib/auth/requireAuth'
import { getContext } from '@/lib/context'
import { db } from '@/lib/db'
import { buildBallonAlerts, buildPiloteAlerts, sortAlerts } from '@/lib/regulatory/alerts'
import { getWeather } from '@/lib/weather/cache'
import { extractCreneauHours } from '@/lib/weather/extract'
import { summarizeWeather } from '@/lib/weather/classify'
import type { WeatherSummary } from '@/lib/weather/types'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

type Props = {
  params: Promise<{ locale: string }>
}

export default async function HomePage({ params }: Props) {
  await params

  return requireAuth(async () => {
    const t = await getTranslations('home')
    const ctx = getContext()
    const exploitantId = ctx.exploitantId

    // Week boundaries (Monday to Sunday)
    const now = new Date()
    const startOfWeek = new Date(now)
    startOfWeek.setDate(now.getDate() - ((now.getDay() + 6) % 7)) // Monday
    startOfWeek.setHours(0, 0, 0, 0)
    const endOfWeek = new Date(startOfWeek)
    endOfWeek.setDate(startOfWeek.getDate() + 6)
    endOfWeek.setHours(23, 59, 59, 999)

    // Today at midnight for upcoming flights
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const [billetsEnAttente, volsCetteSemaine, prochVols, ballons, pilotes, exploitant] =
      await Promise.all([
        // 1. Count billets en attente
        db.billet.count({
          where: { exploitantId, statut: 'EN_ATTENTE' },
        }),
        // 2. Count vols cette semaine
        db.vol.count({
          where: {
            exploitantId,
            date: { gte: startOfWeek, lte: endOfWeek },
          },
        }),
        // 3. Next 5 upcoming flights
        db.vol.findMany({
          where: {
            exploitantId,
            date: { gte: today },
            statut: { not: 'ANNULE' },
          },
          orderBy: { date: 'asc' },
          take: 5,
          include: {
            ballon: { select: { nom: true } },
            pilote: { select: { prenom: true, nom: true } },
            _count: { select: { passagers: true } },
          },
        }),
        // 4. Ballons for alert computation
        db.ballon.findMany({
          where: { actif: true },
          select: { id: true, immatriculation: true, camoExpiryDate: true, actif: true },
        }),
        // 5. Pilotes for alert computation
        db.pilote.findMany({
          where: { actif: true },
          select: { id: true, prenom: true, nom: true, dateExpirationLicence: true, actif: true },
        }),
        // 6. Exploitant meteo config
        db.exploitant.findFirstOrThrow({
          where: { id: exploitantId },
          select: { meteoLatitude: true, meteoLongitude: true, meteoSeuilVent: true },
        }),
      ])

    // Activity chart: vol counts by week (last 4 weeks)
    const fourWeeksAgo = new Date(today)
    fourWeeksAgo.setDate(today.getDate() - 28)

    const recentVols = await db.vol.findMany({
      where: {
        exploitantId,
        date: { gte: fourWeeksAgo },
        statut: { not: 'ANNULE' },
      },
      select: { date: true, statut: true },
    })

    function getWeekStart(d: Date): string {
      const date = new Date(d)
      const day = date.getDay()
      const diff = date.getDate() - day + (day === 0 ? -6 : 1)
      date.setDate(diff)
      return date.toISOString().slice(0, 10)
    }

    const weekMap = new Map<string, { done: number; planned: number }>()
    for (const vol of recentVols) {
      const week = getWeekStart(vol.date)
      const entry = weekMap.get(week) ?? { done: 0, planned: 0 }
      if (vol.statut === 'TERMINE' || vol.statut === 'ARCHIVE') {
        entry.done++
      } else {
        entry.planned++
      }
      weekMap.set(week, entry)
    }

    const weeks = [...weekMap.entries()].sort(([a], [b]) => a.localeCompare(b)).slice(-4)

    const maxVols = Math.max(1, ...weeks.map(([, w]) => w.done + w.planned))

    const alerts = sortAlerts([
      ...buildBallonAlerts(ballons, today),
      ...buildPiloteAlerts(pilotes, today),
    ])
    const alertCount = alerts.length

    // Weather widget data
    const todayStr = today.toISOString().slice(0, 10)
    const volsAujourdhui = prochVols.filter((v) => v.date.toISOString().slice(0, 10) === todayStr)

    let todayWeather: WeatherSummary | null = null

    if (volsAujourdhui.length > 0 && exploitant.meteoLatitude && exploitant.meteoLongitude) {
      try {
        const creneau: 'MATIN' | 'SOIR' = new Date().getHours() < 14 ? 'MATIN' : 'SOIR'
        const seuilVent = exploitant.meteoSeuilVent ?? 15
        const forecast = await getWeather({
          exploitantId,
          latitude: exploitant.meteoLatitude,
          longitude: exploitant.meteoLongitude,
          date: todayStr,
        })
        const hours = extractCreneauHours(forecast, creneau)
        todayWeather = summarizeWeather(hours, seuilVent)
      } catch {
        // Weather fetch failed — widget will show "non disponible"
      }
    }

    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">{t('dashboard')}</h1>

        {/* Stats row */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {t('billetsEnAttente')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary">{billetsEnAttente}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {t('volsCetteSemaine')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{volsCetteSemaine}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {t('alertes')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-destructive">{alertCount}</div>
            </CardContent>
          </Card>
        </div>

        {/* Meteo du jour */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{t('meteoAujourdhui')}</CardTitle>
          </CardHeader>
          <CardContent>
            {!exploitant.meteoLatitude ? (
              <p className="text-sm text-muted-foreground">{t('gpsNonConfigure')}</p>
            ) : volsAujourdhui.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t('aucunVolAujourdhui')}</p>
            ) : !todayWeather ? (
              <p className="text-sm text-muted-foreground">{t('meteoNonDisponible')}</p>
            ) : (
              <div
                className={cn(
                  'flex items-center justify-between rounded-lg px-4 py-3',
                  todayWeather.level === 'OK' && 'bg-success/10 text-success',
                  todayWeather.level === 'WARNING' && 'bg-warning/10 text-warning',
                  todayWeather.level === 'DANGER' && 'bg-destructive/10 text-destructive',
                )}
              >
                <div>
                  <span className="text-lg font-bold">
                    {todayWeather.level === 'OK'
                      ? 'Favorable'
                      : todayWeather.level === 'WARNING'
                        ? 'Prudence'
                        : 'Défavorable'}
                  </span>
                  <p className="text-xs opacity-70">
                    {t('volsConcernes', { count: volsAujourdhui.length })}
                  </p>
                </div>
                <div className="flex gap-6 text-sm">
                  <div className="text-center">
                    <div className="font-semibold">{Math.round(todayWeather.maxWindKt)} km/h</div>
                    <div className="text-xs opacity-70">{t('ventMax')}</div>
                  </div>
                  <div className="text-center">
                    <div className="font-semibold">{Math.round(todayWeather.avgTemperature)}°C</div>
                    <div className="text-xs opacity-70">{t('tempMoy')}</div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Prochains vols */}
        <Card>
          <CardHeader>
            <CardTitle>{t('prochainsVols')}</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">
                    {t('date')}
                  </TableHead>
                  <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">
                    {t('creneau')}
                  </TableHead>
                  <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">
                    {t('ballon')}
                  </TableHead>
                  <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">
                    {t('pilote')}
                  </TableHead>
                  <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">
                    {t('passagers')}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {prochVols.map((vol) => (
                  <TableRow key={vol.id} className="hover:bg-muted/50">
                    <TableCell>{vol.date.toLocaleDateString('fr-FR')}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{vol.creneau}</Badge>
                    </TableCell>
                    <TableCell>{vol.ballon.nom}</TableCell>
                    <TableCell>{`${vol.pilote.prenom} ${vol.pilote.nom}`}</TableCell>
                    <TableCell>{vol._count.passagers}</TableCell>
                  </TableRow>
                ))}
                {prochVols.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                      {t('aucunVol')}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Activite des 4 dernieres semaines */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{t('activite')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end justify-around gap-4 pt-4" style={{ height: 180 }}>
              {weeks.map(([weekStart, data], i) => {
                const total = data.done + data.planned
                const height = Math.round((total / maxVols) * 120)
                const doneHeight = Math.round((data.done / maxVols) * 120)
                const plannedHeight = height - doneHeight
                const label =
                  i === weeks.length - 1 ? t('cetteSemaine') : `S-${weeks.length - 1 - i}`
                return (
                  <div key={weekStart} className="flex flex-col items-center gap-2">
                    <span className="text-xs font-medium text-muted-foreground">{total}</span>
                    <div className="flex w-12 flex-col items-stretch" style={{ height: 120 }}>
                      <div className="flex-1" />
                      {plannedHeight > 0 && (
                        <div
                          className="rounded-t bg-primary/30"
                          style={{ height: plannedHeight }}
                        />
                      )}
                      {doneHeight > 0 && (
                        <div
                          className={`bg-primary ${plannedHeight > 0 ? '' : 'rounded-t'} rounded-b`}
                          style={{ height: doneHeight }}
                        />
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">{label}</span>
                  </div>
                )
              })}
              {weeks.length === 0 && (
                <p className="py-8 text-sm text-muted-foreground">Aucune activité</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  })
}
