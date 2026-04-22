import { Pool } from 'pg'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { hashPassword } from 'better-auth/crypto'

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Create a dedicated PrismaClient for E2E test helpers.
 * Never reuses the app's basePrisma singleton.
 * Mirrors the SSL logic from lib/db/base.ts for remote connections.
 */
function createTestClient(): PrismaClient {
  const connectionString =
    process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'
  const isRemote =
    !connectionString.includes('127.0.0.1') && !connectionString.includes('localhost')
  const pool = new Pool({
    connectionString,
    ssl: isRemote ? { rejectUnauthorized: false } : false,
  })
  const adapter = new PrismaPg(pool)
  return new PrismaClient({ adapter })
}

// ---------------------------------------------------------------------------
// Exported helpers
// ---------------------------------------------------------------------------

/**
 * Ensure the seed data required by E2E tests is present in the database.
 * Uses upsert so it is idempotent -- safe to call even when data already exists.
 *
 * Mirrors the minimal subset of prisma/seed.ts needed for auth E2E tests:
 *  - Cameron Balloons France (FR.DEC.059)
 *  - olivier@cameronfrance.com (GERANT) with password credential
 *  - dcuenot@calpax.fr (ADMIN_CALPAX) with password credential
 */
export async function ensureSeedData(): Promise<void> {
  const prisma = createTestClient()
  const defaultPassword = process.env.SEED_DEFAULT_PASSWORD ?? 'Calpax-2026-Demo!'
  const hashedPw = await hashPassword(defaultPassword)

  try {
    const cameronBalloons = await prisma.exploitant.upsert({
      where: { frDecNumber: 'FR.DEC.059' },
      update: {},
      create: {
        name: 'Cameron Balloons France',
        frDecNumber: 'FR.DEC.059',
      },
    })

    const calpaxSas = await prisma.exploitant.upsert({
      where: { frDecNumber: 'INTERNAL.CALPAX' },
      update: {},
      create: {
        name: 'Calpax SAS',
        frDecNumber: 'INTERNAL.CALPAX',
      },
    })

    const ownerUser = await prisma.user.upsert({
      where: { email: 'olivier@cameronfrance.com' },
      update: {},
      create: {
        email: 'olivier@cameronfrance.com',
        name: 'Olivier Cuenot',
        role: 'GERANT',
        exploitantId: cameronBalloons.id,
      },
    })

    // Ensure credential account exists for owner
    const existingOwnerAccount = await prisma.account.findFirst({
      where: { userId: ownerUser.id, providerId: 'credential' },
    })
    if (!existingOwnerAccount) {
      await prisma.account.create({
        data: {
          userId: ownerUser.id,
          accountId: ownerUser.id,
          providerId: 'credential',
          password: hashedPw,
        },
      })
    }

    const adminUser = await prisma.user.upsert({
      where: { email: 'dcuenot@calpax.fr' },
      update: {},
      create: {
        email: 'dcuenot@calpax.fr',
        name: 'Damien Cuenot',
        role: 'ADMIN_CALPAX',
        exploitantId: calpaxSas.id,
      },
    })

    // Ensure credential account exists for admin
    const existingAdminAccount = await prisma.account.findFirst({
      where: { userId: adminUser.id, providerId: 'credential' },
    })
    if (!existingAdminAccount) {
      await prisma.account.create({
        data: {
          userId: adminUser.id,
          accountId: adminUser.id,
          providerId: 'credential',
          password: hashedPw,
        },
      })
    }

    // PILOTE + EQUIPIER users in Cameron Balloons (needed for RBAC E2E coverage).
    // Only the user rows and credential accounts are seeded — the associated
    // Pilote/Equipier entities aren't required for route-access tests.
    const extraUsers = [
      {
        email: 'pilote@cameronfrance.com',
        name: 'Pilote Test',
        role: 'PILOTE' as const,
      },
      {
        email: 'equipier@cameronfrance.com',
        name: 'Equipier Test',
        role: 'EQUIPIER' as const,
      },
    ]

    for (const u of extraUsers) {
      const user = await prisma.user.upsert({
        where: { email: u.email },
        update: {},
        create: {
          email: u.email,
          name: u.name,
          role: u.role,
          exploitantId: cameronBalloons.id,
        },
      })
      const existing = await prisma.account.findFirst({
        where: { userId: user.id, providerId: 'credential' },
      })
      if (!existing) {
        await prisma.account.create({
          data: {
            userId: user.id,
            accountId: user.id,
            providerId: 'credential',
            password: hashedPw,
          },
        })
      }
    }
  } finally {
    await prisma.$disconnect()
  }
}

/**
 * Sign in via the Better Auth API and return the session cookie value.
 * Useful for E2E tests that need an authenticated session without going
 * through the UI login flow.
 *
 * @param email     The email to sign in with
 * @param password  The password (defaults to seed password)
 * @param baseUrl   The base URL of the running dev server
 * @returns The session cookie string to attach to subsequent requests
 */
export async function getAuthCookie(
  email: string,
  password: string = 'Calpax-2026-Demo!',
  baseUrl: string = 'http://localhost:3000',
): Promise<string> {
  const response = await fetch(`${baseUrl}/api/auth/sign-in/email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
    redirect: 'manual',
  })

  const setCookie = response.headers.get('set-cookie')
  if (!setCookie) {
    throw new Error(`Failed to get auth cookie for ${email}: ${response.status}`)
  }

  return setCookie
}
