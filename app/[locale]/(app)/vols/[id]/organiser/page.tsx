import { getTranslations } from 'next-intl/server'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireAuth } from '@/lib/auth/requireAuth'
import { db } from '@/lib/db'
import { decrypt } from '@/lib/crypto'
import { calculerDevisMasse } from '@/lib/vol/devis-masse'
import { DevisMasseLive } from '@/components/devis-masse-live'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'
import { affecterBillet, desaffecterPassager, confirmerVol } from '@/lib/actions/organisation'

type Props = {
  params: Promise<{ locale: string; id: string }>
}

function safeDecryptInt(encrypted: string | null | undefined, fallback: number): number {
  if (!encrypted) return fallback
  try {
    const parsed = parseInt(decrypt(encrypted))
    return isNaN(parsed) ? fallback : parsed
  } catch {
    return fallback
  }
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

export default async function OrganiserVolPage({ params }: Props) {
  const { locale, id } = await params

  return requireAuth(async () => {
    const t = await getTranslations('vols')
    const tPassagers = await getTranslations('passagers')

    const vol = await db.vol.findUnique({
      where: { id },
      include: {
        ballon: true,
        pilote: true,
        passagers: {
          include: {
            billet: { select: { id: true, reference: true } },
          },
        },
      },
    })

    if (!vol) notFound()

    const availableBillets = await db.billet.findMany({
      where: {
        statut: 'EN_ATTENTE',
        AND: [
          { OR: [{ dateVolDeb: null }, { dateVolDeb: { lte: vol.date } }] },
          { OR: [{ dateVolFin: null }, { dateVolFin: { gte: vol.date } }] },
        ],
      },
      include: {
        passagers: { where: { volId: null } },
      },
      orderBy: { createdAt: 'desc' },
    })

    // Compute devis de masse
    const pilotePoids = safeDecryptInt(vol.pilote.poidsEncrypted, 80)
    const passagersPoids = vol.passagers.map((p) => ({
      poids: safeDecryptInt(p.poidsEncrypted, 75),
    }))

    const devis = calculerDevisMasse({
      ballon: {
        peseeAVide: vol.ballon.peseeAVide,
        performanceChart: vol.ballon.performanceChart as Record<string, number>,
        configGaz: vol.ballon.configGaz,
      },
      pilotePoids,
      passagers: passagersPoids,
      temperatureCelsius: 20,
      qteGaz: vol.qteGaz ?? 0,
    })

    const capacite = vol.passagers.length

    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4 flex-wrap">
          <Link
            href={`/${locale}/vols`}
            className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }))}
          >
            {t('backToList')}
          </Link>
          <h1 className="text-2xl font-bold">{t('organisation.title')}</h1>
          <Badge variant="outline">{t(`statut.${vol.statut}`)}</Badge>
        </div>

        {/* Two-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* LEFT COLUMN — Billets disponibles */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">{t('organisation.billetsDisponibles')}</h2>

            {availableBillets.length === 0 ? (
              <p className="text-muted-foreground text-sm">{t('organisation.noBillets')}</p>
            ) : (
              availableBillets.map((billet) => {
                const unassignedPassagers = billet.passagers
                const totalWeightEstimate = unassignedPassagers.reduce(
                  (sum, p) => sum + safeDecryptInt(p.poidsEncrypted, 75),
                  0,
                )

                return (
                  <Card key={billet.id}>
                    <CardContent className="pt-4 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-semibold">{billet.reference}</p>
                          <p className="text-sm text-muted-foreground">
                            {billet.payeurPrenom} {billet.payeurNom}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {unassignedPassagers.length}{' '}
                            {unassignedPassagers.length === 1 ? 'passager' : 'passagers'} — ~
                            {totalWeightEstimate} kg
                          </p>
                        </div>
                        <form
                          action={async () => {
                            'use server'
                            await affecterBillet(vol.id, billet.id, locale)
                          }}
                        >
                          <button type="submit" className={cn(buttonVariants({ size: 'sm' }))}>
                            {t('organisation.affecter')}
                          </button>
                        </form>
                      </div>
                    </CardContent>
                  </Card>
                )
              })
            )}
          </div>

          {/* RIGHT COLUMN — Vol en cours */}
          <div className="space-y-4">
            {/* Vol info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t('detail')}</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                <div>
                  <p className="text-muted-foreground">{t('fields.date')}</p>
                  <p className="font-medium">{formatDate(vol.date)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">{t('fields.creneau')}</p>
                  <p className="font-medium">{t(`creneau.${vol.creneau}`)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">{t('fields.ballon')}</p>
                  <p className="font-medium">
                    {vol.ballon.nom} — {vol.ballon.immatriculation}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">{t('fields.pilote')}</p>
                  <p className="font-medium">
                    {vol.pilote.prenom} {vol.pilote.nom}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Passagers affectés */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center justify-between">
                  <span>{t('organisation.passagersAffectes')}</span>
                  <Badge variant={capacite >= vol.ballon.nbPassagerMax ? 'destructive' : 'outline'}>
                    {t('organisation.capacite')}: {capacite} / {vol.ballon.nbPassagerMax}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {vol.passagers.length === 0 ? (
                  <p className="text-muted-foreground text-sm">{t('organisation.noPassagers')}</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{tPassagers('fields.prenom')}</TableHead>
                        <TableHead>{tPassagers('fields.nom')}</TableHead>
                        <TableHead>{tPassagers('fields.poids')}</TableHead>
                        <TableHead>Billet</TableHead>
                        <TableHead />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {vol.passagers.map((passager) => {
                        const poids = safeDecryptInt(passager.poidsEncrypted, 75)
                        return (
                          <TableRow key={passager.id}>
                            <TableCell>{passager.prenom}</TableCell>
                            <TableCell>{passager.nom}</TableCell>
                            <TableCell className="tabular-nums">{poids} kg</TableCell>
                            <TableCell className="text-muted-foreground text-xs">
                              {passager.billet?.reference ?? '—'}
                            </TableCell>
                            <TableCell>
                              <form
                                action={async () => {
                                  'use server'
                                  await desaffecterPassager(passager.id, vol.id, locale)
                                }}
                              >
                                <button
                                  type="submit"
                                  className={cn(
                                    buttonVariants({ variant: 'ghost', size: 'sm' }),
                                    'text-destructive hover:text-destructive',
                                  )}
                                >
                                  {t('organisation.desaffecter')}
                                </button>
                              </form>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            {/* Devis de masse */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t('devis.title')}</CardTitle>
              </CardHeader>
              <CardContent>
                <DevisMasseLive result={devis} />
              </CardContent>
            </Card>

            {/* Confirmer le vol */}
            {vol.statut === 'PLANIFIE' && (
              <form
                action={async () => {
                  'use server'
                  await confirmerVol(vol.id, locale)
                }}
              >
                <button type="submit" className={cn(buttonVariants({ size: 'lg' }), 'w-full')}>
                  {t('confirmer')}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    )
  })
}
