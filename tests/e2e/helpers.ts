import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Create a dedicated PrismaClient for E2E test helpers.
 * Never reuses the app's basePrisma singleton.
 */
function createTestClient(): PrismaClient {
  const connectionString =
    process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'
  const adapter = new PrismaPg({ connectionString })
  return new PrismaClient({ adapter })
}

/**
 * SHA-256 hash as hex string — mirrors the algorithm used by @auth/core's
 * createHash utility (lib/utils/web.js).
 */
async function sha256hex(message: string): Promise<string> {
  const data = new TextEncoder().encode(message)
  const hash = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

/**
 * Insert a VerificationToken directly into the database and return the
 * callback URL that Auth.js expects.
 *
 * Auth.js stores SHA-256(rawToken + secret) in the DB and passes the raw
 * token in the callback URL.  By writing the row ourselves we bypass the
 * Resend email-send step entirely, which means the test works even when
 * RESEND_API_KEY is not set.
 *
 * @param email     The identifier / email to sign in as.
 * @param baseUrl   The base URL of the running dev server (e.g. http://localhost:3000).
 * @param secret    AUTH_SECRET — must match what the app uses at runtime.
 * @param ttlMs     How long the token should be valid (default 10 minutes).
 */
export async function createMagicLink(
  email: string,
  baseUrl: string,
  secret: string,
  ttlMs = 10 * 60 * 1000,
): Promise<string> {
  const prisma = createTestClient()
  try {
    // Clean up any stale tokens for this email first
    await prisma.verificationToken.deleteMany({ where: { identifier: email } })

    // Generate a random 32-byte hex token (same algorithm as Auth.js randomString)
    const rawTokenBytes = new Uint8Array(32)
    crypto.getRandomValues(rawTokenBytes)
    const rawToken = Array.from(rawTokenBytes)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')

    // Hash the token exactly as Auth.js does before storing
    const hashedToken = await sha256hex(`${rawToken}${secret}`)

    const expires = new Date(Date.now() + ttlMs)

    await prisma.verificationToken.create({
      data: {
        identifier: email,
        token: hashedToken,
        expires,
      },
    })

    // Auth.js callback URL — provider id is 'resend', params are callbackUrl + token + email
    const params = new URLSearchParams({
      callbackUrl: `${baseUrl}/fr`,
      token: rawToken,
      email,
    })
    return `${baseUrl}/api/auth/callback/resend?${params.toString()}`
  } finally {
    await prisma.$disconnect()
  }
}

// ---------------------------------------------------------------------------
// Exported helpers
// ---------------------------------------------------------------------------

/**
 * Ensure the seed data required by E2E tests is present in the database.
 * Uses upsert so it is idempotent — safe to call even when data already exists.
 *
 * Mirrors the minimal subset of prisma/seed.ts needed for auth E2E tests:
 *  - Cameron Balloons France (FR.DEC.059)
 *  - olivier@cameronfrance.com (GERANT)
 */
export async function ensureSeedData(): Promise<void> {
  const prisma = createTestClient()
  try {
    const cameronBalloons = await prisma.exploitant.upsert({
      where: { frDecNumber: 'FR.DEC.059' },
      update: {},
      create: {
        name: 'Cameron Balloons France',
        frDecNumber: 'FR.DEC.059',
      },
    })

    // Calpax SAS for the admin account
    const calpaxSas = await prisma.exploitant.upsert({
      where: { frDecNumber: 'INTERNAL.CALPAX' },
      update: {},
      create: {
        name: 'Calpax SAS',
        frDecNumber: 'INTERNAL.CALPAX',
      },
    })

    await prisma.user.upsert({
      where: { email: 'olivier@cameronfrance.com' },
      update: {},
      create: {
        email: 'olivier@cameronfrance.com',
        name: 'Olivier Cuenot',
        role: 'GERANT',
        exploitantId: cameronBalloons.id,
      },
    })

    await prisma.user.upsert({
      where: { email: 'damien@calpax.fr' },
      update: {},
      create: {
        email: 'damien@calpax.fr',
        name: 'Damien Cuenot',
        role: 'ADMIN_CALPAX',
        exploitantId: calpaxSas.id,
      },
    })
  } finally {
    await prisma.$disconnect()
  }
}

/**
 * Poll the VerificationToken table until a token for `email` appears, then
 * reconstruct the callback URL from the stored (hashed) token.
 *
 * NOTE: This approach only works when Auth.js successfully creates the token
 * (i.e., RESEND_API_KEY is set so the email send doesn't throw before the
 * DB write completes).  Prefer `createMagicLink` for local dev.
 */
export async function waitForMagicLink(
  email: string,
  baseUrl: string,
  timeoutMs = 10_000,
): Promise<string> {
  const prisma = createTestClient()
  try {
    const start = Date.now()
    while (Date.now() - start < timeoutMs) {
      const row = await prisma.verificationToken.findFirst({
        where: { identifier: email },
        orderBy: { expires: 'desc' },
      })
      if (row) {
        const params = new URLSearchParams({ token: row.token, email })
        return `${baseUrl}/api/auth/callback/resend?${params.toString()}`
      }
      await new Promise((r) => setTimeout(r, 250))
    }
    throw new Error(`no VerificationToken for ${email} within ${timeoutMs}ms`)
  } finally {
    await prisma.$disconnect()
  }
}
