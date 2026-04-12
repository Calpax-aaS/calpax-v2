import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '@/lib/db'
import { basePrisma } from '@/lib/db/base'
import { resetDb, seedTenant, asUser } from './helpers'
import { encrypt } from '@/lib/crypto'

async function seedBillet(exploitantId: string, reference: string) {
  return basePrisma.billet.create({
    data: {
      exploitantId,
      reference,
      checksum: '0',
      payeurPrenom: 'Test',
      payeurNom: 'Payeur',
      montantTtc: 15000,
      typePlannif: 'A_DEFINIR',
      statut: 'EN_ATTENTE',
      statutPaiement: 'EN_ATTENTE',
    },
  })
}

async function seedPassager(exploitantId: string, billetId: string, nom: string) {
  return basePrisma.passager.create({
    data: {
      exploitantId,
      billetId,
      prenom: 'Test',
      nom,
      poidsEncrypted: encrypt('80'),
    },
  })
}

async function seedPaiement(exploitantId: string, billetId: string, montant: number) {
  return basePrisma.paiement.create({
    data: {
      exploitantId,
      billetId,
      modePaiement: 'CB',
      montantTtc: montant,
      datePaiement: new Date(),
    },
  })
}

describe('billet tenant isolation', () => {
  beforeEach(async () => {
    await resetDb()
  })

  it('findMany returns only current tenant billets', async () => {
    const A = await seedTenant('A')
    const B = await seedTenant('B')

    await seedBillet(A.exploitantId, 'A-2026-0001')
    await seedBillet(B.exploitantId, 'B-2026-0001')

    const billets = await asUser(A, 'GERANT', async () => db.billet.findMany())
    expect(billets).toHaveLength(1)
    expect(billets[0]?.reference).toBe('A-2026-0001')
  })

  it('passager findMany is tenant-isolated', async () => {
    const A = await seedTenant('A')
    const B = await seedTenant('B')

    const billetA = await seedBillet(A.exploitantId, 'A-2026-0001')
    const billetB = await seedBillet(B.exploitantId, 'B-2026-0001')

    await seedPassager(A.exploitantId, billetA.id, 'PassagerA')
    await seedPassager(B.exploitantId, billetB.id, 'PassagerB')

    const passagers = await asUser(A, 'GERANT', async () => db.passager.findMany())
    expect(passagers).toHaveLength(1)
    expect(passagers[0]?.nom).toBe('PassagerA')
  })

  it('paiement findMany is tenant-isolated', async () => {
    const A = await seedTenant('A')
    const B = await seedTenant('B')

    const billetA = await seedBillet(A.exploitantId, 'A-2026-0001')
    const billetB = await seedBillet(B.exploitantId, 'B-2026-0001')

    await seedPaiement(A.exploitantId, billetA.id, 5000)
    await seedPaiement(B.exploitantId, billetB.id, 3000)

    const paiements = await asUser(A, 'GERANT', async () => db.paiement.findMany())
    expect(paiements).toHaveLength(1)
    expect(paiements[0]?.montantTtc).toBe(5000)
  })

  it('create injects exploitantId automatically for billet', async () => {
    const A = await seedTenant('A')

    const created = await asUser(A, 'GERANT', async () =>
      (
        db as unknown as {
          billet: {
            create: (args: {
              data: Record<string, unknown>
            }) => Promise<{ id: string; exploitantId: string }>
          }
        }
      ).billet.create({
        data: {
          reference: 'TEST-2026-0001',
          checksum: '0',
          payeurPrenom: 'Auto',
          payeurNom: 'Tenant',
          montantTtc: 10000,
        },
      }),
    )

    const row = await basePrisma.billet.findUnique({
      where: { id: created.id },
    })
    expect(row?.exploitantId).toBe(A.exploitantId)
  })
})
