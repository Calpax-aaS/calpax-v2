/**
 * #4 — one-off backfill: encrypt plaintext `email` / `telephone` on existing
 * Passager rows into the new `emailEncrypted` / `telephoneEncrypted`
 * columns added by migration `20260422140000_passager_pii_encrypted_columns`.
 *
 * Safe to re-run: rows already having the encrypted value are skipped.
 *
 * Usage (against prod Supabase):
 *   DATABASE_URL=... ENCRYPTION_KEY=... pnpm tsx scripts/backfill-passager-pii.ts
 *
 * After this script completes and the result is verified, a follow-up
 * migration will drop the plaintext columns.
 */
import { Pool } from 'pg'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { encrypt } from '../lib/crypto'

async function main() {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error('DATABASE_URL is required')
  }
  if (!process.env.ENCRYPTION_KEY) {
    throw new Error('ENCRYPTION_KEY is required')
  }

  const isRemote =
    !connectionString.includes('127.0.0.1') && !connectionString.includes('localhost')
  const pool = new Pool({
    connectionString,
    ssl: isRemote ? { rejectUnauthorized: false } : false,
  })
  const adapter = new PrismaPg(pool)
  const prisma = new PrismaClient({ adapter })

  try {
    const candidates = await prisma.passager.findMany({
      where: {
        OR: [
          { AND: [{ email: { not: null } }, { emailEncrypted: null }] },
          { AND: [{ telephone: { not: null } }, { telephoneEncrypted: null }] },
        ],
      },
      select: {
        id: true,
        email: true,
        telephone: true,
        emailEncrypted: true,
        telephoneEncrypted: true,
      },
    })

    console.log(`found ${candidates.length} passager rows needing backfill`)
    let updated = 0
    for (const p of candidates) {
      const patch: {
        emailEncrypted?: string
        telephoneEncrypted?: string
      } = {}
      if (p.email && !p.emailEncrypted) patch.emailEncrypted = encrypt(p.email)
      if (p.telephone && !p.telephoneEncrypted) patch.telephoneEncrypted = encrypt(p.telephone)
      if (Object.keys(patch).length === 0) continue

      await prisma.passager.update({ where: { id: p.id }, data: patch })
      updated += 1
    }
    console.log(`encrypted ${updated} rows`)
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
