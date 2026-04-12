import { getTranslations } from 'next-intl/server'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireAuth } from '@/lib/auth/requireAuth'
import { db } from '@/lib/db'
import { decrypt } from '@/lib/crypto'
import { calculerDevisMasse } from '@/lib/vol/devis-masse'
import { parseQteGazFromConfig } from '@/lib/vol/parse-config-gaz'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { buttonVariants } from '@/components/ui/button'
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
import { VolActions } from './vol-actions'
import type { StatutVol } from '@prisma/client'

type Props = {
  params: Promise<{ locale: string; id: string }>
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function safeDecrypt(encrypted: string | null | undefined): number | null {
  if (!encrypted) return null
  try {
    return parseInt(decrypt(encrypted))
  } catch {
    return null
  }
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
  if (statut === 'CONFIRME') return 'bg-green-600 text-white hover:bg-green-700'
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
        passagers: { include: { billet: { select: { reference: true } } } },
      },
    })
    if (!vol) notFound()

    const pilotePoids = safeDecrypt(vol.pilote.poidsEncrypted)
    const passagersPoids = vol.passagers.map((p) => ({
      poids: safeDecrypt(p.poidsEncrypted) ?? 0,
    }))

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
            temperatureCelsius: 20,
            qteGaz: vol.qteGaz ?? parseQteGazFromConfig(vol.configGaz ?? vol.ballon.configGaz) ?? 0,
          })
        : null

    return (
      <main className="container mx-auto max-w-3xl px-4 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4 flex-wrap">
          <Link
            href={`/${locale}/vols`}
            className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }))}
          >
            {t('backToList')}
          </Link>
          <h1 className="text-2xl font-bold">
            {formatDate(vol.date)} — {t(`creneau.${vol.creneau}`)}
          </h1>
          <Badge variant={statutVariant(vol.statut)} className={cn(statutClassName(vol.statut))}>
            {t(`statut.${vol.statut}`)}
          </Badge>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-3 flex-wrap">
          {vol.statut === 'PLANIFIE' && (
            <Link
              href={`/${locale}/vols/${id}/organiser`}
              className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
            >
              {t('organiser')}
            </Link>
          )}
          <VolActions volId={id} locale={locale} statut={vol.statut} />
        </div>

        {/* Vol info card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('detail')}</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
            <div>
              <p className="text-muted-foreground">{t('fields.ballon')}</p>
              <p className="font-medium">
                {vol.ballon.nom} ({vol.ballon.immatriculation})
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">{t('fields.pilote')}</p>
              <p className="font-medium">
                {vol.pilote.prenom} {vol.pilote.nom}
              </p>
            </div>
            {vol.equipier && (
              <div>
                <p className="text-muted-foreground">{t('fields.equipier')}</p>
                <p className="font-medium">{vol.equipier}</p>
              </div>
            )}
            {vol.vehicule && (
              <div>
                <p className="text-muted-foreground">{t('fields.vehicule')}</p>
                <p className="font-medium">{vol.vehicule}</p>
              </div>
            )}
            {vol.lieuDecollage && (
              <div>
                <p className="text-muted-foreground">{t('fields.lieuDecollage')}</p>
                <p className="font-medium">{vol.lieuDecollage}</p>
              </div>
            )}
            {vol.configGaz && (
              <div>
                <p className="text-muted-foreground">{t('fields.configGaz')}</p>
                <p className="font-medium">{vol.configGaz}</p>
              </div>
            )}
            {vol.qteGaz !== null && (
              <div>
                <p className="text-muted-foreground">{t('fields.qteGaz')}</p>
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
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{tPassagers('fields.prenom')}</TableHead>
                    <TableHead>{tPassagers('fields.nom')}</TableHead>
                    <TableHead>{tPassagers('fields.age')}</TableHead>
                    <TableHead>{tPassagers('fields.poids')}</TableHead>
                    <TableHead>{tPassagers('fields.pmr')}</TableHead>
                    <TableHead>Billet</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vol.passagers.map((p) => {
                    const poids = safeDecrypt(p.poidsEncrypted)
                    return (
                      <TableRow key={p.id}>
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
                  {t('devis.temperature')} : 20 C (temperature par defaut)
                </p>
                <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
                  <div>
                    <p className="text-muted-foreground">{t('devis.poidsAVide')}</p>
                    <p className="font-medium">{devis.poidsAVide} kg</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">{t('devis.poidsGaz')}</p>
                    <p className="font-medium">{devis.poidsGaz} kg</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">{t('devis.poidsPilote')}</p>
                    <p className="font-medium">{devis.poidsPilote} kg</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">{t('devis.poidsPassagers')}</p>
                    <p className="font-medium">{devis.poidsPassagers} kg</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">{t('devis.poidsTotal')}</p>
                    <p className="font-bold text-base">{devis.poidsTotal} kg</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">{t('devis.chargeUtileMax')}</p>
                    <p className="font-medium">{devis.chargeUtileMax} kg</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">{t('devis.margeRestante')}</p>
                    <p
                      className={cn(
                        'font-semibold',
                        devis.margeRestante < 0 ? 'text-destructive' : 'text-green-600',
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
      </main>
    )
  })
}
