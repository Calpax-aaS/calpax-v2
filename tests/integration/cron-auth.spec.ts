/**
 * Cron endpoint guard — verifies `verifyCronRequest` from `lib/auth/cron.ts`.
 *
 * Covers:
 *  - Bearer secret accepted / rejected (constant-time compare)
 *  - Missing CRON_SECRET env → 500
 *  - Cooldown enforcement (429 within the window, 200 after)
 *  - The `cron_invocation` row is only upserted on accept (failed calls don't
 *    slide the cooldown window in an attacker's favour)
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { basePrisma } from '@/lib/db/base'
import { verifyCronRequest } from '@/lib/auth/cron'

const SECRET = 'test-secret-cron-xyz'

function makeRequest(authHeader?: string): Request {
  const headers: Record<string, string> = {}
  if (authHeader !== undefined) headers['Authorization'] = authHeader
  return new Request('http://localhost/api/cron/test', { headers })
}

describe('verifyCronRequest', () => {
  const originalSecret = process.env.CRON_SECRET

  beforeEach(async () => {
    process.env.CRON_SECRET = SECRET
    await basePrisma.cronInvocation.deleteMany({})
  })

  afterEach(() => {
    if (originalSecret === undefined) delete process.env.CRON_SECRET
    else process.env.CRON_SECRET = originalSecret
  })

  it('accepts a valid Bearer token on first call and records the invocation', async () => {
    const result = await verifyCronRequest(makeRequest(`Bearer ${SECRET}`), 'test-endpoint', {
      minIntervalMs: 1000,
    })
    expect(result.ok).toBe(true)

    const row = await basePrisma.cronInvocation.findUnique({ where: { endpoint: 'test-endpoint' } })
    expect(row).not.toBeNull()
  })

  it('rejects a missing Authorization header with 401 and does NOT record', async () => {
    const result = await verifyCronRequest(makeRequest(), 'test-endpoint-missing', {
      minIntervalMs: 1000,
    })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.response.status).toBe(401)
    }

    // No row written — rejected calls must not advance the cooldown clock.
    const row = await basePrisma.cronInvocation.findUnique({
      where: { endpoint: 'test-endpoint-missing' },
    })
    expect(row).toBeNull()
  })

  it('rejects a wrong Bearer token with 401', async () => {
    const result = await verifyCronRequest(
      makeRequest('Bearer wrong-secret'),
      'test-endpoint-wrong',
      { minIntervalMs: 1000 },
    )
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.response.status).toBe(401)
  })

  it('rejects a malformed Authorization header with 401 (same length, different bytes)', async () => {
    // Same byte length as `Bearer ${SECRET}` to exercise the timing-safe path.
    const malformed = `Bearer ${'x'.repeat(SECRET.length)}`
    expect(malformed.length).toBe(`Bearer ${SECRET}`.length)
    const result = await verifyCronRequest(makeRequest(malformed), 'test-endpoint-malformed', {
      minIntervalMs: 1000,
    })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.response.status).toBe(401)
  })

  it('returns 500 when CRON_SECRET is not configured', async () => {
    delete process.env.CRON_SECRET
    const result = await verifyCronRequest(makeRequest('Bearer anything'), 'test-no-secret', {
      minIntervalMs: 1000,
    })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.response.status).toBe(500)
  })

  it('rejects a second call within the cooldown window with 429 and Retry-After', async () => {
    const cooldownMs = 60_000
    // First call — accepted, records lastInvokedAt = now.
    const ok1 = await verifyCronRequest(makeRequest(`Bearer ${SECRET}`), 'test-cooldown', {
      minIntervalMs: cooldownMs,
    })
    expect(ok1.ok).toBe(true)

    // Second call — immediately after, must be rate-limited.
    const ok2 = await verifyCronRequest(makeRequest(`Bearer ${SECRET}`), 'test-cooldown', {
      minIntervalMs: cooldownMs,
    })
    expect(ok2.ok).toBe(false)
    if (!ok2.ok) {
      expect(ok2.response.status).toBe(429)
      const retryAfter = ok2.response.headers.get('Retry-After')
      expect(retryAfter).not.toBeNull()
      expect(Number(retryAfter)).toBeGreaterThan(0)
    }
  })

  it('accepts a second call after the cooldown has elapsed', async () => {
    // Simulate: the previous invocation happened well before the cooldown
    // window — we seed the row with a lastInvokedAt far in the past.
    await basePrisma.cronInvocation.create({
      data: {
        endpoint: 'test-past-cooldown',
        lastInvokedAt: new Date(Date.now() - 10 * 60 * 1000),
      },
    })

    const result = await verifyCronRequest(makeRequest(`Bearer ${SECRET}`), 'test-past-cooldown', {
      minIntervalMs: 60_000, // 1 min — already elapsed
    })
    expect(result.ok).toBe(true)

    // The row's lastInvokedAt was refreshed.
    const row = await basePrisma.cronInvocation.findUniqueOrThrow({
      where: { endpoint: 'test-past-cooldown' },
    })
    expect(Date.now() - row.lastInvokedAt.getTime()).toBeLessThan(5_000)
  })

  it('rate-limited calls do NOT refresh the lastInvokedAt timestamp', async () => {
    const endpoint = 'test-no-refresh-on-reject'
    await basePrisma.cronInvocation.create({
      data: { endpoint, lastInvokedAt: new Date(Date.now() - 100) },
    })
    const before = await basePrisma.cronInvocation.findUniqueOrThrow({ where: { endpoint } })

    // Hammer with the valid secret but within the cooldown window.
    for (let i = 0; i < 3; i++) {
      const r = await verifyCronRequest(makeRequest(`Bearer ${SECRET}`), endpoint, {
        minIntervalMs: 60_000,
      })
      expect(r.ok).toBe(false)
    }

    const after = await basePrisma.cronInvocation.findUniqueOrThrow({ where: { endpoint } })
    expect(after.lastInvokedAt.getTime()).toBe(before.lastInvokedAt.getTime())
  })
})
