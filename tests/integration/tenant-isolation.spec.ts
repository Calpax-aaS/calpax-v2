import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '@/lib/db'
import { basePrisma } from '@/lib/db/base'
import { impersonate } from '@/lib/admin/impersonate'
import { resetDb, seedTenant, asUser } from './helpers'

/**
 * Helper that casts the db client to unknown to call create without exploitantId
 * in the data shape. The tenant extension injects exploitantId at runtime.
 * We verify the injection by reading from basePrisma after the create.
 */
function dbUnchecked(client: unknown) {
  return client as {
    user: {
      create: (args: {
        data: Record<string, unknown>
      }) => Promise<{ id: string; exploitantId: string }>
    }
  }
}

describe('tenant isolation', () => {
  beforeEach(async () => {
    await resetDb()
  })

  it('findMany returns only the current tenant rows', async () => {
    const A = await seedTenant('A')
    await seedTenant('B')
    const users = await asUser(A, 'GERANT', async () => db.user.findMany())
    expect(users.map((u) => u.email)).toContain('user-A@test.local')
    expect(users.map((u) => u.email)).not.toContain('user-B@test.local')
    expect(users).toHaveLength(1)
  })

  it('create throws on explicit cross-tenant exploitantId', async () => {
    const A = await seedTenant('A')
    const B = await seedTenant('B')
    await expect(
      asUser(A, 'GERANT', async () =>
        db.user.create({
          data: { email: 'hacker@test.local', name: 'Hacker', exploitantId: B.exploitantId },
        }),
      ),
    ).rejects.toThrow(/does not match current context/)
  })

  it('create injects exploitantId when omitted', async () => {
    const A = await seedTenant('A')
    // The tenant extension injects exploitantId at runtime.
    // dbUnchecked bypasses the Prisma type constraint so we can omit it in data.
    const created = await asUser(A, 'GERANT', async () =>
      dbUnchecked(db).user.create({ data: { email: 'new@test.local', name: 'New User' } }),
    )
    // Verify via basePrisma that the row was actually written with the correct exploitantId
    const row = await basePrisma.user.findUnique({ where: { id: created.id } })
    expect(row?.exploitantId).toBe(A.exploitantId)
  })

  it('throws when called outside request context', async () => {
    await seedTenant('A')
    await expect(db.user.findMany()).rejects.toThrow(/outside request context/)
  })

  it('exploitant.findFirst returns only the current tenant', async () => {
    const A = await seedTenant('A')
    await seedTenant('B')
    const exp = await asUser(A, 'GERANT', async () => db.exploitant.findFirst())
    expect(exp?.frDecNumber).toBe('FR.DEC.A')
  })

  it('findUnique on a cross-tenant id returns null (post-filter)', async () => {
    const A = await seedTenant('A')
    const B = await seedTenant('B')
    const result = await asUser(A, 'GERANT', async () =>
      db.user.findUnique({ where: { id: B.userId } }),
    )
    expect(result).toBeNull()
  })

  it('findUnique with select omitting exploitantId still returns own-tenant row (TD-009)', async () => {
    const A = await seedTenant('A')
    // Select that does NOT include exploitantId. Before TD-009 fix, post-filter
    // received result.exploitantId === undefined and returned null silently.
    const result = await asUser(A, 'GERANT', async () =>
      db.user.findUnique({
        where: { id: A.userId },
        select: { id: true, email: true },
      }),
    )
    expect(result).not.toBeNull()
    expect(result?.email).toBe('user-A@test.local')
  })

  it('findUnique with select omitting exploitantId still rejects cross-tenant row (TD-009)', async () => {
    const A = await seedTenant('A')
    const B = await seedTenant('B')
    const result = await asUser(A, 'GERANT', async () =>
      db.user.findUnique({
        where: { id: B.userId },
        select: { id: true, email: true },
      }),
    )
    expect(result).toBeNull()
  })

  it('findUniqueOrThrow with select omitting exploitantId returns own-tenant row (TD-009)', async () => {
    const A = await seedTenant('A')
    const result = await asUser(A, 'GERANT', async () =>
      db.user.findUniqueOrThrow({
        where: { id: A.userId },
        select: { id: true, email: true },
      }),
    )
    expect(result.email).toBe('user-A@test.local')
  })
})

describe('impersonate helper', () => {
  beforeEach(async () => {
    await resetDb()
  })

  it('runs fn inside target tenant context', async () => {
    const admin = await seedTenant('ADMIN')
    const tenant = await seedTenant('T')
    const result = await asUser(admin, 'ADMIN_CALPAX', async () => {
      return impersonate(tenant.exploitantId, async () => db.user.findMany())
    })
    const emails = result.map((u) => u.email)
    expect(emails).toContain('user-T@test.local')
    expect(emails).not.toContain('user-ADMIN@test.local')
  })

  it('refuses to impersonate if caller is not ADMIN_CALPAX', async () => {
    const caller = await seedTenant('CALLER')
    const tenant = await seedTenant('T')
    await expect(
      asUser(caller, 'GERANT', async () =>
        impersonate(tenant.exploitantId, async () => db.user.findMany()),
      ),
    ).rejects.toThrow(/ADMIN_CALPAX/)
  })
})
