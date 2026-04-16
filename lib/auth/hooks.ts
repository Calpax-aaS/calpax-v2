import { APIError, createAuthMiddleware } from 'better-auth/api'
import { AuditAction } from '@prisma/client'
import { basePrisma } from '@/lib/db/base'
import {
  clearFailedAttempts,
  getActiveLock,
  recordFailedAttempt,
  writeAuthAudit,
  LOCKOUT_POLICY,
} from './audit'

/**
 * Auth lifecycle hooks for Better Auth.
 *
 * Covered events:
 *   - before /sign-in/email : reject if account currently locked
 *   - after  /sign-in/email : on success -> SIGN_IN audit + clear failed counter
 *                              on failure -> SIGN_IN_FAILED audit + increment failed counter
 *                              hitting the threshold also emits ACCOUNT_LOCKED
 *   - after  /sign-out       : SIGN_OUT audit
 *   - after  /reset-password : PASSWORD_RESET audit (token-based flow)
 *   - after  /change-password : PASSWORD_CHANGED audit (authenticated flow)
 *
 * Failures inside a hook must never break the auth flow (except for the
 * intentional locked-account rejection). All audit writes are fire-and-forget
 * with try/catch in writeAuthAudit.
 */

type AuthCtx = {
  path?: string
  body?: Record<string, unknown> | null
  request?: Request
  context: {
    newSession?: {
      user: { id: string }
      session: { ipAddress?: string | null; userAgent?: string | null }
    } | null
    session?: { user: { id: string } } | null
    returned?: unknown
    responseHeaders?: Headers
  }
}

function extractIp(ctx: AuthCtx): string | null {
  const req = ctx.request
  if (!req) return null
  const xff = req.headers.get('x-forwarded-for')
  if (xff) return xff.split(',')[0]?.trim() ?? null
  return req.headers.get('x-real-ip')
}

function extractUserAgent(ctx: AuthCtx): string | null {
  return ctx.request?.headers.get('user-agent') ?? null
}

function extractEmail(ctx: AuthCtx): string | null {
  const body = ctx.body
  if (!body) return null
  const email = body.email
  return typeof email === 'string' ? email.toLowerCase() : null
}

async function resolveExploitantId(userId: string | null | undefined): Promise<string | null> {
  if (!userId) return null
  try {
    const user = await basePrisma.user.findUnique({
      where: { id: userId },
      select: { exploitantId: true },
    })
    return user?.exploitantId ?? null
  } catch {
    return null
  }
}

export const authBeforeHook = createAuthMiddleware(async (ctx) => {
  const c = ctx as unknown as AuthCtx
  if (c.path !== '/sign-in/email') return

  const email = extractEmail(c)
  if (!email) return

  const lockedUntil = await getActiveLock(email)
  if (!lockedUntil) return

  // Surface a clear, user-facing error. Better Auth formats APIError.from
  // responses as JSON with status 403.
  throw new APIError('FORBIDDEN', {
    code: 'ACCOUNT_LOCKED',
    message: `Account temporarily locked after ${LOCKOUT_POLICY.maxAttempts} failed attempts. Try again after ${lockedUntil.toISOString()}.`,
  })
})

export const authAfterHook = createAuthMiddleware(async (ctx) => {
  const c = ctx as unknown as AuthCtx
  const path = c.path
  if (!path) return

  const ipAddress = extractIp(c)
  const userAgent = extractUserAgent(c)

  // Successful sign-in: Better Auth sets newSession on the auth context when
  // credentials are valid. This covers /sign-in/email, magic-link verify, and
  // OAuth callbacks.
  if (c.context.newSession && path.startsWith('/sign-in')) {
    const userId = c.context.newSession.user.id
    const email =
      c.context.newSession.user && 'email' in c.context.newSession.user
        ? String((c.context.newSession.user as Record<string, unknown>).email)
        : null
    const exploitantId = await resolveExploitantId(userId)

    if (email) await clearFailedAttempts(email)

    await writeAuthAudit({
      action: AuditAction.SIGN_IN,
      userId,
      exploitantId,
      email,
      ipAddress,
      userAgent,
      extra: { path },
    })
    return
  }

  // Failed email sign-in: no newSession on an otherwise valid sign-in request.
  if (path === '/sign-in/email' && !c.context.newSession) {
    const email = extractEmail(c)
    if (!email) return

    await writeAuthAudit({
      action: AuditAction.SIGN_IN_FAILED,
      email,
      ipAddress,
      userAgent,
      extra: { path },
    })

    const { lockedUntil, attempts } = await recordFailedAttempt({
      email,
      ipAddress,
      userAgent,
    })

    if (lockedUntil) {
      // Reuse resolveExploitantId to scope the ACCOUNT_LOCKED row to a tenant
      // when the email matches a known user. Unknown-email enumerations stay
      // tenant-less.
      const user = await basePrisma.user.findUnique({
        where: { email },
        select: { id: true, exploitantId: true },
      })
      await writeAuthAudit({
        action: AuditAction.ACCOUNT_LOCKED,
        userId: user?.id ?? null,
        exploitantId: user?.exploitantId ?? null,
        email,
        ipAddress,
        userAgent,
        extra: { attempts, lockedUntil: lockedUntil.toISOString() },
      })
    }
    return
  }

  // Sign-out: session still present on the request before logout, gone after.
  if (path === '/sign-out') {
    const userId = c.context.session?.user.id ?? null
    const exploitantId = await resolveExploitantId(userId)
    await writeAuthAudit({
      action: AuditAction.SIGN_OUT,
      userId,
      exploitantId,
      ipAddress,
      userAgent,
      extra: { path },
    })
    return
  }

  // Password reset (token-based, unauthenticated path /reset-password) and
  // password change (authenticated /change-password). Better Auth exposes both.
  if (path === '/reset-password') {
    // The body has a `newPassword` + `token`. We derive the user from token
    // indirectly by looking at the returned value (set on success).
    const returned = c.context.returned as { status?: boolean; user?: { id?: string } } | undefined
    const userId = returned?.user?.id ?? null
    const exploitantId = await resolveExploitantId(userId)
    await writeAuthAudit({
      action: AuditAction.PASSWORD_RESET,
      userId,
      exploitantId,
      ipAddress,
      userAgent,
      extra: { path },
    })
    return
  }

  if (path === '/change-password') {
    const userId = c.context.session?.user.id ?? null
    const exploitantId = await resolveExploitantId(userId)
    await writeAuthAudit({
      action: AuditAction.PASSWORD_CHANGED,
      userId,
      exploitantId,
      ipAddress,
      userAgent,
      extra: { path },
    })
    return
  }
})
