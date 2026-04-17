import type { UserRole } from '@/lib/context'

/**
 * Adds role-based filtering to a Prisma `where` clause for Vol queries.
 * - PILOTE: only vols where pilote.userId matches
 * - EQUIPIER/GERANT/ADMIN_CALPAX: no additional filter (tenant-scoped)
 */
export function buildVolWhereForRole<T extends Record<string, unknown>>(
  where: T,
  role: UserRole,
  userId: string,
): T & Record<string, unknown> {
  if (role === 'PILOTE') {
    return { ...where, pilote: { userId } }
  }
  return { ...where }
}
