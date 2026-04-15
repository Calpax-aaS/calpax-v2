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

export default async function AdminUsersPage() {
  const t = await getTranslations('admin.users')

  const users = await basePrisma.user.findMany({
    include: {
      exploitant: { select: { name: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  // Fetch latest session per user
  const userIds = users.map((u) => u.id)
  const latestSessions = await basePrisma.session.findMany({
    where: { userId: { in: userIds } },
    orderBy: { createdAt: 'desc' },
    distinct: ['userId'],
    select: { userId: true, createdAt: true },
  })
  const lastLoginMap = new Map(latestSessions.map((s) => [s.userId, s.createdAt]))

  function formatDate(date: Date | null): string {
    if (!date) return '--'
    return new Date(date).toLocaleString('fr-FR')
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>

      <Card>
        <CardHeader>
          <CardTitle>
            {t('title')} ({users.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {users.length === 0 ? (
            <p className="text-muted-foreground">{t('noUsers')}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('nom')}</TableHead>
                  <TableHead>{t('email')}</TableHead>
                  <TableHead>{t('role')}</TableHead>
                  <TableHead>{t('exploitant')}</TableHead>
                  <TableHead>{t('lastLogin')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id} className="hover:bg-muted/50">
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell className="text-muted-foreground">{user.email}</TableCell>
                    <TableCell>
                      <Badge variant={user.role === 'ADMIN_CALPAX' ? 'destructive' : 'outline'}>
                        {user.role}
                      </Badge>
                    </TableCell>
                    <TableCell>{user.exploitant.name}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatDate(lastLoginMap.get(user.id) ?? null)}
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
