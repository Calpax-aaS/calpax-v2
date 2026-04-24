import { createHmac, timingSafeEqual } from 'node:crypto'

/**
 * HMAC-signed cookie that proves an ADMIN_CALPAX has elected to view a
 * given exploitant's tenant. The cookie carries:
 *   - the admin's userId (so we can reject a cookie injected from elsewhere)
 *   - the target exploitantId (the tenant we'll swap into the request context)
 *   - the target's display name (avoids a DB lookup in the layout banner —
 *     name may go stale within the 4h TTL if the exploitant is renamed,
 *     acceptable trade-off for keeping `adminDb` out of every request)
 *   - an absolute expiry (Date.now() at write + TTL)
 *
 * We do NOT trust the cookie alone: `requireAuth` re-checks that the
 * current Better Auth session belongs to the same user AND still has the
 * ADMIN_CALPAX role before honouring it.
 *
 * Format: `${base64url(payload)}.${base64url(hmac(secret, b64Payload))}`
 * Payload: JSON `{ adminUserId, targetExploitantId, targetName, exp }`
 */
export const IMPERSONATION_COOKIE_NAME = 'cpx-impersonate-exploitant'
export const IMPERSONATION_TTL_MS = 4 * 60 * 60 * 1000 // 4 hours

export type ImpersonationClaim = {
  adminUserId: string
  targetExploitantId: string
  targetName: string
}

type Payload = ImpersonationClaim & { exp: number }

function getSecret(): string {
  const s = process.env.BETTER_AUTH_SECRET ?? process.env.AUTH_SECRET
  if (!s) throw new Error('BETTER_AUTH_SECRET missing — cannot sign impersonation cookie')
  return s
}

export function signImpersonationCookie(
  adminUserId: string,
  targetExploitantId: string,
  targetName: string,
): string {
  const payload: Payload = {
    adminUserId,
    targetExploitantId,
    targetName,
    exp: Date.now() + IMPERSONATION_TTL_MS,
  }
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const sig = createHmac('sha256', getSecret()).update(encoded).digest('base64url')
  return `${encoded}.${sig}`
}

export function verifyImpersonationCookie(
  cookieValue: string | undefined,
): ImpersonationClaim | null {
  if (!cookieValue) return null

  const dotIndex = cookieValue.lastIndexOf('.')
  if (dotIndex <= 0) return null

  const encoded = cookieValue.slice(0, dotIndex)
  const sig = cookieValue.slice(dotIndex + 1)
  if (!encoded || !sig) return null

  const expected = createHmac('sha256', getSecret()).update(encoded).digest('base64url')
  const sigBuf = Buffer.from(sig)
  const expectedBuf = Buffer.from(expected)
  if (sigBuf.length !== expectedBuf.length) return null
  if (!timingSafeEqual(sigBuf, expectedBuf)) return null

  let parsed: Payload
  try {
    parsed = JSON.parse(Buffer.from(encoded, 'base64url').toString())
  } catch {
    return null
  }
  if (
    typeof parsed?.adminUserId !== 'string' ||
    typeof parsed?.targetExploitantId !== 'string' ||
    typeof parsed?.targetName !== 'string' ||
    typeof parsed?.exp !== 'number'
  ) {
    return null
  }
  if (Date.now() > parsed.exp) return null

  return {
    adminUserId: parsed.adminUserId,
    targetExploitantId: parsed.targetExploitantId,
    targetName: parsed.targetName,
  }
}
