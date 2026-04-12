import { Prisma } from '@prisma/client'
import { tryGetContext } from '@/lib/context'

export const TENANT_FILTER: Record<string, string> = {
  Exploitant: 'id',
  User: 'exploitantId',
  AuditLog: 'exploitantId',
  Ballon: 'exploitantId',
  Pilote: 'exploitantId',
  Billet: 'exploitantId',
  Passager: 'exploitantId',
  Paiement: 'exploitantId',
  Vol: 'exploitantId',
  WeatherCache: 'exploitantId',
}

export const UNTENANTED = new Set<string>([
  'Account',
  'Session',
  'VerificationToken',
  'BilletSequence',
])

const COMPOSABLE_READ_OPS = new Set([
  'findFirst',
  'findFirstOrThrow',
  'findMany',
  'count',
  'aggregate',
  'groupBy',
])
const UNIQUE_READ_OPS = new Set(['findUnique', 'findUniqueOrThrow'])
const SCOPED_WRITE_OPS = new Set(['update', 'updateMany', 'delete', 'deleteMany', 'upsert'])
const CREATE_OPS = new Set(['create', 'createMany'])

export const tenantExtension = Prisma.defineExtension({
  name: 'tenant-isolation',
  query: {
    $allModels: {
      async $allOperations({ model, operation, args, query }) {
        if (UNTENANTED.has(model)) return query(args)

        const field = TENANT_FILTER[model]
        if (!field) {
          throw new Error(
            `tenant-extension: unclassified model "${model}". Add it to TENANT_FILTER or UNTENANTED.`,
          )
        }

        const ctx = tryGetContext()
        if (!ctx) {
          throw new Error(
            `${model}.${operation}() called outside request context. Wrap in requireAuth() or use lib/admin/*.`,
          )
        }

        const a = args as Record<string, unknown>

        // findUnique post-filter: run original query, reject if wrong tenant
        if (UNIQUE_READ_OPS.has(operation)) {
          const result = (await query(args)) as Record<string, unknown> | null
          if (result == null) return result
          const rowTenant = result[field]
          if (rowTenant !== ctx.exploitantId) {
            if (operation === 'findUniqueOrThrow') {
              throw new Error(`${model}.findUniqueOrThrow: no record found matching tenant`)
            }
            return null
          }
          return result
        }

        // Composable reads + scoped writes: inject where filter
        if (COMPOSABLE_READ_OPS.has(operation) || SCOPED_WRITE_OPS.has(operation)) {
          a.where = { ...(a.where as object | undefined), [field]: ctx.exploitantId }
        }

        // Creates: inject tenant, fail-loud on explicit mismatch
        if (field === 'exploitantId' && CREATE_OPS.has(operation)) {
          const enforceTenant = (d: Record<string, unknown>) => {
            if ('exploitantId' in d && d.exploitantId !== ctx.exploitantId) {
              throw new Error(
                `${model}.${operation}(): explicit exploitantId=${String(d.exploitantId)} does not match current context ${ctx.exploitantId}. Omit exploitantId — it is injected automatically.`,
              )
            }
            return { ...d, exploitantId: ctx.exploitantId }
          }
          if ('data' in a) {
            const data = a.data as Record<string, unknown> | Record<string, unknown>[]
            a.data = Array.isArray(data) ? data.map(enforceTenant) : enforceTenant(data)
          }
        }

        return query(a)
      },
    },
  },
})
