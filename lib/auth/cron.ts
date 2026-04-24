import { timingSafeEqual } from 'node:crypto'
import { basePrisma } from '@/lib/db/base'
import { logger } from '@/lib/logger'

/**
 * Cron endpoint guard used by every `app/api/cron/*` route handler.
 *
 * Two layers of protection stacked on top of the Bearer-secret check:
 *
 * 1. **Timing-safe secret comparison** — replaces the naive `!==` check so
 *    a leaked-secret probe can't observe a timing side channel.
 * 2. **Per-endpoint cooldown** — one row per endpoint in `cron_invocation`,
 *    upserted on accept. If a caller hits the endpoint again before
 *    `minIntervalMs` has elapsed, we return 429. This caps the blast radius
 *    of a leaked `CRON_SECRET` without breaking Vercel's normal cadence.
 *
 * Usage inside a route handler:
 *
 * ```ts
 * const guard = await verifyCronRequest(request, 'meteo-alert', { minIntervalMs: 25 * 60 * 1000 })
 * if (!guard.ok) return guard.response
 * ```
 */
export type CronGuardResult = { ok: true } | { ok: false; response: Response }

export async function verifyCronRequest(
  request: Request,
  endpoint: string,
  opts: { minIntervalMs: number },
): Promise<CronGuardResult> {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    logger.error({ endpoint }, 'CRON_SECRET is not configured')
    return {
      ok: false,
      response: Response.json({ error: 'Server misconfiguration' }, { status: 500 }),
    }
  }

  // 1. Bearer secret — timing-safe compare.
  const authHeader = request.headers.get('Authorization') ?? ''
  const expected = `Bearer ${cronSecret}`
  if (!equalsConstantTime(authHeader, expected)) {
    logger.warn({ endpoint }, 'Unauthorized cron request: bad or missing Bearer token')
    return { ok: false, response: Response.json({ error: 'Unauthorized' }, { status: 401 }) }
  }

  // 2. Cooldown gate. Read the last invocation for this endpoint and reject
  //    anything too frequent. The write happens after the gate passes so a
  //    rejected probe doesn't reset the cooldown window in the attacker's
  //    favour.
  const now = new Date()
  const last = await basePrisma.cronInvocation.findUnique({ where: { endpoint } })
  if (last && now.getTime() - last.lastInvokedAt.getTime() < opts.minIntervalMs) {
    const retryAfterMs = opts.minIntervalMs - (now.getTime() - last.lastInvokedAt.getTime())
    logger.warn(
      { endpoint, sinceMs: now.getTime() - last.lastInvokedAt.getTime() },
      'Cron request rate-limited',
    )
    return {
      ok: false,
      response: Response.json(
        { error: 'Too Many Requests' },
        {
          status: 429,
          headers: { 'Retry-After': String(Math.ceil(retryAfterMs / 1000)) },
        },
      ),
    }
  }

  await basePrisma.cronInvocation.upsert({
    where: { endpoint },
    update: { lastInvokedAt: now },
    create: { endpoint, lastInvokedAt: now },
  })

  return { ok: true }
}

function equalsConstantTime(a: string, b: string): boolean {
  const aBuf = Buffer.from(a)
  const bBuf = Buffer.from(b)
  // `timingSafeEqual` throws when the buffers differ in length, so we short-
  // circuit. Still leaks the *length* of the secret, but not its content.
  if (aBuf.length !== bBuf.length) return false
  return timingSafeEqual(aBuf, bBuf)
}
