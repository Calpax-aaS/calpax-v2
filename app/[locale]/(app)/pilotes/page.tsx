import { getTranslations } from 'next-intl/server'
import Link from 'next/link'
import { requireAuth } from '@/lib/auth/requireAuth'
import { getContext } from '@/lib/context'
import { db } from '@/lib/db'
import { buttonVariants } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { ExpiryBadge } from '@/components/expiry-badge'
import { cn } from '@/lib/utils'

type Props = {
  params: Promise<{ locale: string }>
}

export default async function PilotesPage({ params }: Props) {
  const { locale } = await params
  return requireAuth(async () => {
    const t = await getTranslations('pilotes')
    const ctx = getContext()

    const pilotes = await db.pilote.findMany({
      where: { exploitantId: ctx.exploitantId },
      orderBy: [{ nom: 'asc' }, { prenom: 'asc' }],
    })

    return (
      <main className="container mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">{t('title')}</h1>
          <Link href={`/${locale}/pilotes/new`} className={cn(buttonVariants({ size: 'sm' }))}>
            {t('new')}
          </Link>
        </div>

        {pilotes.length === 0 ? (
          <p className="text-muted-foreground">{t('noResults')}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('table.nom')}</TableHead>
                <TableHead>{t('table.licence')}</TableHead>
                <TableHead>{t('table.expiry')}</TableHead>
                <TableHead>{t('table.qualification')}</TableHead>
                <TableHead>{t('table.status')}</TableHead>
                <TableHead>{t('table.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pilotes.map((pilote) => (
                <TableRow key={pilote.id}>
                  <TableCell className="font-medium">
                    {pilote.prenom} {pilote.nom}
                  </TableCell>
                  <TableCell>{pilote.licenceBfcl}</TableCell>
                  <TableCell>
                    <ExpiryBadge date={pilote.dateExpirationLicence} type="BFCL" />
                  </TableCell>
                  <TableCell>
                    {pilote.qualificationCommerciale ? (
                      <Badge variant="default">Oui</Badge>
                    ) : (
                      <Badge variant="secondary">Non</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={pilote.actif ? 'default' : 'secondary'}>
                      {pilote.actif ? t('status.actif') : t('status.inactif')}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/${locale}/pilotes/${pilote.id}`}
                        className={cn(buttonVariants({ size: 'sm', variant: 'outline' }))}
                      >
                        {t('detail')}
                      </Link>
                      <Link
                        href={`/${locale}/pilotes/${pilote.id}/edit`}
                        className={cn(buttonVariants({ size: 'sm', variant: 'ghost' }))}
                      >
                        {t('edit')}
                      </Link>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </main>
    )
  })
}
