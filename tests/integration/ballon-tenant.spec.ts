import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '@/lib/db'
import { basePrisma } from '@/lib/db/base'
import { resetDb, seedTenant, asUser } from './helpers'

const PERF_CHART = { '10': 480, '20': 363, '30': 254 }

async function seedBallon(exploitantId: string, immatriculation: string) {
  return basePrisma.ballon.create({
    data: {
      exploitantId,
      nom: `Ballon ${immatriculation}`,
      immatriculation,
      volumeM3: 3000,
      nbPassagerMax: 4,
      peseeAVide: 376,
      configGaz: '4xCB2990 : 4x23 kg',
      manexAnnexRef: 'Manex - Annexe 5.4',
      performanceChart: PERF_CHART,
    },
  })
}

describe('ballon tenant isolation', () => {
  beforeEach(async () => {
    await resetDb()
  })

  it('findMany returns only current tenant ballons', async () => {
    const A = await seedTenant('A')
    const B = await seedTenant('B')

    await seedBallon(A.exploitantId, 'F-HAAA')
    await seedBallon(A.exploitantId, 'F-HBBB')
    await seedBallon(B.exploitantId, 'F-HCCC')

    const ballons = await asUser(A, 'GERANT', async () => db.ballon.findMany())

    expect(ballons).toHaveLength(2)
    const immatriculations = ballons.map((b) => b.immatriculation)
    expect(immatriculations).toContain('F-HAAA')
    expect(immatriculations).toContain('F-HBBB')
    expect(immatriculations).not.toContain('F-HCCC')
  })

  it('create injects exploitantId automatically', async () => {
    const A = await seedTenant('A')

    const created = await asUser(A, 'GERANT', async () =>
      (
        db as unknown as {
          ballon: {
            create: (args: {
              data: Record<string, unknown>
            }) => Promise<{ id: string; exploitantId: string }>
          }
        }
      ).ballon.create({
        data: {
          nom: 'Test Ballon',
          immatriculation: 'F-HTEST',
          volumeM3: 3000,
          nbPassagerMax: 4,
          peseeAVide: 376,
          configGaz: '4xCB2990 : 4x23 kg',
          manexAnnexRef: 'Manex - Annexe 5.4',
          performanceChart: PERF_CHART,
        },
      }),
    )

    const row = await basePrisma.ballon.findUnique({ where: { id: created.id } })
    expect(row?.exploitantId).toBe(A.exploitantId)
  })
})
