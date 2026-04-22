import { Prisma, AuditAction } from '@prisma/client'
import { basePrisma } from '@/lib/db/base'
import { logger } from '@/lib/logger'

type AuditInput = {
  exploitantId?: string | null
  userId?: string | null
  impersonatedBy?: string | null
  entityType: string
  entityId: string
  action: AuditAction
  field?: string | null
  beforeValue?: Prisma.InputJsonValue | null
  afterValue?: Prisma.InputJsonValue | null
}

/**
 * Write a single audit-log row for an operation that isn't a plain Prisma
 * CRUD (those are captured by `audit-extension.ts` automatically). Use this
 * for cross-cutting events such as weather-fetch failures, mass-budget
 * reads, or admin actions that bypass the tenant-scoped client.
 *
 * Failures are logged and swallowed — audit must never be on the critical
 * path of the request.
 */
export async function writeAudit(input: AuditInput): Promise<void> {
  try {
    await basePrisma.auditLog.create({
      data: {
        exploitantId: input.exploitantId ?? null,
        userId: input.userId ?? null,
        impersonatedBy: input.impersonatedBy ?? null,
        entityType: input.entityType,
        entityId: input.entityId,
        action: input.action,
        field: input.field ?? null,
        beforeValue: input.beforeValue ?? Prisma.DbNull,
        afterValue: input.afterValue ?? Prisma.DbNull,
      },
    })
  } catch (err) {
    logger.error({ err, ...input }, 'writeAudit: failed to persist audit row')
  }
}
