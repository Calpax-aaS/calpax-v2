import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '@/lib/db'
import { basePrisma } from '@/lib/db/base'
import { resetDb, seedTenant, asUser } from './helpers'

async function seedPilote(exploitantId: string, licenceBfcl: string, nom: string) {
  return basePrisma.pilote.create({
    data: {
      exploitantId,
      prenom: 'Test',
      nom,
      licenceBfcl,
      qualificationCommerciale: true,
      dateExpirationLicence: new Date('2027-01-01'),
      classesBallon: ['A'],
    },
  })
}

describe('pilote tenant isolation', () => {
  beforeEach(async () => {
    await resetDb()
  })

  it('findMany returns only current tenant pilotes', async () => {
    const A = await seedTenant('A')
    const B = await seedTenant('B')

    await seedPilote(A.exploitantId, 'BFCL-A-001', 'Dupont')
    await seedPilote(B.exploitantId, 'BFCL-B-001', 'Martin')

    const pilotes = await asUser(A, 'GERANT', async () => db.pilote.findMany())

    expect(pilotes).toHaveLength(1)
    expect(pilotes[0]!.licenceBfcl).toBe('BFCL-A-001')
    expect(pilotes[0]!.nom).toBe('Dupont')
  })
})
