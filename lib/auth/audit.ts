import { AuditAction, Prisma } from '@prisma/client'
import { basePrisma } from '@/lib/db/base'
import { logger } from '@/lib/logger'

/**
 * Account lockout policy.
 *
 * WHY these values: balloon operators typically have a handful of staff users
 * per tenant, so we err on the side of security. 5 failures in 15 min is the
 * common OWASP ballpark; a 30 min lock is long enough to frustrate brute force
 * but short enough that legitimate users can just wait instead of calling
 * support.
 */
export const LOCKOUT_POLICY = {
  /** Rolling window (ms) within which failures are counted. */
  windowMs: 15 * 60 * 1000,
  /** Failures within the window that trigger a lock. */
  maxAttempts: 5,
  /** How long the account stays locked once triggered (ms). */
  lockMs: 30 * 60 * 1000,
} as const

type AuthAuditInput = {
  action: AuditAction
  userId?: string | null
  exploitantId?: string | null
  email?: string | null
  ipAddress?: string | null
  userAgent?: string | null
  extra?: Record<string, unknown>
}

/**
 * Write a single auth-related row into the central audit_log table.
 *
 * exploitantId is nullable on AuditLog, which matches our need here: failed
 * sign-ins have no known tenant, and SYSTEM-level events (lockout) may be
 * cross-tenant. For successful events we look up the user's tenant.
 *
 * Errors are swallowed (logged via pino) - the auth flow must never fail
 * because we couldn't write a log row.
 */
export async function writeAuthAudit({
  action,
  userId = null,
  exploitantId = null,
  email = null,
  ipAddress = null,
  userAgent = null,
  extra = {},
}: AuthAuditInput): Promise<void> {
  try {
    // Keep payload small and PII-aware: we store the attempted email for failed
    // sign-ins because it's needed for forensics, but never the password.
    const afterValue: Record<string, unknown> = {
      ...extra,
    }
    if (email) afterValue.email = email
    if (ipAddress) afterValue.ipAddress = ipAddress
    if (userAgent) afterValue.userAgent = userAgent

    await basePrisma.auditLog.create({
      data: {
        exploitantId,
        userId,
        entityType: 'AUTH',
        entityId: userId ?? email ?? 'unknown',
        action,
        afterValue: afterValue as Prisma.InputJsonValue,
      },
    })
  } catch (err) {
    logger.warn({ err }, '[auth-audit] failed to write audit row')
  }
}

/**
 * Count failed login attempts for an email within the active rolling window.
 * Cleans up rows older than the window on the same call to keep the table small.
 */
export async function countRecentFailedAttempts(email: string): Promise<number> {
  const since = new Date(Date.now() - LOCKOUT_POLICY.windowMs)
  // Opportunistic prune of expired rows. Errors are non-fatal.
  try {
    await basePrisma.failedLoginAttempt.deleteMany({
      where: { createdAt: { lt: since } },
    })
  } catch (err) {
    logger.warn({ err }, '[auth-audit] failed to prune old failed attempts')
  }

  return basePrisma.failedLoginAttempt.count({
    where: { email, createdAt: { gte: since } },
  })
}

/**
 * Record a failed sign-in and lock the user account if the threshold is
 * reached. Returns whether the account was newly locked so the caller can
 * emit an ACCOUNT_LOCKED audit row.
 */
export async function recordFailedAttempt(params: {
  email: string
  ipAddress: string | null
  userAgent: string | null
}): Promise<{ lockedUntil: Date | null; attempts: number }> {
  const { email, ipAddress, userAgent } = params

  try {
    await basePrisma.failedLoginAttempt.create({
      data: { email, ipAddress, userAgent },
    })
  } catch (err) {
    logger.warn({ err }, '[auth-audit] failed to record attempt')
  }

  const attempts = await countRecentFailedAttempts(email)

  if (attempts < LOCKOUT_POLICY.maxAttempts) {
    return { lockedUntil: null, attempts }
  }

  // Threshold reached. Lock the user (if present in our DB) for lockMs.
  const lockedUntil = new Date(Date.now() + LOCKOUT_POLICY.lockMs)
  try {
    const user = await basePrisma.user.findUnique({ where: { email } })
    if (user) {
      await basePrisma.user.update({
        where: { id: user.id },
        data: { lockedUntil },
      })
      return { lockedUntil, attempts }
    }
  } catch (err) {
    logger.warn({ err }, '[auth-audit] failed to apply lockout')
  }
  return { lockedUntil, attempts }
}

/**
 * Reset the failed-attempt counter for a user. Called after a successful
 * sign-in so the user isn't locked out by their own prior mistakes.
 */
export async function clearFailedAttempts(email: string): Promise<void> {
  try {
    await basePrisma.failedLoginAttempt.deleteMany({ where: { email } })
  } catch (err) {
    logger.warn({ err }, '[auth-audit] failed to clear attempts')
  }
}

/**
 * Check whether a user account is currently locked. Returns the lockedUntil
 * date if the lock is active, null otherwise. Auto-clears an expired lock.
 */
export async function getActiveLock(email: string): Promise<Date | null> {
  const user = await basePrisma.user.findUnique({
    where: { email },
    select: { id: true, lockedUntil: true },
  })
  if (!user?.lockedUntil) return null
  if (user.lockedUntil.getTime() <= Date.now()) {
    // Stale lock: clear it so legitimate users aren't blocked.
    try {
      await basePrisma.user.update({
        where: { id: user.id },
        data: { lockedUntil: null },
      })
    } catch (err) {
      logger.warn({ err }, '[auth-audit] failed to clear stale lock')
    }
    return null
  }
  return user.lockedUntil
}
