import { describe, it, expect, beforeEach } from 'vitest'
import { basePrisma } from '@/lib/db/base'
import { resetDb, seedTenant } from './helpers'

describe('user ban fields (TD-034)', () => {
  beforeEach(async () => {
    await resetDb()
  })

  it('banned defaults to false for new users', async () => {
    const tenant = await seedTenant('A')
    const user = await basePrisma.user.findUniqueOrThrow({ where: { id: tenant.userId } })
    expect(user.banned).toBe(false)
    expect(user.banReason).toBeNull()
    expect(user.banExpires).toBeNull()
  })

  it('can mark a user as banned with reason and expiry', async () => {
    const tenant = await seedTenant('A')
    const expires = new Date(Date.now() + 1000 * 60 * 60 * 24)
    await basePrisma.user.update({
      where: { id: tenant.userId },
      data: { banned: true, banReason: 'Test', banExpires: expires },
    })
    const user = await basePrisma.user.findUniqueOrThrow({ where: { id: tenant.userId } })
    expect(user.banned).toBe(true)
    expect(user.banReason).toBe('Test')
    expect(user.banExpires?.getTime()).toBe(expires.getTime())
  })

  it('permanent ban has null banExpires', async () => {
    const tenant = await seedTenant('A')
    await basePrisma.user.update({
      where: { id: tenant.userId },
      data: { banned: true, banReason: 'Permanent', banExpires: null },
    })
    const user = await basePrisma.user.findUniqueOrThrow({ where: { id: tenant.userId } })
    expect(user.banned).toBe(true)
    expect(user.banExpires).toBeNull()
  })
})
