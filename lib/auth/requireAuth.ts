import { auth } from '@/lib/auth'
import { cookies, headers } from 'next/headers'
import { runWithContext } from '@/lib/context'
import { UnauthorizedError } from '@/lib/errors'
import {
  IMPERSONATION_COOKIE_NAME,
  verifyImpersonationCookie,
} from '@/lib/auth/impersonation-cookie'
import type { UserRole } from '@/lib/context'

export async function requireAuth<T>(fn: () => Promise<T>): Promise<T> {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session?.user) throw new UnauthorizedError()

  const user = session.user as Record<string, unknown>
  const sessionExploitantId = user.exploitantId as string
  // Least-privilege fallback: `User.role` is `UserRole NOT NULL` in Prisma
  // so the DB can't return null, but a session claim without a role (race
  // condition, legacy cookie) still falls through here. Defaulting to
  // EQUIPIER keeps the user locked out of elevated pages until the claim
  // is resolved, matching the sidebar default from issue #35.
  const role = ((user.role as string) ?? 'EQUIPIER') as UserRole

  // Exploitant-level impersonation (#59) — an ADMIN_CALPAX with a valid
  // signed cookie pointing at a target tenant runs every subsequent request
  // as if they were inside that tenant. The cookie is validated against the
  // currently authenticated session: a stolen or replayed cookie targeting
  // a different admin is rejected here.
  let exploitantId = sessionExploitantId
  let impersonatedBy: string | undefined
  if (role === 'ADMIN_CALPAX') {
    const cookieStore = await cookies()
    const claim = verifyImpersonationCookie(cookieStore.get(IMPERSONATION_COOKIE_NAME)?.value)
    if (claim && claim.adminUserId === session.user.id) {
      exploitantId = claim.targetExploitantId
      impersonatedBy = session.user.id
    }
  }

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
      role,
      impersonatedBy,
    },
    fn,
  ) as Promise<T>
}
