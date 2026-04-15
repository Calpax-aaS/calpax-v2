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

export default async function BallonsPage({ params }: Props) {
  const { locale } = await params
  return requireAuth(async () => {
    const t = await getTranslations('ballons')
    const ctx = getContext()

    const ballons = await db.ballon.findMany({
      where: { exploitantId: ctx.exploitantId },
      orderBy: { nom: 'asc' },
    })

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
          <Link
            href={`/${locale}/ballons/new`}
            className={cn(buttonVariants({ variant: 'default' }))}
          >
            {t('new')}
          </Link>
        </div>

        {ballons.length === 0 ? (
          <Card>
            <CardContent className="p-0">
              <EmptyState
                message={t('noResults')}
                actionLabel={t('createFirst')}
                actionHref={`/${locale}/ballons/new`}
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
                      {t('table.immat')}
                    </TableHead>
                    <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">
                      {t('table.volume')}
                    </TableHead>
                    <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">
                      {t('table.pax')}
                    </TableHead>
                    <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">
                      {t('table.camo')}
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
                  {ballons.map((ballon) => (
                    <TableRow key={ballon.id} className="hover:bg-muted/50">
                      <TableCell className="font-medium">{ballon.nom}</TableCell>
                      <TableCell>{ballon.immatriculation}</TableCell>
                      <TableCell>{ballon.volumeM3} m³</TableCell>
                      <TableCell>{ballon.nbPassagerMax}</TableCell>
                      <TableCell>
                        {ballon.camoExpiryDate ? (
                          <ExpiryBadge date={ballon.camoExpiryDate} type="CAMO" />
                        ) : (
                          <span className="text-muted-foreground text-sm">--</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={ballon.actif ? 'default' : 'secondary'}>
                          {ballon.actif ? t('status.actif') : t('status.inactif')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/${locale}/ballons/${ballon.id}`}
                            className={cn(buttonVariants({ size: 'sm', variant: 'outline' }))}
                          >
                            {t('detail')}
                          </Link>
                          <Link
                            href={`/${locale}/ballons/${ballon.id}/edit`}
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
