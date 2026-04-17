import { getTranslations } from 'next-intl/server'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireAuth } from '@/lib/auth/requireAuth'
import { db } from '@/lib/db'
import { safeDecryptInt } from '@/lib/crypto'
import { calculerDevisMasse } from '@/lib/vol/devis-masse'
import { parseQteGazFromConfig } from '@/lib/vol/parse-config-gaz'
import { getWeather } from '@/lib/weather/cache'
import { extractCreneauHours } from '@/lib/weather/extract'
import { summarizeWeather } from '@/lib/weather/classify'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button, buttonVariants } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'
import { formatDateFr } from '@/lib/format'
import { VolActions } from './vol-actions'
import { MeteoAlertBanner } from '@/components/meteo-alert-banner'
import { WeatherTable } from '@/components/weather-table'
import { refreshWeather } from '@/lib/actions/weather'
import type { StatutVol } from '@prisma/client'

type Props = {
  params: Promise<{ locale: string; id: string }>
}

function statutVariant(statut: StatutVol): 'outline' | 'default' | 'secondary' | 'destructive' {
  switch (statut) {
    case 'PLANIFIE':
      return 'default'
    case 'CONFIRME':
      return 'default'
    case 'TERMINE':
      return 'secondary'
    case 'ARCHIVE':
      return 'outline'
    case 'ANNULE':
      return 'destructive'
    default:
      return 'outline'
  }
}

function statutClassName(statut: StatutVol): string {
  if (statut === 'CONFIRME') return 'bg-success text-success-foreground hover:bg-success/90'
  return ''
}

