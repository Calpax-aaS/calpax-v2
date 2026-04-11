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
      <main className="container mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">{t('title')}</h1>
          <Link href={`/${locale}/ballons/new`} className={cn(buttonVariants({ size: 'sm' }))}>
            {t('new')}
          </Link>
        </div>

        {ballons.length === 0 ? (
          <p className="text-muted-foreground">{t('noResults')}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('table.nom')}</TableHead>
                <TableHead>{t('table.immat')}</TableHead>
                <TableHead>{t('table.volume')}</TableHead>
                <TableHead>{t('table.pax')}</TableHead>
                <TableHead>{t('table.camo')}</TableHead>
                <TableHead>{t('table.status')}</TableHead>
                <TableHead>{t('table.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ballons.map((ballon) => (
                <TableRow key={ballon.id}>
                  <TableCell className="font-medium">{ballon.nom}</TableCell>
                  <TableCell>{ballon.immatriculation}</TableCell>
                  <TableCell>{ballon.volume}</TableCell>
                  <TableCell>{ballon.nbPassagerMax}</TableCell>
                  <TableCell>
                    {ballon.camoExpiryDate ? (
                      <ExpiryBadge date={ballon.camoExpiryDate} type="CAMO" />
                    ) : (
                      <span className="text-muted-foreground text-sm">—</span>
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
        )}
      </main>
    )
  })
}
