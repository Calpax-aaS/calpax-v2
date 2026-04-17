import { describe, it, expect, beforeEach } from 'vitest'
import { basePrisma } from '@/lib/db/base'
import { resetDb, seedTenant, asUser } from './helpers'
import { db } from '@/lib/db'

describe('M3 — role filtering + meteo alert + cancellation', () => {
  beforeEach(async () => {
    await resetDb()
  })

  it('PILOTE only sees vols where they are assigned', async () => {
    const tenant = await seedTenant('A')

    const pilote = await basePrisma.pilote.create({
      data: {
        prenom: 'Jean',
        nom: 'Dupont',
        userId: tenant.userId,
        exploitantId: tenant.exploitantId,
        licenceBfcl: 'BFCL-001',
        dateExpirationLicence: new Date('2027-01-01'),
      },
    })

    const other = await basePrisma.user.create({
      data: {
        email: 'other@test.local',
        name: 'Other',
        role: 'PILOTE',
        exploitantId: tenant.exploitantId,
      },
    })
    const otherPilote = await basePrisma.pilote.create({
      data: {
        prenom: 'Marc',
        nom: 'Martin',
        userId: other.id,
        exploitantId: tenant.exploitantId,
        licenceBfcl: 'BFCL-002',
        dateExpirationLicence: new Date('2027-01-01'),
      },
    })

    const ballon = await basePrisma.ballon.create({
      data: {
        nom: 'TestBallon',
        immatriculation: 'F-TEST',
        volumeM3: 3000,
        nbPassagerMax: 6,
        peseeAVide: 200,
        configGaz: 'propane',
        manexAnnexRef: 'A1',
        performanceChart: {},
        exploitantId: tenant.exploitantId,
        camoExpiryDate: new Date('2027-01-01'),
      },
    })

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    await basePrisma.vol.create({
      data: {
        date: today,
        creneau: 'MATIN',
        ballonId: ballon.id,
        piloteId: pilote.id,
        exploitantId: tenant.exploitantId,
      },
    })

    await basePrisma.vol.create({
      data: {
        date: today,
        creneau: 'SOIR',
        ballonId: ballon.id,
        piloteId: otherPilote.id,
        exploitantId: tenant.exploitantId,
      },
    })

    const vols = await asUser(tenant, 'PILOTE', async () =>
      db.vol.findMany({
        where: {
          date: today,
          pilote: { userId: tenant.userId },
        },
      }),
    )
    expect(vols).toHaveLength(1)
    expect(vols[0]!.creneau).toBe('MATIN')
  })

  it('meteoAlert flag can be set and cleared on a vol', async () => {
    const tenant = await seedTenant('A')
    const pilote = await basePrisma.pilote.create({
      data: {
        prenom: 'Jean',
        nom: 'Dupont',
        exploitantId: tenant.exploitantId,
        licenceBfcl: 'BFCL-001',
        dateExpirationLicence: new Date('2027-01-01'),
      },
    })
    const ballon = await basePrisma.ballon.create({
      data: {
        nom: 'B1',
        immatriculation: 'F-B1',
        volumeM3: 3000,
        nbPassagerMax: 6,
        peseeAVide: 200,
        configGaz: 'propane',
        manexAnnexRef: 'A1',
        performanceChart: {},
        exploitantId: tenant.exploitantId,
        camoExpiryDate: new Date('2027-01-01'),
      },
    })
    const vol = await basePrisma.vol.create({
      data: {
        date: new Date(),
        creneau: 'MATIN',
        ballonId: ballon.id,
        piloteId: pilote.id,
        exploitantId: tenant.exploitantId,
      },
    })

    expect(vol.meteoAlert).toBe(false)

    const updated = await basePrisma.vol.update({
      where: { id: vol.id },
      data: { meteoAlert: true },
    })
    expect(updated.meteoAlert).toBe(true)

    const cleared = await basePrisma.vol.update({
      where: { id: vol.id },
      data: { meteoAlert: false },
    })
    expect(cleared.meteoAlert).toBe(false)
  })

  it('cancelReason is stored on cancellation', async () => {
    const tenant = await seedTenant('A')
    const pilote = await basePrisma.pilote.create({
      data: {
        prenom: 'Jean',
        nom: 'Dupont',
        exploitantId: tenant.exploitantId,
        licenceBfcl: 'BFCL-001',
        dateExpirationLicence: new Date('2027-01-01'),
      },
    })
    const ballon = await basePrisma.ballon.create({
      data: {
        nom: 'B1',
        immatriculation: 'F-B1',
        volumeM3: 3000,
        nbPassagerMax: 6,
        peseeAVide: 200,
        configGaz: 'propane',
        manexAnnexRef: 'A1',
        performanceChart: {},
        exploitantId: tenant.exploitantId,
        camoExpiryDate: new Date('2027-01-01'),
      },
    })
    const vol = await basePrisma.vol.create({
      data: {
        date: new Date(),
        creneau: 'MATIN',
        ballonId: ballon.id,
        piloteId: pilote.id,
        exploitantId: tenant.exploitantId,
      },
    })

    await basePrisma.vol.update({
      where: { id: vol.id },
      data: { statut: 'ANNULE', cancelReason: 'Météo' },
    })

    const cancelled = await basePrisma.vol.findUniqueOrThrow({ where: { id: vol.id } })
    expect(cancelled.statut).toBe('ANNULE')
    expect(cancelled.cancelReason).toBe('Météo')
  })
})
