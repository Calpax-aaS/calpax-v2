import { getContext, type UserRole } from '@/lib/context'
import { ForbiddenError } from '@/lib/errors'

/**
 * Checks that the current user has one of the allowed roles.
 * Must be called inside a requireAuth() callback (after context is set).
 * Throws ForbiddenError if the user's role is not in the allowed list.
 */
export function requireRole(...allowedRoles: UserRole[]): void {
  const ctx = getContext()
  if (!allowedRoles.includes(ctx.role)) {
    throw new ForbiddenError()
  }
}
