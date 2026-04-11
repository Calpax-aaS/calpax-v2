import { getTranslations } from 'next-intl/server'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireAuth } from '@/lib/auth/requireAuth'
import { db } from '@/lib/db'
import { decrypt } from '@/lib/crypto'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { buttonVariants } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ExpiryBadge } from '@/components/expiry-badge'
import { cn } from '@/lib/utils'

type Props = {
  params: Promise<{ locale: string; id: string }>
}

export default async function PiloteDetailPage({ params }: Props) {
  const { locale, id } = await params
  return requireAuth(async () => {
    const t = await getTranslations('pilotes')

    const pilote = await db.pilote.findUnique({ where: { id } })
    if (!pilote) notFound()

    const poids = pilote.poidsEncrypted ? Number(decrypt(pilote.poidsEncrypted)) : null

    return (
      <main className="container mx-auto max-w-2xl px-4 py-8 space-y-6">
        <div className="flex items-center gap-4">
          <Link
            href={`/${locale}/pilotes`}
            className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }))}
          >
            {t('backToList')}
          </Link>
          <h1 className="text-2xl font-bold">
            {pilote.prenom} {pilote.nom}
          </h1>
          <Badge variant={pilote.actif ? 'default' : 'secondary'}>
            {pilote.actif ? t('status.actif') : t('status.inactif')}
          </Badge>
        </div>

        <div className="flex justify-end">
          <Link
            href={`/${locale}/pilotes/${id}/edit`}
            className={cn(buttonVariants({ size: 'sm', variant: 'outline' }))}
          >
            {t('edit')}
          </Link>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Identité</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
            {pilote.email && (
              <div>
                <p className="text-muted-foreground">{t('fields.email')}</p>
                <p className="font-medium">{pilote.email}</p>
              </div>
            )}
            {pilote.telephone && (
              <div>
                <p className="text-muted-foreground">{t('fields.telephone')}</p>
                <p className="font-medium">{pilote.telephone}</p>
              </div>
            )}
            {poids != null && (
              <div>
                <p className="text-muted-foreground">
                  {t('fields.poids')} <span className="text-xs">({t('fields.poidsNote')})</span>
                </p>
                <p className="font-medium">{poids} kg</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Separator />

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Licence BFCL</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
            <div>
              <p className="text-muted-foreground">{t('fields.licenceBfcl')}</p>
              <p className="font-medium">{pilote.licenceBfcl}</p>
            </div>
            <div>
              <p className="text-muted-foreground">{t('fields.dateExpirationLicence')}</p>
              <ExpiryBadge date={pilote.dateExpirationLicence} type="BFCL" />
            </div>
            <div>
              <p className="text-muted-foreground">{t('fields.qualificationCommerciale')}</p>
              <div className="mt-1">
                {pilote.qualificationCommerciale ? (
                  <Badge variant="default">Oui</Badge>
                ) : (
                  <Badge variant="secondary">Non</Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Separator />

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Qualifications</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
            <div>
              <p className="text-muted-foreground">{t('fields.classesBallon')}</p>
              <div className="flex gap-1 flex-wrap mt-1">
                {pilote.classesBallon.map((cls) => (
                  <Badge key={cls} variant="outline">
                    {t(`classes.${cls}` as `classes.A`)}
                  </Badge>
                ))}
              </div>
            </div>
            {pilote.heuresDeVol != null && (
              <div>
                <p className="text-muted-foreground">{t('fields.heuresDeVol')}</p>
                <p className="font-medium">{pilote.heuresDeVol} h</p>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    )
  })
}
