'use server'

import { requireAuth } from '@/lib/auth/requireAuth'
import { requireRole } from '@/lib/auth/requireRole'
import { db } from '@/lib/db'
import type { AuditLogPage, AuditLogRow } from '@/lib/audit/types'

type AuditFilters = {
  entityType?: string
  action?: string
  page?: number
}

export async function fetchAuditLogs(filters: AuditFilters): Promise<AuditLogPage<AuditLogRow>> {
  return requireAuth(async () => {
    // The tenant-scoped audit viewer is rendered from
    // `app/[locale]/(app)/audit/page.tsx` which gates by role, but we
    // duplicate the check here so a direct action POST from a PILOTE /
    // EQUIPIER still returns ForbiddenError (cf. issue #34).
    requireRole('ADMIN_CALPAX', 'GERANT')

    const page = filters.page ?? 1
    const take = 50
    const skip = (page - 1) * take

    const where: Record<string, unknown> = {}
    if (filters.entityType) where.entityType = filters.entityType
    if (filters.action) where.action = filters.action

    const [logs, total] = await Promise.all([
      db.auditLog.findMany({ where, orderBy: { createdAt: 'desc' }, take, skip }),
      db.auditLog.count({ where }),
    ])

    return { logs, total, page, pageCount: Math.ceil(total / take) }
  })
}
