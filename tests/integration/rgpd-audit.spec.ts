/**
 * RGPD audit trail — verifies the explicit EXPORT_PII / ANONYMIZE_PII rows
 * emitted by `lib/actions/rgpd.ts`.
 *
 * The `audit-extension` ignores reads, so without the explicit `writeAudit`
 * call inside `exportPassagerData` an Art. 30 export would leave no trace.
 * The anonymisation UPDATE is already auto-captured, but we still emit an
 * explicit ANONYMIZE_PII row to make Art. 17 events queryable without
 * scanning every field-level UPDATE.
 *
 * `requireAuth` is mocked: the AsyncLocalStorage context is already set up
 * by `asUser` (see tests/integration/helpers.ts), so we skip the Better
 * Auth session lookup and invoke the callback in place. `requireRole` is
 * NOT mocked — the ForbiddenError branches are part of what we want to
 * cover.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'

vi.mock('@/lib/auth/requireAuth', () => ({
  requireAuth: async <T>(fn: () => Promise<T>): Promise<T> => fn(),
}))

import { basePrisma } from '@/lib/db/base'
import { encrypt } from '@/lib/crypto'
import { resetDb, seedTenant, asUser } from './helpers'
import { exportPassagerData, anonymisePassager } from '@/lib/actions/rgpd'

async function seedBilletPassager(exploitantId: string) {
  const billet = await basePrisma.billet.create({
    data: {
      exploitantId,
      reference: `REF-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      checksum: '0',
      payeurPrenom: 'Test',
      payeurNom: 'Payeur',
      montantTtc: 15000,
    },
  })
  const passager = await basePrisma.passager.create({
    data: {
      exploitantId,
      billetId: billet.id,
      prenom: 'Jean',
      nom: 'Dupont',
      email: 'jean.dupont@test.local',
      emailEncrypted: encrypt('jean.dupont@test.local'),
      poidsEncrypted: encrypt('78'),
    },
  })
  return { billet, passager }
}

async function rgpdRowsFor(passagerId: string, action: 'EXPORT_PII' | 'ANONYMIZE_PII') {
  return basePrisma.auditLog.findMany({
    where: { entityType: 'Passager', entityId: passagerId, action },
  })
}

describe('rgpd audit trail', () => {
  beforeEach(async () => {
    await resetDb()
  })

  it('exportPassagerData writes an EXPORT_PII row with actor metadata and no PII', async () => {
    const T = await seedTenant('EXPORT')
    const { passager } = await seedBilletPassager(T.exploitantId)

    const json = await asUser(T, 'GERANT', async () => exportPassagerData(passager.id))
    // Sanity: the export actually contains the decrypted email
    expect(JSON.parse(json).passager.email).toBe('jean.dupont@test.local')

    const rows = await rgpdRowsFor(passager.id, 'EXPORT_PII')
    expect(rows).toHaveLength(1)
    const row = rows[0]!
    expect(row.userId).toBe(T.userId)
    expect(row.exploitantId).toBe(T.exploitantId)
    expect(row.impersonatedBy).toBeNull()
    // No PII on the audit row itself — just the fact that the export happened.
    expect(row.field).toBeNull()
    expect(row.beforeValue).toBeNull()
    expect(row.afterValue).toBeNull()
  })

  it('exportPassagerData under impersonation records impersonatedBy', async () => {
    const tenant = await seedTenant('IMPERSO_TENANT')
    const admin = await seedTenant('IMPERSO_ADMIN')
    const { passager } = await seedBilletPassager(tenant.exploitantId)

    await asUser(
      { exploitantId: tenant.exploitantId, userId: admin.userId },
      'ADMIN_CALPAX',
      async () => exportPassagerData(passager.id),
      { impersonatedBy: admin.userId },
    )

    const rows = await rgpdRowsFor(passager.id, 'EXPORT_PII')
    expect(rows).toHaveLength(1)
    expect(rows[0]?.userId).toBe(admin.userId)
    expect(rows[0]?.impersonatedBy).toBe(admin.userId)
    expect(rows[0]?.exploitantId).toBe(tenant.exploitantId)
  })

  it('anonymisePassager writes an ANONYMIZE_PII row alongside the field-level UPDATE rows', async () => {
    const T = await seedTenant('ANON')
    const { passager } = await seedBilletPassager(T.exploitantId)

    await asUser(T, 'GERANT', async () => anonymisePassager(passager.id))

    const rgpdRows = await rgpdRowsFor(passager.id, 'ANONYMIZE_PII')
    expect(rgpdRows).toHaveLength(1)
    expect(rgpdRows[0]?.userId).toBe(T.userId)

    // The UPDATE is also captured by the audit extension, so the event is
    // observable two ways: explicit (ANONYMIZE_PII) + implicit (UPDATE rows
    // per scrubbed field).
    const updateRows = await basePrisma.auditLog.findMany({
      where: { entityType: 'Passager', entityId: passager.id, action: 'UPDATE' },
    })
    expect(updateRows.length).toBeGreaterThan(0)

    // Passager has been scrubbed at the data layer.
    const after = await basePrisma.passager.findUniqueOrThrow({ where: { id: passager.id } })
    expect(after.prenom).toBe('SUPPRIME')
    expect(after.nom).toBe('SUPPRIME')
    expect(after.email).toBeNull()
    expect(after.emailEncrypted).toBeNull()
    expect(after.poidsEncrypted).toBeNull()
  })

  it('EQUIPIER cannot exportPassagerData (ForbiddenError) and no audit is written', async () => {
    const T = await seedTenant('EQ_EXPORT')
    const { passager } = await seedBilletPassager(T.exploitantId)

    await expect(
      asUser(T, 'EQUIPIER', async () => exportPassagerData(passager.id)),
    ).rejects.toThrow()

    const rows = await rgpdRowsFor(passager.id, 'EXPORT_PII')
    expect(rows).toHaveLength(0)
  })

  it('PILOTE cannot anonymisePassager (ForbiddenError) and no audit is written', async () => {
    const T = await seedTenant('PIL_ANON')
    const { passager } = await seedBilletPassager(T.exploitantId)

    await expect(asUser(T, 'PILOTE', async () => anonymisePassager(passager.id))).rejects.toThrow()

    const rows = await rgpdRowsFor(passager.id, 'ANONYMIZE_PII')
    expect(rows).toHaveLength(0)
    // Data was not scrubbed
    const untouched = await basePrisma.passager.findUniqueOrThrow({ where: { id: passager.id } })
    expect(untouched.prenom).toBe('Jean')
  })
})
