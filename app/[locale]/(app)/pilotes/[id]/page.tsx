import { getTranslations } from 'next-intl/server'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireAuth } from '@/lib/auth/requireAuth'
import { db } from '@/lib/db'
import { decrypt } from '@/lib/crypto'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { buttonVariants } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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

    let poids: number | null = null
    if (pilote.poidsEncrypted) {
      try {
        poids = Number(decrypt(pilote.poidsEncrypted))
      } catch {
        // Encrypted with a different key (e.g., seed ran with local key, prod has different key)
        poids = null
      }
    }

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href={`/${locale}/pilotes`}
              className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }))}
            >
              {t('backToList')}
            </Link>
            <h1 className="text-3xl font-bold tracking-tight">
              {pilote.prenom} {pilote.nom}
            </h1>
            <Badge variant={pilote.actif ? 'default' : 'secondary'}>
              {pilote.actif ? t('status.actif') : t('status.inactif')}
            </Badge>
          </div>
          <div className="flex gap-2">
            <Link
              href={`/${locale}/pilotes/${id}/edit`}
              className={buttonVariants({ variant: 'outline' })}
            >
              {t('edit')}
            </Link>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Identité</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-x-8 gap-y-3 text-sm sm:grid-cols-2">
            {pilote.email && (
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">
                  {t('fields.email')}
                </p>
                <p className="font-medium">{pilote.email}</p>
              </div>
            )}
            {pilote.telephone && (
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">
                  {t('fields.telephone')}
                </p>
                <p className="font-medium">{pilote.telephone}</p>
              </div>
            )}
            {poids != null && (
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">
                  {t('fields.poids')} <span className="text-xs">({t('fields.poidsNote')})</span>
                </p>
                <p className="font-medium">{poids} kg</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Licence BFCL</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-x-8 gap-y-3 text-sm sm:grid-cols-2">
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">
                {t('fields.licenceBfcl')}
              </p>
              <p className="font-medium">{pilote.licenceBfcl}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">
                {t('fields.dateExpirationLicence')}
              </p>
              <ExpiryBadge date={pilote.dateExpirationLicence} type="BFCL" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">
                {t('fields.qualificationCommerciale')}
              </p>
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

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('sections.classesBfcl')}</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-x-8 gap-y-3 text-sm sm:grid-cols-2">
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">
                {t('fields.classesBfcl')}
              </p>
              <div className="flex gap-1 flex-wrap mt-1">
                {(['A', 'B', 'C', 'D'] as const)
                  .filter((cls) => pilote[`classe${cls}` as 'classeA'])
                  .map((cls) => (
                    <Badge key={cls} variant="outline">
                      {t(`classes.${cls}`)}
                    </Badge>
                  ))}
              </div>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">
                {t('fields.groupesA')}
              </p>
              <div className="flex gap-1 flex-wrap mt-1">
                {([1, 2, 3, 4] as const)
                  .filter((g) => pilote[`groupeA${g}` as 'groupeA1'])
                  .map((g) => (
                    <Badge key={g} variant="outline">
                      {t(`groupes.A${g}`)}
                    </Badge>
                  ))}
              </div>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">
                {t('fields.qualificationNuit')}
              </p>
              <div className="mt-1">
                {pilote.qualificationNuit ? (
                  <Badge variant="default">Oui</Badge>
                ) : (
                  <Badge variant="secondary">Non</Badge>
                )}
              </div>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">
                {t('fields.qualificationInstructeur')}
              </p>
              <div className="mt-1">
                {pilote.qualificationInstructeur ? (
                  <Badge variant="default">Oui</Badge>
                ) : (
                  <Badge variant="secondary">Non</Badge>
                )}
              </div>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">
                {t('fields.qualificationCaptif')}
              </p>
              <div className="mt-1">
                {pilote.qualificationCaptif ? (
                  <Badge variant="default">Oui</Badge>
                ) : (
                  <Badge variant="secondary">Non</Badge>
                )}
              </div>
            </div>
            {pilote.heuresDeVol != null && (
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">
                  {t('fields.heuresDeVol')}
                </p>
                <p className="font-medium">{pilote.heuresDeVol} h</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    )
  })
}
