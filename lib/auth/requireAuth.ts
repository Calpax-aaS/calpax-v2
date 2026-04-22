import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { runWithContext } from '@/lib/context'
import { UnauthorizedError } from '@/lib/errors'
import type { UserRole } from '@/lib/context'

export async function requireAuth<T>(fn: () => Promise<T>): Promise<T> {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session?.user) throw new UnauthorizedError()

  const user = session.user as Record<string, unknown>
  const exploitantId = user.exploitantId as string
  // Least-privilege fallback: `User.role` is `UserRole NOT NULL` in Prisma
  // so the DB can't return null, but a session claim without a role (race
  // condition, legacy cookie) still falls through here. Defaulting to
  // EQUIPIER keeps the user locked out of elevated pages until the claim
  // is resolved, matching the sidebar default from issue #35.
  const role = (user.role as string) ?? 'EQUIPIER'

  // ADMIN_CALPAX can operate without a tenant (super-admin actions use adminDb).
  // Today the DB schema enforces exploitantId on all users, but this guard
  // future-proofs for the day ADMIN_CALPAX users may exist without a tenant.
  if (!exploitantId && role !== 'ADMIN_CALPAX') {
    throw new UnauthorizedError('User has no exploitant')
  }

  return runWithContext(
    {
      userId: session.user.id,
      exploitantId,
      role: role as UserRole,
    },
    fn,
  ) as Promise<T>
}
