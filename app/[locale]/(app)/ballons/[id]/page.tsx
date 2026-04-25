import { getTranslations } from 'next-intl/server'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireAuth } from '@/lib/auth/requireAuth'
import { db } from '@/lib/db'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { buttonVariants } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ExpiryBadge } from '@/components/expiry-badge'
import { PerformanceChartDisplay } from '@/components/performance-chart-display'
import { getBallonGroupe } from '@/lib/regulatory/validation'
import { toggleBallonActif } from '@/lib/actions/ballon'
import { ToggleActifButton } from '@/components/toggle-actif-button'
import { cn } from '@/lib/utils'

type Props = {
  params: Promise<{ locale: string; id: string }>
}

export default async function BallonDetailPage({ params }: Props) {
  const { locale, id } = await params
  return requireAuth(async () => {
    const t = await getTranslations('ballons')
    const tJournal = await getTranslations('journal')

    const ballon = await db.ballon.findUnique({ where: { id } })
    if (!ballon) notFound()

    const chart = (ballon.performanceChart ?? {}) as Record<string, number>
    const groupe = getBallonGroupe(ballon.volumeM3)

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href={`/${locale}/ballons`}
              className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }))}
            >
              {t('backToList')}
            </Link>
            <h1 className="text-3xl font-bold tracking-tight">{ballon.nom}</h1>
            <Badge variant={ballon.actif ? 'default' : 'secondary'}>
              {ballon.actif ? t('status.actif') : t('status.inactif')}
            </Badge>
          </div>
          <div className="flex gap-2">
            <ToggleActifButton
              actif={ballon.actif}
              onToggle={async (actif: boolean) => {
                'use server'
                return toggleBallonActif(id, actif)
              }}
            />
            <Link
              href={`/${locale}/ballons/${id}/edit`}
              className={buttonVariants({ variant: 'outline' })}
            >
              {t('edit')}
            </Link>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Informations générales</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-x-8 gap-y-3 text-sm sm:grid-cols-2">
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">
                {t('fields.immatriculation')}
              </p>
              <p className="font-medium">{ballon.immatriculation}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">
                {t('fields.volumeM3')}
              </p>
              <p className="font-medium">
                {ballon.volumeM3} m³ — Groupe A{groupe}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">
                {t('fields.nbPassagerMax')}
              </p>
              <p className="font-medium">{ballon.nbPassagerMax}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">
                {t('fields.peseeAVide')}
              </p>
              <p className="font-medium">{ballon.peseeAVide} kg</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">
                {t('fields.configGaz')}
              </p>
              <p className="font-medium">{ballon.configGaz}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">
                {t('fields.manexAnnexRef')}
              </p>
              <p className="font-medium">{ballon.manexAnnexRef}</p>
            </div>
            {ballon.mtom && (
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">
                  {t('fields.mtom')}
                </p>
                <p className="font-medium">{ballon.mtom} kg</p>
              </div>
            )}
            {ballon.mlm && (
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">
                  {t('fields.mlm')}
                </p>
                <p className="font-medium">{ballon.mlm} kg</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">CAMO &amp; Navigabilité</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-x-8 gap-y-3 text-sm sm:grid-cols-2">
            {ballon.camoOrganisme && (
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">
                  {t('fields.camoOrganisme')}
                </p>
                <p className="font-medium">{ballon.camoOrganisme}</p>
              </div>
            )}
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">
                {t('fields.camoExpiryDate')}
              </p>
              {ballon.camoExpiryDate ? (
                <ExpiryBadge date={ballon.camoExpiryDate} type="CAMO" />
              ) : (
                <p className="text-muted-foreground">—</p>
              )}
            </div>
            {ballon.certificatNavigabilite && (
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">
                  {t('fields.certificatNavigabilite')}
                </p>
                <p className="font-medium">{ballon.certificatNavigabilite}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('fields.performanceChart')}</CardTitle>
          </CardHeader>
          <CardContent>
            <PerformanceChartDisplay chart={chart} />
          </CardContent>
        </Card>

        <div className="flex justify-start">
          <Link
            href={`/${locale}/ballons/${id}/journal`}
            className={buttonVariants({ variant: 'outline' })}
          >
            {tJournal('viewJournal')}
          </Link>
        </div>
      </div>
    )
  })
}
