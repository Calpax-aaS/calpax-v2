import { getTranslations } from 'next-intl/server'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireAuth } from '@/lib/auth/requireAuth'
import { db } from '@/lib/db'
import { decrypt } from '@/lib/crypto'
import { calculerDevisMasse } from '@/lib/vol/devis-masse'
import { parseQteGazFromConfig } from '@/lib/vol/parse-config-gaz'
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

    // Fetch all sibling vols (same date + creneau) for session view
    const sessionVols = await db.vol.findMany({
      where: {
        date: vol.date,
        creneau: vol.creneau,
        statut: { not: 'ANNULE' },
      },
      include: {
        ballon: true,
        pilote: true,
        passagers: {
          include: {
            billet: { select: { id: true, reference: true } },
          },
        },
      },
      orderBy: { ballon: { nom: 'asc' } },
    })

    // Billets without a date window (AU_PLUS_VITE, AUTRE, A_DEFINIR) always match.
    // Billets with a date window must include the vol date.
    const noWindowTypes = ['AU_PLUS_VITE', 'AUTRE', 'A_DEFINIR'] as const
    const availableBillets = await db.billet.findMany({
      where: {
        statut: 'EN_ATTENTE',
        OR: [
          { typePlannif: { in: [...noWindowTypes] } },
          {
            AND: [
              { OR: [{ dateVolDeb: null }, { dateVolDeb: { lte: vol.date } }] },
              { OR: [{ dateVolFin: null }, { dateVolFin: { gte: vol.date } }] },
            ],
          },
        ],
      },
      include: {
        passagers: { where: { volId: null } },
      },
      orderBy: { createdAt: 'desc' },
    })

    const isMultiBallon = sessionVols.length > 1

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
          <h1 className="text-2xl font-bold">
            {isMultiBallon ? 'Organisation de la session' : t('organisation.title')}
          </h1>
          <Badge variant="outline">{t(`statut.${vol.statut}`)}</Badge>
        </div>

        {/* Session info */}
        <p className="text-sm text-muted-foreground">
          {formatDate(vol.date)} — {t(`creneau.${vol.creneau}`)}
          {isMultiBallon && ` — ${sessionVols.length} ballons`}
        </p>

        {/* Layout: billets left, ballons right */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_2fr] gap-6">
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
                      {/* One button per vol in the session */}
                      <div className="flex flex-wrap gap-2">
                        {sessionVols.map((sv) => (
                          <form
                            key={sv.id}
                            action={async () => {
                              'use server'
                              await affecterBillet(sv.id, billet.id, locale)
                            }}
                          >
                            <button
                              type="submit"
                              className={cn(
                                buttonVariants({
                                  size: 'sm',
                                  variant: sv.id === id ? 'default' : 'outline',
                                }),
                              )}
                            >
                              {isMultiBallon
                                ? `${sv.ballon.immatriculation}`
                                : t('organisation.affecter')}
                            </button>
                          </form>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )
              })
            )}
          </div>

          {/* RIGHT COLUMN — Ballons de la session */}
          <div className="space-y-6">
            {sessionVols.map((sv) => {
              const pilotePoids = safeDecryptInt(sv.pilote.poidsEncrypted, 80)
              const passagersPoids = sv.passagers.map((p) => ({
                poids: safeDecryptInt(p.poidsEncrypted, 75),
              }))

              const devis = calculerDevisMasse({
                ballon: {
                  peseeAVide: sv.ballon.peseeAVide,
                  performanceChart: sv.ballon.performanceChart as Record<string, number>,
                  configGaz: sv.ballon.configGaz,
                },
                pilotePoids,
                passagers: passagersPoids,
                temperatureCelsius: 20,
                qteGaz:
                  sv.qteGaz ?? parseQteGazFromConfig(sv.configGaz ?? sv.ballon.configGaz) ?? 0,
              })

              const isCurrent = sv.id === id

              return (
                <div
                  key={sv.id}
                  className={cn(
                    'space-y-4 rounded-lg p-4',
                    isCurrent ? 'bg-muted/50 ring-1 ring-border' : '',
                  )}
                >
                  {/* Ballon header */}
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-lg">
                        {sv.ballon.nom} — {sv.ballon.immatriculation}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {sv.pilote.prenom} {sv.pilote.nom}
                        {sv.equipier ? ` + ${sv.equipier}` : ''}
                      </p>
                    </div>
                    <Badge
                      variant={
                        sv.passagers.length >= sv.ballon.nbPassagerMax ? 'destructive' : 'outline'
                      }
                    >
                      {sv.passagers.length} / {sv.ballon.nbPassagerMax}
                    </Badge>
                  </div>

                  {/* Passagers */}
                  {sv.passagers.length === 0 ? (
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
                        {sv.passagers.map((passager) => {
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
                                    await desaffecterPassager(passager.id, sv.id, locale)
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

                  {/* Devis compact */}
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-muted-foreground">Charge:</span>
                    <span className="font-medium tabular-nums">{devis.chargeEmbarquee} kg</span>
                    <span className="text-muted-foreground">/</span>
                    <span className="tabular-nums">{devis.chargeUtileMax} kg max</span>
                    <span
                      className={cn(
                        'font-semibold',
                        devis.estSurcharge ? 'text-destructive' : 'text-green-600',
                      )}
                    >
                      {devis.estSurcharge ? 'SURCHARGE' : `+${devis.margeRestante} kg`}
                    </span>
                  </div>

                  {/* Confirmer */}
                  {sv.statut === 'PLANIFIE' && (
                    <form
                      action={async () => {
                        'use server'
                        await confirmerVol(sv.id, locale)
                      }}
                    >
                      <button
                        type="submit"
                        className={cn(buttonVariants({ size: 'sm' }), 'w-full')}
                      >
                        {t('confirmer')}
                      </button>
                    </form>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    )
  })
}
