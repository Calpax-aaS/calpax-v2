import { Prisma, AuditAction } from '@prisma/client'
import { basePrisma } from './base'
import { tryGetContext } from '@/lib/context'
import { logger } from '@/lib/logger'

function modelAccessor(model: string): string {
  return model.charAt(0).toLowerCase() + model.slice(1)
}

const SKIP_FIELDS = new Set(['updatedAt', 'createdAt', 'id'])

const REDACT_FIELDS = new Set([
  'email',
  'telephone',
  'payeurEmail',
  'payeurTelephone',
  'payeurAdresse',
  'payeurPrenom',
  'payeurNom',
  'poidsEncrypted',
  'emailEncrypted',
  'telephoneEncrypted',
  'destinataireNom',
  'destinataireEmail',
  'organisateurNom',
  'organisateurEmail',
  'organisateurTelephone',
])

function redactSensitive(obj: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(obj).map(([k, v]) => [k, REDACT_FIELDS.has(k) ? '[REDACTED]' : v]),
  )
}

function diffRows(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
): Array<{ field: string; before: unknown; after: unknown }> {
  const changes: Array<{ field: string; before: unknown; after: unknown }> = []
  const keys = new Set([...Object.keys(before), ...Object.keys(after)])
  for (const k of keys) {
    if (SKIP_FIELDS.has(k)) continue
    if (JSON.stringify(before[k]) !== JSON.stringify(after[k])) {
      changes.push({ field: k, before: before[k], after: after[k] })
    }
  }
  return changes
}

const READ_OPS = new Set([
  'findFirst',
  'findFirstOrThrow',
  'findUnique',
  'findUniqueOrThrow',
  'findMany',
  'count',
  'aggregate',
  'groupBy',
])

export const auditExtension = Prisma.defineExtension({
  name: 'audit-log',
  query: {
    $allModels: {
      async $allOperations({ model, operation, args, query }) {
        if (model === 'AuditLog') return query(args)
        if (READ_OPS.has(operation)) return query(args)

        const ctx = tryGetContext()
        const a = args as Record<string, unknown>

        let beforeRow: Record<string, unknown> | null = null
        if (operation === 'update' || operation === 'delete') {
          const accessor = modelAccessor(model)
          beforeRow =
            (await (
              basePrisma as unknown as Record<
                string,
                { findFirst: (args: { where: unknown }) => Promise<Record<string, unknown> | null> }
              >
            )[accessor]?.findFirst({ where: (a as { where?: unknown }).where })) ?? null
        }

        const result = await query(args)

        const exploitantId = ctx?.exploitantId ?? null
        const userId = ctx?.userId ?? null
        const impersonatedBy = ctx?.impersonatedBy ?? null

        try {
          if (operation === 'create') {
            const row = result as Record<string, unknown>
            await basePrisma.auditLog.create({
              data: {
                exploitantId,
                userId,
                impersonatedBy,
                entityType: model,
                entityId: String(row['id']),
                action: AuditAction.CREATE,
                field: null,
                afterValue: redactSensitive(row) as Prisma.InputJsonValue,
              },
            })
          } else if (operation === 'update' && beforeRow) {
            const afterRow = result as Record<string, unknown>
            const changes = diffRows(beforeRow, afterRow)
            if (changes.length > 0) {
              await basePrisma.auditLog.createMany({
                data: changes.map((c) => ({
                  exploitantId,
                  userId,
                  impersonatedBy,
                  entityType: model,
                  entityId: String(afterRow['id']),
                  action: AuditAction.UPDATE,
                  field: c.field,
                  beforeValue: (REDACT_FIELDS.has(c.field)
                    ? '[REDACTED]'
                    : c.before) as Prisma.InputJsonValue,
                  afterValue: (REDACT_FIELDS.has(c.field)
                    ? '[REDACTED]'
                    : c.after) as Prisma.InputJsonValue,
                })),
              })
            }
          } else if (operation === 'delete' && beforeRow) {
            await basePrisma.auditLog.create({
              data: {
                exploitantId,
                userId,
                impersonatedBy,
                entityType: model,
                entityId: String(beforeRow['id']),
                action: AuditAction.DELETE,
                field: null,
                beforeValue: redactSensitive(beforeRow) as Prisma.InputJsonValue,
              },
            })
          }
        } catch (err) {
          // Audit-trail integrity matters for RGPD compliance — surface as
          // error so it shows up in monitoring instead of silently dropping.
          logger.error(
            { err, model, operation, exploitantId, userId },
            'audit-extension: failed to write audit row',
          )
        }

        return result
      },
    },
  },
})
