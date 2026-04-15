import { getTranslations } from 'next-intl/server'
import { basePrisma } from '@/lib/db/base'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

type Props = {
  params: Promise<{ locale: string }>
}

export default async function AdminDashboardPage({ params }: Props) {
  const { locale } = await params
  const t = await getTranslations('admin.dashboard')

  const [exploitantCount, userCount, volCount, exploitants] = await Promise.all([
    basePrisma.exploitant.count(),
    basePrisma.user.count(),
    basePrisma.vol.count(),
    basePrisma.exploitant.findMany({
      include: {
        _count: {
          select: {
            users: true,
            vols: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    }),
  ])

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>

      {/* Stats cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              {t('totalExploitants')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{exploitantCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              {t('totalUsers')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{userCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              {t('totalVols')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{volCount}</p>
          </CardContent>
        </Card>
      </div>

      {/* Exploitants table */}
      <Card>
        <CardHeader>
          <CardTitle>{t('exploitants')}</CardTitle>
        </CardHeader>
        <CardContent>
          {exploitants.length === 0 ? (
            <p className="text-muted-foreground">{t('noExploitants')}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('nom')}</TableHead>
                  <TableHead>{t('frDec')}</TableHead>
                  <TableHead className="text-center">{t('nbUsers')}</TableHead>
                  <TableHead className="text-center">{t('nbVols')}</TableHead>
                  <TableHead>{t('actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {exploitants.map((exp) => (
                  <TableRow key={exp.id} className="hover:bg-muted/50">
                    <TableCell className="font-medium">{exp.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{exp.frDecNumber}</Badge>
                    </TableCell>
                    <TableCell className="text-center">{exp._count.users}</TableCell>
                    <TableCell className="text-center">{exp._count.vols}</TableCell>
                    <TableCell>
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/${locale}?impersonate=${exp.id}`}>{t('impersonate')}</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
