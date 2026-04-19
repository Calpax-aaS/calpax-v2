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
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { EmptyState } from '@/components/empty-state'

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
      orderBy: [{ actif: 'desc' }, { nom: 'asc' }, { prenom: 'asc' }],
    })

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
          <Link
            href={`/${locale}/pilotes/new`}
            className={cn(buttonVariants({ variant: 'default' }))}
          >
            {t('new')}
          </Link>
        </div>

        {pilotes.length === 0 ? (
          <Card>
            <CardContent className="p-0">
              <EmptyState
                message={t('noResults')}
                actionLabel={t('createFirst')}
                actionHref={`/${locale}/pilotes/new`}
              />
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">
                      {t('table.nom')}
                    </TableHead>
                    <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">
                      {t('table.licence')}
                    </TableHead>
                    <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">
                      {t('table.expiry')}
                    </TableHead>
                    <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">
                      {t('table.qualification')}
                    </TableHead>
                    <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">
                      {t('table.groupes')}
                    </TableHead>
                    <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">
                      {t('table.status')}
                    </TableHead>
                    <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">
                      {t('table.actions')}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pilotes.map((pilote) => (
                    <TableRow key={pilote.id} className="hover:bg-muted/50">
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
                        <div className="flex gap-1 flex-wrap">
                          {pilote.groupeA1 && (
                            <Badge variant="outline" className="text-xs">
                              A1
                            </Badge>
                          )}
                          {pilote.groupeA2 && (
                            <Badge variant="outline" className="text-xs">
                              A2
                            </Badge>
                          )}
                          {pilote.groupeA3 && (
                            <Badge variant="outline" className="text-xs">
                              A3
                            </Badge>
                          )}
                          {pilote.groupeA4 && (
                            <Badge variant="outline" className="text-xs">
                              A4
                            </Badge>
                          )}
                          {!pilote.groupeA1 &&
                            !pilote.groupeA2 &&
                            !pilote.groupeA3 &&
                            !pilote.groupeA4 && (
                              <span className="text-muted-foreground text-xs">—</span>
                            )}
                        </div>
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
            </CardContent>
          </Card>
        )}
      </div>
    )
  })
}
