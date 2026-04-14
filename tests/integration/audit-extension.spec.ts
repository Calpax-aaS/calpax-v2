import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '@/lib/db'
import { basePrisma } from '@/lib/db/base'
import { resetDb, seedTenant, asUser } from './helpers'

async function auditRowsFor(entityType: string, entityId: string) {
  return basePrisma.auditLog.findMany({
    where: { entityType, entityId },
    orderBy: { id: 'asc' },
  })
}

describe('audit extension', () => {
  beforeEach(async () => {
    await resetDb()
  })

  it('CREATE writes a row-level audit entry with afterValue', async () => {
    const A = await seedTenant('A')
    const created = await asUser(A, 'GERANT', async () =>
      db.user.create({
        data: { email: 'created@test.local', name: 'New', exploitantId: A.exploitantId },
      }),
    )
    const rows = await auditRowsFor('User', created.id)
    expect(rows).toHaveLength(1)
    expect(rows[0]?.action).toBe('CREATE')
    expect(rows[0]?.field).toBeNull()
    const afterVal = rows[0]?.afterValue as Record<string, unknown> | null
    expect(afterVal?.['email']).toBe('[REDACTED]')
    expect(afterVal?.['name']).toBe('New')
    expect(rows[0]?.userId).toBe(A.userId)
    expect(rows[0]?.exploitantId).toBe(A.exploitantId)
  })

  it('UPDATE writes one row per changed field with before/after', async () => {
    const A = await seedTenant('A')
    await asUser(A, 'GERANT', async () => {
      await db.user.update({ where: { id: A.userId }, data: { name: 'Changed Name' } })
    })
    const rows = await auditRowsFor('User', A.userId)
    const updateRows = rows.filter((r) => r.action === 'UPDATE')
    expect(updateRows.length).toBeGreaterThanOrEqual(1)
    const nameRow = updateRows.find((r) => r.field === 'name')
    expect(nameRow).toBeDefined()
    expect(nameRow?.beforeValue).toBe('User A')
    expect(nameRow?.afterValue).toBe('Changed Name')
  })

  it('DELETE writes a row-level audit entry with beforeValue', async () => {
    const A = await seedTenant('A')
    const deletable = await asUser(A, 'GERANT', async () =>
      db.user.create({
        data: { email: 'deletable@test.local', name: 'Del', exploitantId: A.exploitantId },
      }),
    )
    await asUser(A, 'GERANT', async () => {
      await db.user.delete({ where: { id: deletable.id } })
    })
    const rows = await auditRowsFor('User', deletable.id)
    const delRow = rows.find((r) => r.action === 'DELETE')
    expect(delRow).toBeDefined()
    expect(delRow?.field).toBeNull()
    const beforeVal = delRow?.beforeValue as Record<string, unknown> | null
    expect(beforeVal?.['email']).toBe('[REDACTED]')
  })

  it('impersonation writes impersonatedBy on audit rows', async () => {
    const admin = await seedTenant('ADMIN')
    const tenant = await seedTenant('T')
    await asUser(
      { exploitantId: tenant.exploitantId, userId: admin.userId },
      'ADMIN_CALPAX',
      async () => {
        await db.user.update({ where: { id: tenant.userId }, data: { name: 'Renamed by admin' } })
      },
      { impersonatedBy: admin.userId },
    )
    const rows = await auditRowsFor('User', tenant.userId)
    const updateRow = rows.find((r) => r.action === 'UPDATE' && r.field === 'name')
    expect(updateRow?.impersonatedBy).toBe(admin.userId)
    expect(updateRow?.exploitantId).toBe(tenant.exploitantId)
  })

  it('writes to AuditLog itself are NOT re-audited', async () => {
    const A = await seedTenant('A')
    const before = await basePrisma.auditLog.count()
    await basePrisma.auditLog.create({
      data: {
        exploitantId: A.exploitantId,
        userId: A.userId,
        entityType: 'Test',
        entityId: 'manual',
        action: 'CREATE',
        afterValue: { hi: 'there' },
      },
    })
    const after = await basePrisma.auditLog.count()
    expect(after).toBe(before + 1)
  })
})
