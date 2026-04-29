import { getTranslations } from 'next-intl/server'
import { basePrisma } from '@/lib/db/base'
import { formatDateTimeFr } from '@/lib/format'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { RevokeSessionButton } from './revoke-button'

export default async function AdminSessionsPage() {
  const t = await getTranslations('admin.sessions')

  const sessions = await basePrisma.session.findMany({
    where: { expiresAt: { gt: new Date() } },
    include: {
      user: { select: { name: true, email: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  function truncateUA(ua: string | null): string {
    if (!ua) return '--'
    return ua.length > 60 ? `${ua.slice(0, 60)}...` : ua
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>

      <Card>
        <CardHeader>
          <CardTitle>
            {t('title')} ({sessions.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {sessions.length === 0 ? (
            <p className="text-muted-foreground">{t('noSessions')}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('user')}</TableHead>
                  <TableHead>{t('email')}</TableHead>
                  <TableHead>{t('ip')}</TableHead>
                  <TableHead>{t('userAgent')}</TableHead>
                  <TableHead>{t('start')}</TableHead>
                  <TableHead>{t('expires')}</TableHead>
                  <TableHead>{t('actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sessions.map((session) => (
                  <TableRow key={session.id} className="hover:bg-muted/50">
                    <TableCell className="font-medium">{session.user.name}</TableCell>
                    <TableCell className="text-muted-foreground">{session.user.email}</TableCell>
                    <TableCell className="text-xs">{session.ipAddress ?? '--'}</TableCell>
                    <TableCell className="text-xs max-w-48 truncate">
                      {truncateUA(session.userAgent)}
                    </TableCell>
                    <TableCell className="text-xs">{formatDateTimeFr(session.createdAt)}</TableCell>
                    <TableCell className="text-xs">{formatDateTimeFr(session.expiresAt)}</TableCell>
                    <TableCell>
                      <RevokeSessionButton sessionId={session.id} />
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
