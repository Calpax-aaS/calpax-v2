import { getTranslations } from 'next-intl/server'
import { basePrisma } from '@/lib/db/base'
import { AdminAuditClient } from './audit-client'

export default async function AdminAuditPage() {
  const t = await getTranslations('admin.audit')

  const exploitants = await basePrisma.exploitant.findMany({
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  })

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
      <AdminAuditClient exploitants={exploitants} />
    </div>
  )
}
