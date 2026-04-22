import { getTranslations } from 'next-intl/server'
import { requireAuth } from '@/lib/auth/requireAuth'
import { requireRole } from '@/lib/auth/requireRole'
import { basePrisma } from '@/lib/db/base'
import { AdminAuditClient } from './audit-client'

export default async function AdminAuditPage() {
  return requireAuth(async () => {
    // Defense-in-depth: admin/layout.tsx already gates this route, but the
    // page itself queries the cross-tenant audit log via basePrisma so we
    // add an explicit guard here too (cf. issue #28).
    requireRole('ADMIN_CALPAX')

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
  })
}
