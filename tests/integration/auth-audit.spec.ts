import { describe, it, expect, beforeEach } from 'vitest'
import { AuditAction } from '@prisma/client'
import { basePrisma } from '@/lib/db/base'
import {
  LOCKOUT_POLICY,
  clearFailedAttempts,
  countRecentFailedAttempts,
  getActiveLock,
  recordFailedAttempt,
  writeAuthAudit,
} from '@/lib/auth/audit'
import { resetDb, seedTenant } from './helpers'

describe('auth audit + lockout', () => {
  beforeEach(async () => {
    await resetDb()
  })

  describe('writeAuthAudit', () => {
    it('writes an AUTH-typed audit row with provided metadata', async () => {
      const tenant = await seedTenant('Z')
      await writeAuthAudit({
        action: AuditAction.SIGN_IN,
        userId: tenant.userId,
        exploitantId: tenant.exploitantId,
        email: 'user-Z@test.local',
        ipAddress: '127.0.0.1',
        userAgent: 'vitest',
        extra: { path: '/sign-in/email' },
      })
      const rows = await basePrisma.auditLog.findMany({
        where: { entityType: 'AUTH', userId: tenant.userId },
      })
      expect(rows).toHaveLength(1)
      expect(rows[0]?.action).toBe(AuditAction.SIGN_IN)
      expect(rows[0]?.entityId).toBe(tenant.userId)
      expect(rows[0]?.exploitantId).toBe(tenant.exploitantId)
      const after = rows[0]?.afterValue as Record<string, unknown>
      expect(after.email).toBe('user-Z@test.local')
      expect(after.ipAddress).toBe('127.0.0.1')
    })

    it('falls back to the email as entityId when no userId is provided', async () => {
      await writeAuthAudit({
        action: AuditAction.SIGN_IN_FAILED,
        email: 'unknown@test.local',
        ipAddress: '10.0.0.1',
      })
      const rows = await basePrisma.auditLog.findMany({
        where: { entityType: 'AUTH', action: AuditAction.SIGN_IN_FAILED },
      })
      expect(rows).toHaveLength(1)
      expect(rows[0]?.entityId).toBe('unknown@test.local')
      expect(rows[0]?.userId).toBeNull()
      expect(rows[0]?.exploitantId).toBeNull()
    })
  })

  describe('lockout counter', () => {
    it('returns zero before any attempt and increments per recorded attempt', async () => {
      const email = 'brute@test.local'
      expect(await countRecentFailedAttempts(email)).toBe(0)
      await recordFailedAttempt({ email, ipAddress: '1.1.1.1', userAgent: null })
      await recordFailedAttempt({ email, ipAddress: '1.1.1.1', userAgent: null })
      expect(await countRecentFailedAttempts(email)).toBe(2)
    })

    it('does not lock before maxAttempts is reached', async () => {
      const tenant = await seedTenant('B')
      const email = 'user-B@test.local'
      for (let i = 0; i < LOCKOUT_POLICY.maxAttempts - 1; i++) {
        const result = await recordFailedAttempt({
          email,
          ipAddress: '1.1.1.1',
          userAgent: null,
        })
        expect(result.lockedUntil).toBeNull()
      }
      const user = await basePrisma.user.findUnique({ where: { id: tenant.userId } })
      expect(user?.lockedUntil).toBeNull()
    })

    it('locks the user when maxAttempts is reached', async () => {
      const tenant = await seedTenant('C')
      const email = 'user-C@test.local'
      let finalLock: Date | null = null
      for (let i = 0; i < LOCKOUT_POLICY.maxAttempts; i++) {
        const result = await recordFailedAttempt({
          email,
          ipAddress: '1.1.1.1',
          userAgent: null,
        })
        finalLock = result.lockedUntil
      }
      expect(finalLock).not.toBeNull()
      const user = await basePrisma.user.findUnique({ where: { id: tenant.userId } })
      expect(user?.lockedUntil).not.toBeNull()
      const lockWindow = user!.lockedUntil!.getTime() - Date.now()
      // Lock must still be in the future and roughly match the policy.
      expect(lockWindow).toBeGreaterThan(LOCKOUT_POLICY.lockMs / 2)
    })

    it('clearFailedAttempts removes all rows for the email', async () => {
      const email = 'clear@test.local'
      await recordFailedAttempt({ email, ipAddress: null, userAgent: null })
      await recordFailedAttempt({ email, ipAddress: null, userAgent: null })
      expect(await countRecentFailedAttempts(email)).toBe(2)
      await clearFailedAttempts(email)
      expect(await countRecentFailedAttempts(email)).toBe(0)
    })
  })

  describe('getActiveLock', () => {
    it('returns null for an unlocked user', async () => {
      const tenant = await seedTenant('D')
      expect(await getActiveLock('user-D@test.local')).toBeNull()
      // No implicit lock row:
      const user = await basePrisma.user.findUnique({ where: { id: tenant.userId } })
      expect(user?.lockedUntil).toBeNull()
    })

    it('returns the lockedUntil date when the lock is still in the future', async () => {
      const tenant = await seedTenant('E')
      const future = new Date(Date.now() + 60_000)
      await basePrisma.user.update({
        where: { id: tenant.userId },
        data: { lockedUntil: future },
      })
      const active = await getActiveLock('user-E@test.local')
      expect(active?.getTime()).toBe(future.getTime())
    })

    it('clears a stale lock and returns null', async () => {
      const tenant = await seedTenant('F')
      const past = new Date(Date.now() - 60_000)
      await basePrisma.user.update({
        where: { id: tenant.userId },
        data: { lockedUntil: past },
      })
      expect(await getActiveLock('user-F@test.local')).toBeNull()
      const user = await basePrisma.user.findUnique({ where: { id: tenant.userId } })
      expect(user?.lockedUntil).toBeNull()
    })
  })
})
