import { getTranslations } from 'next-intl/server'
import { requireAuth } from '@/lib/auth/requireAuth'
import { db } from '@/lib/db'
import { basePrisma } from '@/lib/db/base'
import { getContext } from '@/lib/context'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ChangePasswordForm } from '@/components/change-password-form'
import { LinkedAccounts } from '@/components/linked-accounts'

export default async function ProfilPage() {
  return requireAuth(async () => {
    const t = await getTranslations('profil')
    const ctx = getContext()

    const [user, exploitant, accounts] = await Promise.all([
      db.user.findUniqueOrThrow({
        where: { id: ctx.userId },
      }),
      db.exploitant.findUniqueOrThrow({
        where: { id: ctx.exploitantId },
        select: { id: true, name: true, frDecNumber: true },
      }),
      // Accounts is not tenant-scoped in the tenant extension (Better Auth managed)
      basePrisma.account.findMany({
        where: { userId: ctx.userId },
        select: { providerId: true },
      }),
    ])

    const linkedProviders = accounts.map((a) => a.providerId).filter((p) => p !== 'credential')
    const hasCredential = accounts.some((a) => a.providerId === 'credential')

    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('identity')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  {t('name')}
                </p>
                <p className="mt-1 text-sm font-medium">{user.name ?? '\u2014'}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  {t('email')}
                </p>
                <p className="mt-1 text-sm font-medium">{user.email}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  {t('role')}
                </p>
                <Badge variant="outline" className="mt-1">
                  {user.role}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('exploitant')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  {t('exploitantName')}
                </p>
                <p className="mt-1 text-sm font-medium">{exploitant.name}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  {t('frDec')}
                </p>
                <p className="mt-1 text-sm font-medium">{exploitant.frDecNumber}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <LinkedAccounts linkedProviders={linkedProviders} hasCredential={hasCredential} />

        <ChangePasswordForm />
      </div>
    )
  })
}