export default async function VolDetailPage({ params }: Props) {
  const { locale, id } = await params
  return requireAuth(async () => {
    const t = await getTranslations('vols')
    const tPassagers = await getTranslations('passagers')

    const vol = await db.vol.findUnique({
      where: { id },
      include: {
        ballon: true,
        pilote: true,
        equipierEntity: { select: { prenom: true, nom: true } },
        vehiculeEntity: { select: { nom: true } },
        siteDecollageEntity: { select: { nom: true } },
        passagers: { include: { billet: { select: { reference: true } } } },
        exploitant: { select: { meteoLatitude: true, meteoLongitude: true, meteoSeuilVent: true } },
      },
    })
    if (!vol) notFound()

    const tMeteo = await getTranslations('meteo')

    const pilotePoidsRaw = vol.pilote.poidsEncrypted
    const pilotePoids = pilotePoidsRaw ? safeDecryptInt(pilotePoidsRaw) : null
    const passagersPoids = vol.passagers.map((p) => ({
      poids: safeDecryptInt(p.poidsEncrypted),
    }))

    const seuilVent = vol.exploitant.meteoSeuilVent ?? 15

    let weatherHours = null
    let weatherSummary = null
    let weatherFetchedAt: Date | null = null

    if (vol.exploitant.meteoLatitude && vol.exploitant.meteoLongitude) {
      try {
        const dateStr = vol.date.toISOString().slice(0, 10)
        const forecast = await getWeather({
          exploitantId: vol.exploitantId,
          latitude: vol.exploitant.meteoLatitude,
          longitude: vol.exploitant.meteoLongitude,
          date: dateStr,
        })
        weatherHours = extractCreneauHours(forecast, vol.creneau as 'MATIN' | 'SOIR')
        weatherSummary = summarizeWeather(weatherHours, seuilVent)

        const cached = await db.weatherCache.findUnique({
          where: {
            exploitantId_date: {
              exploitantId: vol.exploitantId,
              date: new Date(dateStr + 'T00:00:00Z'),
            },
          },
          select: { fetchedAt: true },
        })
        weatherFetchedAt = cached?.fetchedAt ?? null
      } catch {
        // Weather fetch failed silently — show no data message
      }
    }

    const devisTemperature = weatherSummary?.avgTemperature ?? 20

    const devis =
      pilotePoids !== null
        ? calculerDevisMasse({
            ballon: {
              peseeAVide: vol.ballon.peseeAVide,
              performanceChart: vol.ballon.performanceChart as Record<string, number>,
              configGaz: vol.ballon.configGaz,
            },
            pilotePoids,
            passagers: passagersPoids,
            temperatureCelsius: devisTemperature,
            qteGaz: vol.qteGaz ?? parseQteGazFromConfig(vol.configGaz ?? vol.ballon.configGaz) ?? 0,
          })
        : null

    const labelClassName = 'text-xs uppercase tracking-wider text-muted-foreground'

    return (
      <div className="space-y-6 pb-20 md:pb-0">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href={`/${locale}/vols`}
              className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }))}
            >
              {t('backToList')}
            </Link>
            <h1 className="text-3xl font-bold tracking-tight">
              {formatDateFr(vol.date)} — {t(`creneau.${vol.creneau}`)}
            </h1>
            <Badge variant={statutVariant(vol.statut)} className={cn(statutClassName(vol.statut))}>
              {t(`statut.${vol.statut}`)}
            </Badge>
          </div>
          <div className="flex gap-2">
            {(vol.statut === 'PLANIFIE' || vol.statut === 'CONFIRME') && (
              <Link
                href={`/${locale}/vols/${id}/edit`}
                className={buttonVariants({ variant: 'outline' })}
              >
                {t('edit')}
              </Link>
            )}
            {vol.statut === 'PLANIFIE' && (
              <Link
                href={`/${locale}/vols/${id}/organiser`}
                className={buttonVariants({ variant: 'outline' })}
              >
                {t('organiser')}
              </Link>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-3 flex-wrap">
          <VolActions volId={id} locale={locale} statut={vol.statut} />
        </div>

        {/* Meteo alert banner */}
        {vol.meteoAlert && vol.statut !== 'ANNULE' && (
          <MeteoAlertBanner volId={vol.id} locale={locale} />
        )}

        {/* Vol info card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('detail')}</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3 text-sm">
            <div>
              <p className={labelClassName}>{t('fields.ballon')}</p>
              <p className="font-medium">
                {vol.ballon.nom} ({vol.ballon.immatriculation})
              </p>
            </div>
            <div>
              <p className={labelClassName}>{t('fields.pilote')}</p>
              <p className="font-medium">
                {vol.pilote.prenom} {vol.pilote.nom}
              </p>
            </div>
            {(vol.equipierEntity || vol.equipierAutre) && (
              <div>
                <p className={labelClassName}>{t('fields.equipier')}</p>
                <p className="font-medium">
                  {vol.equipierEntity
                    ? `${vol.equipierEntity.prenom} ${vol.equipierEntity.nom}`
                    : vol.equipierAutre}
                </p>
              </div>
            )}
            {(vol.vehiculeEntity || vol.vehiculeAutre) && (
              <div>
                <p className={labelClassName}>{t('fields.vehicule')}</p>
                <p className="font-medium">{vol.vehiculeEntity?.nom ?? vol.vehiculeAutre}</p>
              </div>
            )}
            {(vol.siteDecollageEntity || vol.lieuDecollageAutre) && (
              <div>
                <p className={labelClassName}>{t('fields.lieuDecollage')}</p>
                <p className="font-medium">
                  {vol.siteDecollageEntity?.nom ?? vol.lieuDecollageAutre}
                </p>
              </div>
            )}
            {vol.configGaz && (
              <div>
                <p className={labelClassName}>{t('fields.configGaz')}</p>
                <p className="font-medium">{vol.configGaz}</p>
              </div>
            )}
            {vol.qteGaz !== null && (
              <div>
                <p className={labelClassName}>{t('fields.qteGaz')}</p>
                <p className="font-medium">{vol.qteGaz} kg</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Passagers card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Passagers ({vol.passagers.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {vol.passagers.length === 0 ? (
              <p className="text-muted-foreground text-sm">{t('organisation.noPassagers')}</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className={labelClassName}>
                        {tPassagers('fields.prenom')}
                      </TableHead>
                      <TableHead className={labelClassName}>{tPassagers('fields.nom')}</TableHead>
                      <TableHead className={labelClassName}>{tPassagers('fields.age')}</TableHead>
                      <TableHead className={labelClassName}>{tPassagers('fields.poids')}</TableHead>
                      <TableHead className={labelClassName}>{tPassagers('fields.pmr')}</TableHead>
                      <TableHead className={labelClassName}>Billet</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {vol.passagers.map((p) => {
                      const poids = p.poidsEncrypted ? safeDecryptInt(p.poidsEncrypted) : null
                      return (
                        <TableRow key={p.id} className="hover:bg-muted/50">
                          <TableCell>{p.prenom}</TableCell>
                          <TableCell>{p.nom}</TableCell>
                          <TableCell>{p.age ?? '—'}</TableCell>
                          <TableCell>{poids !== null ? `${poids} kg` : '—'}</TableCell>
                          <TableCell>{p.pmr ? 'Oui' : 'Non'}</TableCell>
                          <TableCell className="text-muted-foreground text-xs">
                            {p.billet.reference}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Meteo card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center justify-between">
              <span>
                {tMeteo('title')} — {formatDateFr(vol.date)}
              </span>
              {vol.exploitant.meteoLatitude && (
                <form
                  action={async () => {
                    'use server'
                    await refreshWeather(id, locale)
                  }}
                >
                  <button
                    type="submit"
                    className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
                  >
                    {tMeteo('refresh')}
                  </button>
                </form>
              )}
            </CardTitle>
            {weatherFetchedAt && (
              <p className="text-xs text-muted-foreground">
                Source : Open-Meteo (best match) — maj{' '}
                {weatherFetchedAt.toLocaleString('fr-FR', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            )}
          </CardHeader>
          <CardContent>
            {!vol.exploitant.meteoLatitude || !vol.exploitant.meteoLongitude ? (
              <p className="text-muted-foreground text-sm">{tMeteo('noGps')}</p>
            ) : !weatherHours || !weatherSummary ? (
              <p className="text-muted-foreground text-sm">{tMeteo('noData')}</p>
            ) : (
              <WeatherTable hours={weatherHours} summary={weatherSummary} seuilVent={seuilVent} />
            )}
          </CardContent>
        </Card>

        {/* Devis de masse card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('devis.title')}</CardTitle>
          </CardHeader>
          <CardContent>
            {devis === null ? (
              <p className="text-muted-foreground text-sm">
                Donnees insuffisantes pour calculer le devis de masse (poids pilote ou quantite gaz
                manquants).
              </p>
            ) : (
              <div className="space-y-4">
                <p className="text-xs text-muted-foreground">
                  {t('devis.temperature')} : {devisTemperature} C
                  {weatherSummary ? '' : ' (temperature par defaut)'}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3 text-sm">
                  <div>
                    <p className={labelClassName}>{t('devis.poidsAVide')}</p>
                    <p className="font-medium">{devis.poidsAVide} kg</p>
                  </div>
                  <div>
                    <p className={labelClassName}>{t('devis.poidsGaz')}</p>
                    <p className="font-medium">{devis.poidsGaz} kg</p>
                  </div>
                  <div>
                    <p className={labelClassName}>{t('devis.poidsPilote')}</p>
                    <p className="font-medium">{devis.poidsPilote} kg</p>
                  </div>
                  <div>
                    <p className={labelClassName}>{t('devis.poidsPassagers')}</p>
                    <p className="font-medium">{devis.poidsPassagers} kg</p>
                  </div>
                  <div>
                    <p className={labelClassName}>{t('devis.chargeEmbarquee')}</p>
                    <p className="font-bold text-base">{devis.chargeEmbarquee} kg</p>
                  </div>
                  <div>
                    <p className={labelClassName}>{t('devis.chargeUtileMax')}</p>
                    <p className="font-medium">{devis.chargeUtileMax} kg</p>
                  </div>
                  <div>
                    <p className={labelClassName}>{t('devis.margeRestante')}</p>
                    <p
                      className={cn(
                        'font-semibold',
                        devis.margeRestante < 0 ? 'text-destructive' : 'text-success',
                      )}
                    >
                      {devis.margeRestante} kg
                    </p>
                  </div>
                  <div className="flex items-end">
                    <Badge variant={devis.estSurcharge ? 'destructive' : 'default'}>
                      {devis.estSurcharge ? t('devis.surcharge') : t('devis.conforme')}
                    </Badge>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Mobile: sticky post-vol CTA */}
        {vol.statut === 'CONFIRME' && (
          <div className="md:hidden fixed bottom-0 inset-x-0 z-10 border-t bg-background p-4">
            <Button asChild className="w-full" size="lg">
              <Link href={`/${locale}/vols/${vol.id}/post-vol`}>{t('postVolLink')}</Link>
            </Button>
          </div>
        )}
      </div>
    )
  })
}
