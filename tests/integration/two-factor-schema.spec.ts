/**
 * Two-factor schema wiring — minimal integration test covering the pieces
 * that tsc + lint can't validate:
 *
 *  - the `two_factor` migration ran cleanly in CI (row can be written)
 *  - Better Auth's expected columns exist with the expected types
 *  - the User relation is properly cascaded (deleting a user nukes the
 *    related TwoFactor row, so we don't leak stale secrets)
 *  - `user.twoFactorEnabled` column exists and defaults to false
 *
 * The full signin / setup flow needs a real TOTP-producing client and is
 * validated manually before release (see PR test plan).
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { basePrisma } from '@/lib/db/base'
import { resetDb, seedTenant } from './helpers'

describe('two-factor schema', () => {
  beforeEach(async () => {
    await resetDb()
  })

  it('persists and returns a TwoFactor row with all plugin fields', async () => {
    const T = await seedTenant('2FA_ROW')

    const row = await basePrisma.twoFactor.create({
      data: {
        userId: T.userId,
        secret: 'ciphertext-placeholder',
        backupCodes: 'ciphertext-placeholder-array',
        verified: true,
      },
    })

    expect(row.id).toBeTruthy()
    expect(row.userId).toBe(T.userId)
    expect(row.secret).toBe('ciphertext-placeholder')
    expect(row.backupCodes).toBe('ciphertext-placeholder-array')
    expect(row.verified).toBe(true)
  })

  it('enforces userId uniqueness — one 2FA row per user', async () => {
    const T = await seedTenant('2FA_UNIQ')
    await basePrisma.twoFactor.create({
      data: { userId: T.userId, secret: 's', backupCodes: 'b' },
    })

    await expect(
      basePrisma.twoFactor.create({
        data: { userId: T.userId, secret: 's2', backupCodes: 'b2' },
      }),
    ).rejects.toThrow()
  })

  it('cascades delete: deleting a user removes the TwoFactor row (no stale secret)', async () => {
    const T = await seedTenant('2FA_CASCADE')
    await basePrisma.twoFactor.create({
      data: { userId: T.userId, secret: 's', backupCodes: 'b' },
    })

    await basePrisma.user.delete({ where: { id: T.userId } })

    const orphan = await basePrisma.twoFactor.findUnique({ where: { userId: T.userId } })
    expect(orphan).toBeNull()
  })

  it('User.twoFactorEnabled defaults to false for newly seeded users', async () => {
    const T = await seedTenant('2FA_FLAG')
    const user = await basePrisma.user.findUniqueOrThrow({ where: { id: T.userId } })
    expect(user.twoFactorEnabled).toBe(false)
  })
})
