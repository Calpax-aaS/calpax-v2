import { describe, it, expect } from 'vitest'
import { validateVolCreation } from '@/lib/vol/validation'

const validBallon = {
  id: 'b1',
  actif: true,
  camoExpiryDate: new Date('2027-01-01'),
  volumeM3: 3000,
}

const validPilote = {
  id: 'p1',
  actif: true,
  dateExpirationLicence: new Date('2027-01-01'),
  qualificationCommerciale: true,
  classeA: true,
  groupeA1: true,
  groupeA2: false,
  groupeA3: false,
  groupeA4: false,
}

const baseInput = {
  ballon: validBallon,
  pilote: validPilote,
  date: new Date('2026-06-15'),
  creneau: 'MATIN' as const,
  existingVols: [],
}

describe('validateVolCreation', () => {
  it('returns valid for a correct input', () => {
    const result = validateVolCreation(baseInput)
    expect(result.valid).toBe(true)
  })

  it('rejects when ballon CAMO is expired', () => {
    const result = validateVolCreation({
      ...baseInput,
      ballon: { ...validBallon, camoExpiryDate: new Date('2020-01-01') },
    })
    expect(result.valid).toBe(false)
    if (!result.valid) expect(result.errors.length).toBeGreaterThan(0)
  })

  it('rejects when ballon is inactive', () => {
    const result = validateVolCreation({
      ...baseInput,
      ballon: { ...validBallon, actif: false },
    })
    expect(result.valid).toBe(false)
  })

  it('rejects when pilote licence is expired', () => {
    const result = validateVolCreation({
      ...baseInput,
      pilote: { ...validPilote, dateExpirationLicence: new Date('2020-01-01') },
    })
    expect(result.valid).toBe(false)
  })

  it('rejects when pilote lacks qualification commerciale', () => {
    const result = validateVolCreation({
      ...baseInput,
      pilote: { ...validPilote, qualificationCommerciale: false },
    })
    expect(result.valid).toBe(false)
  })

  it('rejects when pilote group does not cover ballon volume', () => {
    const result = validateVolCreation({
      ...baseInput,
      ballon: { ...validBallon, volumeM3: 5000 },
      pilote: { ...validPilote, groupeA2: false },
    })
    expect(result.valid).toBe(false)
  })

  it('rejects duplicate ballon on same date+creneau', () => {
    const result = validateVolCreation({
      ...baseInput,
      existingVols: [{ ballonId: 'b1', piloteId: 'p2', creneau: 'MATIN' }],
    })
    expect(result.valid).toBe(false)
    if (!result.valid) expect(result.errors).toContain('Ce ballon est deja affecte a ce creneau')
  })

  it('rejects duplicate pilote on same creneau', () => {
    const result = validateVolCreation({
      ...baseInput,
      existingVols: [{ ballonId: 'b2', piloteId: 'p1', creneau: 'MATIN' }],
    })
    expect(result.valid).toBe(false)
    if (!result.valid) expect(result.errors).toContain('Ce pilote est deja affecte a ce creneau')
  })

  it('allows same pilote on different creneau', () => {
    const result = validateVolCreation({
      ...baseInput,
      existingVols: [{ ballonId: 'b2', piloteId: 'p1', creneau: 'SOIR' }],
    })
    expect(result.valid).toBe(true)
  })

  it('collects multiple errors', () => {
    const result = validateVolCreation({
      ...baseInput,
      ballon: { ...validBallon, actif: false, camoExpiryDate: new Date('2020-01-01') },
      pilote: { ...validPilote, qualificationCommerciale: false },
    })
    expect(result.valid).toBe(false)
    if (!result.valid) expect(result.errors.length).toBeGreaterThanOrEqual(2)
  })
})
