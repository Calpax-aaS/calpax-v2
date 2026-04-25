import { getTranslations } from 'next-intl/server'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireAuth } from '@/lib/auth/requireAuth'
import { db } from '@/lib/db'
import { formatDateLong } from '@/lib/format'
import { safeDecryptInt } from '@/lib/crypto'
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
import { desaffecterPassager, confirmerVol } from '@/lib/actions/organisation'
import { BilletAssignCard } from '@/components/billet-assign-card'

type Props = {
  params: Promise<{ locale: string; id: string }>
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
        equipierEntity: { select: { prenom: true, nom: true } },
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
          <h1 className="text-3xl font-bold tracking-tight">
            {isMultiBallon ? 'Organisation de la session' : t('organisation.title')}
          </h1>
          <Badge variant="outline">{t(`statut.${vol.statut}`)}</Badge>
        </div>

        {/* Session info */}
        <p className="text-sm text-muted-foreground">
          {formatDateLong(vol.date, locale)} — {t(`creneau.${vol.creneau}`)}
          {isMultiBallon && ` — ${sessionVols.length} ballons`}
        </p>

        {/* Layout: billets left, ballons right */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_2fr] gap-6">
          {/* LEFT COLUMN — Billets disponibles */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t('organisation.billetsDisponibles')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {availableBillets.length === 0 ? (
                <p className="text-muted-foreground text-sm">{t('organisation.noBillets')}</p>
              ) : (
                availableBillets.map((billet) => (
                  <BilletAssignCard
                    key={billet.id}
                    billet={{
                      id: billet.id,
                      reference: billet.reference,
                      payeurPrenom: billet.payeurPrenom,
                      payeurNom: billet.payeurNom,
                    }}
                    passagers={billet.passagers.map((p) => ({
                      id: p.id,
                      prenom: p.prenom,
                      nom: p.nom,
                      poids: safeDecryptInt(p.poidsEncrypted, 75),
                    }))}
                    sessionVols={sessionVols.map((sv) => ({
                      id: sv.id,
                      immatriculation: sv.ballon.immatriculation,
                    }))}
                    currentVolId={id}
                    locale={locale}
                    isMultiBallon={isMultiBallon}
                  />
                ))
              )}
            </CardContent>
          </Card>

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
                        {sv.equipierEntity
                          ? ` + ${sv.equipierEntity.prenom} ${sv.equipierEntity.nom}`
                          : sv.equipierAutre
                            ? ` + ${sv.equipierAutre}`
                            : ''}
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
                        <TableRow className="hover:bg-transparent">
                          <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">
                            {tPassagers('fields.prenom')}
                          </TableHead>
                          <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">
                            {tPassagers('fields.nom')}
                          </TableHead>
                          <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">
                            {tPassagers('fields.poids')}
                          </TableHead>
                          <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">
                            Billet
                          </TableHead>
                          <TableHead />
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sv.passagers.map((passager) => {
                          const poids = safeDecryptInt(passager.poidsEncrypted, 75)
                          return (
                            <TableRow key={passager.id} className="hover:bg-muted/50">
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
