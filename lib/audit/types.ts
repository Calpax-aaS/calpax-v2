/** Shared types + constants for the audit log UI.
 *  Kept out of `lib/actions/audit.ts` because Next.js `'use server'` files
 *  may only export async functions. */

export type AuditLogRow = {
  id: bigint
  entityType: string
  entityId: string
  action: string
  field: string | null
  beforeValue: unknown
  afterValue: unknown
  createdAt: Date
}

export type AdminAuditLogRow = AuditLogRow & {
  exploitantId: string | null
  userId: string | null
  impersonatedBy: string | null
}

export type AuditLogPage<T> = {
  logs: T[]
  total: number
  page: number
  pageCount: number
}

/** Entity types displayed in the audit-log filter dropdown.
 *  Tenant viewer adds 'AUTH' (auth events scoped to the tenant); admin
 *  viewer adds 'Exploitant' (only visible at the cross-tenant level). */
const SHARED_ENTITY_TYPES = ['Ballon', 'Pilote', 'Billet', 'Passager', 'Paiement', 'Vol'] as const

export const TENANT_AUDIT_ENTITY_TYPES = [...SHARED_ENTITY_TYPES, 'AUTH'] as const
export const ADMIN_AUDIT_ENTITY_TYPES = [...SHARED_ENTITY_TYPES, 'Exploitant'] as const

const SHARED_ACTIONS = [
  'CREATE',
  'UPDATE',
  'DELETE',
  'SIGN_IN',
  'SIGN_IN_FAILED',
  'SIGN_OUT',
  'PASSWORD_RESET',
  'PASSWORD_CHANGED',
  'ACCOUNT_LOCKED',
] as const

export const TENANT_AUDIT_ACTIONS = SHARED_ACTIONS

export const ADMIN_AUDIT_ACTIONS = [
  ...SHARED_ACTIONS,
  'EXPORT_PII',
  'ANONYMIZE_PII',
  'IMPERSONATE_START',
  'IMPERSONATE_STOP',
] as const
