import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '@/lib/db'
import { basePrisma } from '@/lib/db/base'
import { resetDb, seedTenant, asUser } from './helpers'

async function seedBallon(exploitantId: string) {
  return basePrisma.ballon.create({
    data: {
      exploitantId,
      nom: 'Test Ballon',
      immatriculation: `F-${exploitantId.slice(0, 4)}`,
      volumeM3: 3000,
      nbPassagerMax: 4,
      peseeAVide: 376,
      configGaz: '4xCB2990',
      manexAnnexRef: 'Test',
      performanceChart: { '20': 365 },
    },
  })
}

async function seedPilote(exploitantId: string) {
  return basePrisma.pilote.create({
    data: {
      exploitantId,
      prenom: 'Test',
      nom: 'Pilote',
      licenceBfcl: `BFCL-${exploitantId.slice(0, 4)}`,
      dateExpirationLicence: new Date('2027-01-01'),
      qualificationCommerciale: true,
      classeA: true,
      groupeA1: true,
    },
  })
}

async function seedVol(exploitantId: string, ballonId: string, piloteId: string) {
  return basePrisma.vol.create({
    data: {
      exploitantId,
      date: new Date('2026-06-15'),
      creneau: 'MATIN',
      ballonId,
      piloteId,
    },
  })
}

describe('vol tenant isolation', () => {
  beforeEach(async () => {
    await resetDb()
  })

  it('findMany returns only current tenant vols', async () => {
    const A = await seedTenant('A')
    const B = await seedTenant('B')

    const ballonA = await seedBallon(A.exploitantId)
    const piloteA = await seedPilote(A.exploitantId)
    const ballonB = await seedBallon(B.exploitantId)
    const piloteB = await seedPilote(B.exploitantId)

    await seedVol(A.exploitantId, ballonA.id, piloteA.id)
    await seedVol(B.exploitantId, ballonB.id, piloteB.id)

    const vols = await asUser(A, 'GERANT', async () => db.vol.findMany())
    expect(vols).toHaveLength(1)
    expect(vols[0]?.ballonId).toBe(ballonA.id)
  })
})
