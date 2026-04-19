import { getTranslations } from 'next-intl/server'
import { basePrisma } from '@/lib/db/base'
import { AdminAuditClient } from './audit-client'

export default async function AdminAuditPage() {
  const t = await getTranslations('admin.audit')

  const [exploitants, admins] = await Promise.all([
    basePrisma.exploitant.findMany({
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
    basePrisma.user.findMany({
      where: { role: 'ADMIN_CALPAX' },
      select: { id: true, name: true, email: true },
    }),
  ])

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
      <AdminAuditClient exploitants={exploitants} admins={admins} />
    </div>
  )
}
