/**
 * Impersonation cookie verifies the #59 sign/verify primitives:
 *
 *  - HMAC-signed cookie roundtrip (sign → verify yields the original claim)
 *  - Tampered, mis-signed, or expired cookies fail verification
 *  - The cookie binds the admin userId, target exploitant, and display name
 *
 * The full server-action flow (set cookie → redirect → next request runs
 * with swapped exploitantId) requires a Next.js request lifecycle and is
 * validated manually before release (see PR test plan).
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createHmac } from 'node:crypto'
import {
  IMPERSONATION_COOKIE_NAME,
  IMPERSONATION_TTL_MS,
  signImpersonationCookie,
  verifyImpersonationCookie,
} from '@/lib/auth/impersonation-cookie'

const ORIG_SECRET = process.env.BETTER_AUTH_SECRET
const NAME = 'Cameron Balloons (FR.DEC.059)'

describe('impersonation cookie', () => {
  beforeEach(() => {
    process.env.BETTER_AUTH_SECRET = 'test-impersonation-secret'
  })

  afterEach(() => {
    if (ORIG_SECRET === undefined) delete process.env.BETTER_AUTH_SECRET
    else process.env.BETTER_AUTH_SECRET = ORIG_SECRET
    vi.useRealTimers()
  })

  it('exposes the canonical cookie name', () => {
    // Hardcoded contract — layout + requireAuth + actions all reference it
    // by string, so a rename here would silently break impersonation.
    expect(IMPERSONATION_COOKIE_NAME).toBe('cpx-impersonate-exploitant')
  })

  it('signs and verifies a cookie roundtrip', () => {
    const cookie = signImpersonationCookie('admin-123', 'expl-cameron', NAME)
    const claim = verifyImpersonationCookie(cookie)
    expect(claim).not.toBeNull()
    expect(claim?.adminUserId).toBe('admin-123')
    expect(claim?.targetExploitantId).toBe('expl-cameron')
    expect(claim?.targetName).toBe(NAME)
  })

  it('rejects an undefined / empty cookie', () => {
    expect(verifyImpersonationCookie(undefined)).toBeNull()
    expect(verifyImpersonationCookie('')).toBeNull()
  })

  it('rejects a malformed cookie (no signature)', () => {
    expect(verifyImpersonationCookie('garbage')).toBeNull()
    expect(verifyImpersonationCookie('a.b')).toBeNull()
  })

  it('rejects a cookie signed with a different secret', () => {
    const cookie = signImpersonationCookie('admin-123', 'expl-cameron', NAME)
    process.env.BETTER_AUTH_SECRET = 'a-different-secret-altogether'
    expect(verifyImpersonationCookie(cookie)).toBeNull()
  })

  it('rejects a cookie whose payload was tampered while keeping the original signature', () => {
    const cookie = signImpersonationCookie('admin-123', 'expl-cameron', NAME)
    const dot = cookie.lastIndexOf('.')
    const sig = cookie.slice(dot + 1)
    // Replace the payload with one targeting a DIFFERENT exploitant; the
    // original signature was computed over the original payload bytes, so
    // verification must fail.
    const fakePayload = JSON.stringify({
      adminUserId: 'admin-123',
      targetExploitantId: 'expl-attacker-target',
      targetName: 'attacker',
      exp: Date.now() + IMPERSONATION_TTL_MS,
    })
    const tampered = `${Buffer.from(fakePayload).toString('base64url')}.${sig}`
    expect(verifyImpersonationCookie(tampered)).toBeNull()
  })

  it('rejects a cookie whose payload is not valid JSON', () => {
    // Simulate a cookie where the encoded payload decodes to non-JSON. We
    // sign the malformed payload so the signature itself is valid — only
    // the JSON.parse step should fail.
    const fakePayload = 'not-json'
    const encoded = Buffer.from(fakePayload).toString('base64url')
    // Sign the malformed payload with the same secret so the signature is
    // valid — only the JSON.parse step inside verify should fail.
    const sig = createHmac('sha256', process.env.BETTER_AUTH_SECRET!)
      .update(encoded)
      .digest('base64url')
    const cookie = `${encoded}.${sig}`
    expect(verifyImpersonationCookie(cookie)).toBeNull()
  })

  it('rejects an expired cookie', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'))
    const cookie = signImpersonationCookie('admin-123', 'expl-cameron', NAME)

    // Move the clock past the TTL.
    vi.setSystemTime(new Date(Date.now() + IMPERSONATION_TTL_MS + 1))
    expect(verifyImpersonationCookie(cookie)).toBeNull()
  })
})
