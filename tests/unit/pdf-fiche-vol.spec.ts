import { describe, it, expect } from 'vitest'
import { generateFicheVolBuffer } from '@/lib/pdf/generate'

const sampleData = {
  exploitant: { name: 'Cameron Balloons France', frDecNumber: 'FR.DEC.059', logoUrl: null },
  vol: {
    date: new Date('2026-06-15'),
    creneau: 'MATIN' as const,
    lieuDecollage: 'Dole-Tavaux',
    equipier: 'Jean Dupont',
    vehicule: 'Renault Master',
    configGaz: '4xCB2990 : 4x23 kg',
    qteGaz: 92,
    decoLieu: null as string | null,
    decoHeure: null as Date | null,
    atterLieu: null as string | null,
    atterHeure: null as Date | null,
    gasConso: null as number | null,
    anomalies: null as string | null,
  },
  ballon: {
    nom: 'F-HFCC (Z-105)',
    immatriculation: 'F-HFCC',
    volumeM3: 3000,
    peseeAVide: 376,
    performanceChart: { '10': 482, '20': 365, '30': 256, '34': 214 },
    configGaz: '4xCB2990 : 4x23 kg',
  },
  pilote: { prenom: 'Olivier', nom: 'Cuenot', licenceBfcl: 'BFCL-CBF-001', poids: 92 },
  passagers: [
    {
      prenom: 'Marie',
      nom: 'Martin',
      age: 35,
      poids: 65,
      pmr: false,
      billetReference: 'CBF-2026-0001',
    },
    {
      prenom: 'Pierre',
      nom: 'Durand',
      age: 42,
      poids: 80,
      pmr: false,
      billetReference: 'CBF-2026-0001',
    },
  ],
  temperatureCelsius: 20,
  isPve: false,
  archivedAt: null as Date | null,
}

describe('generateFicheVolBuffer', () => {
  it('generates a non-empty PDF buffer', async () => {
    const buffer = await generateFicheVolBuffer(sampleData)
    expect(buffer).toBeInstanceOf(Buffer)
    expect(buffer.length).toBeGreaterThan(100)
  })

  it('PDF starts with %PDF magic bytes', async () => {
    const buffer = await generateFicheVolBuffer(sampleData)
    const header = buffer.subarray(0, 5).toString('ascii')
    expect(header).toBe('%PDF-')
  })

  it('generates PVE variant with post-vol data', async () => {
    const pveData = {
      ...sampleData,
      vol: {
        ...sampleData.vol,
        decoLieu: 'Dole-Tavaux',
        decoHeure: new Date('2026-06-15T06:30:00'),
        atterLieu: 'Champs pres de Parcey',
        atterHeure: new Date('2026-06-15T07:45:00'),
        gasConso: 65,
        anomalies: null,
      },
      isPve: true,
      archivedAt: new Date('2026-06-15T10:00:00'),
    }
    const buffer = await generateFicheVolBuffer(pveData)
    expect(buffer.length).toBeGreaterThan(100)
  })

  it('handles missing optional fields', async () => {
    const minimalData = {
      ...sampleData,
      vol: { ...sampleData.vol, equipier: null, vehicule: null, lieuDecollage: null, qteGaz: null },
      passagers: [],
    }
    const buffer = await generateFicheVolBuffer(minimalData)
    expect(buffer.length).toBeGreaterThan(100)
  })
})
