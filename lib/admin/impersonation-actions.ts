'use server'

import { AuditAction } from '@prisma/client'
import { cookies, headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { adminDb } from '@/lib/db'
import { writeAudit } from '@/lib/audit/write'
import {
  IMPERSONATION_COOKIE_NAME,
  IMPERSONATION_TTL_MS,
  signImpersonationCookie,
  verifyImpersonationCookie,
} from '@/lib/auth/impersonation-cookie'
import { ForbiddenError, UnauthorizedError } from '@/lib/errors'

/**
 * ADMIN_CALPAX action — sets the impersonation cookie targeting the given
 * exploitant, emits an `IMPERSONATE_START` audit row, then redirects to
 * the dashboard so the swap takes effect on the next request.
 *
 * Validates the admin's session AND role server-side; the cookie is signed
 * with `BETTER_AUTH_SECRET` so a tampered or stolen value is rejected on
 * read by `requireAuth`.
 */
export async function startImpersonation(
  targetExploitantId: string,
  locale: string,
): Promise<void> {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) throw new UnauthorizedError()

  const role = (session.user as Record<string, unknown>).role as string | undefined
  if (role !== 'ADMIN_CALPAX') throw new ForbiddenError()

  const adminUserId = session.user.id

  // Cross-tenant lookup is the legit super-admin pattern. We snapshot the
  // display name into the cookie so the layout banner doesn't have to hit
  // the DB on every request.
  const target = await adminDb.exploitant.findUnique({
    where: { id: targetExploitantId },
    select: { name: true, frDecNumber: true },
  })
  if (!target) throw new ForbiddenError('Unknown exploitant')

  const targetName = `${target.name} (${target.frDecNumber})`
  const cookieValue = signImpersonationCookie(adminUserId, targetExploitantId, targetName)
  const store = await cookies()
  // `secure: true` always — the impersonation cookie carries the privilege
  // claim used by `requireAuth`, so HTTP transit is unacceptable even on
  // localhost. Better Auth dev sessions cope; only impersonation tooling has
  // to be exercised over HTTPS in development.
  store.set(IMPERSONATION_COOKIE_NAME, cookieValue, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: IMPERSONATION_TTL_MS / 1000,
  })

  await writeAudit({
    userId: adminUserId,
    impersonatedBy: adminUserId,
    entityType: 'Exploitant',
    entityId: targetExploitantId,
    action: AuditAction.IMPERSONATE_START,
  })

  redirect(`/${locale}`)
}

/**
 * Clears the impersonation cookie and emits an `IMPERSONATE_STOP` audit row.
 * Tolerant: if the cookie is already gone (e.g. expired) we just no-op,
 * still redirect, and skip the audit write to avoid noise.
 */
export async function stopImpersonation(locale: string): Promise<void> {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) throw new UnauthorizedError()

  const store = await cookies()
  const existing = store.get(IMPERSONATION_COOKIE_NAME)?.value
  const claim = verifyImpersonationCookie(existing)

  store.delete(IMPERSONATION_COOKIE_NAME)

  if (claim && claim.adminUserId === session.user.id) {
    await writeAudit({
      userId: session.user.id,
      impersonatedBy: session.user.id,
      entityType: 'Exploitant',
      entityId: claim.targetExploitantId,
      action: AuditAction.IMPERSONATE_STOP,
    })
  }

  redirect(`/${locale}/admin`)
}
