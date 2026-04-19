import type { UserRole } from '@/lib/context'

export function buildVolWhereForRole<T extends Record<string, unknown>>(
  where: T,
  role: UserRole,
  userId: string,
): T {
  if (role === 'PILOTE') {
    return { ...where, pilote: { userId } }
  }
  return where
}
