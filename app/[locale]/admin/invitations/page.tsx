import { getTranslations } from 'next-intl/server'
import { basePrisma } from '@/lib/db/base'
import { InvitationForm } from './invitation-form'

export default async function AdminInvitationsPage() {
  const t = await getTranslations('admin.invitations')

  const exploitants = await basePrisma.exploitant.findMany({
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  })

  // Recent users (last 10 created)
  const recentUsers = await basePrisma.user.findMany({
    take: 10,
    orderBy: { createdAt: 'desc' },
    include: { exploitant: { select: { name: true } } },
  })

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
      <InvitationForm
        exploitants={exploitants}
        recentUsers={recentUsers.map((u) => ({
          id: u.id,
          name: u.name,
          email: u.email,
          role: u.role,
          exploitantName: u.exploitant.name,
          createdAt: u.createdAt,
        }))}
      />
    </div>
  )
}
