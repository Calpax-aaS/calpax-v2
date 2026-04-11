'use server'

import { requireAuth } from '@/lib/auth/requireAuth'
import { db } from '@/lib/db'

type AuditFilters = {
  entityType?: string
  action?: string
  page?: number
}

export async function fetchAuditLogs(filters: AuditFilters) {
  return requireAuth(async () => {
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
