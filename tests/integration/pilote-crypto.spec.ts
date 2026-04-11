import { describe, it, expect, beforeEach } from 'vitest'
import { basePrisma } from '@/lib/db/base'
import { encrypt, decrypt } from '@/lib/crypto'
import { resetDb, seedTenant } from './helpers'

describe('pilote poids encryption', () => {
  beforeEach(async () => {
    await resetDb()
  })

  it('stores poids as encrypted ciphertext and decrypts back to original value', async () => {
    const { exploitantId } = await seedTenant('CRYPTO')
    const originalPoids = 87

    const poidsEncrypted = encrypt(String(originalPoids))

    const pilote = await basePrisma.pilote.create({
      data: {
        exploitantId,
        prenom: 'Jean',
        nom: 'Dupont',
        licenceBfcl: 'BFCL-CRYPTO-001',
        qualificationCommerciale: true,
        dateExpirationLicence: new Date('2027-06-01'),
        classesBallon: ['A'],
        poidsEncrypted,
      },
    })

    expect(pilote.poidsEncrypted).not.toBe(String(originalPoids))
    expect(pilote.poidsEncrypted).toBeTruthy()

    const row = await basePrisma.pilote.findUnique({ where: { id: pilote.id } })
    expect(row?.poidsEncrypted).toBeTruthy()

    const decrypted = decrypt(row!.poidsEncrypted!)
    expect(Number(decrypted)).toBe(originalPoids)
  })
})
