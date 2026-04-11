import { describe, it, expect } from 'vitest'
import { isBallonFlightReady, isPiloteAssignable } from '@/lib/regulatory/validation'

const TODAY = new Date('2026-04-09')

function daysFromToday(days: number): Date {
  const d = new Date(TODAY)
  d.setDate(d.getDate() + days)
  return d
}

// ─── isBallonFlightReady ──────────────────────────────────────────────────────

describe('isBallonFlightReady', () => {
  it('returns valid when ballon is active and CAMO not expired', () => {
    const result = isBallonFlightReady({ actif: true, camoExpiryDate: daysFromToday(10) }, TODAY)
    expect(result.valid).toBe(true)
  })

  it('returns invalid when ballon is not actif', () => {
    const result = isBallonFlightReady({ actif: false, camoExpiryDate: daysFromToday(30) }, TODAY)
    expect(result.valid).toBe(false)
    if (!result.valid) expect(result.reason).toMatch(/inactif/i)
  })

  it('returns invalid when camoExpiryDate is null', () => {
    const result = isBallonFlightReady({ actif: true, camoExpiryDate: null }, TODAY)
    expect(result.valid).toBe(false)
    if (!result.valid) expect(result.reason).toMatch(/camo/i)
  })

  it('returns invalid when CAMO is expired (past date)', () => {
    const result = isBallonFlightReady({ actif: true, camoExpiryDate: daysFromToday(-1) }, TODAY)
    expect(result.valid).toBe(false)
    if (!result.valid) expect(result.reason).toMatch(/camo/i)
  })

  it('returns invalid when CAMO expires exactly today', () => {
    const result = isBallonFlightReady({ actif: true, camoExpiryDate: daysFromToday(0) }, TODAY)
    expect(result.valid).toBe(false)
    if (!result.valid) expect(result.reason).toMatch(/camo/i)
  })

  it('returns valid when CAMO expires tomorrow', () => {
    const result = isBallonFlightReady({ actif: true, camoExpiryDate: daysFromToday(1) }, TODAY)
    expect(result.valid).toBe(true)
  })
})

// ─── isPiloteAssignable ───────────────────────────────────────────────────────

const validPilote = {
  actif: true,
  dateExpirationLicence: daysFromToday(60),
  qualificationCommerciale: true,
  classeA: true,
  groupeA1: true,
  groupeA2: true,
  groupeA3: false,
  groupeA4: false,
}

describe('isPiloteAssignable', () => {
  it('returns valid when all conditions are met (no group required)', () => {
    const result = isPiloteAssignable(validPilote, undefined, TODAY)
    expect(result.valid).toBe(true)
  })

  it('returns valid when required balloon group is held by pilote', () => {
    const result = isPiloteAssignable(validPilote, 1, TODAY)
    expect(result.valid).toBe(true)
  })

  it('returns invalid when pilote is not actif', () => {
    const result = isPiloteAssignable({ ...validPilote, actif: false }, undefined, TODAY)
    expect(result.valid).toBe(false)
    if (!result.valid) expect(result.reason).toMatch(/inactif/i)
  })

  it('returns invalid when licence is expired', () => {
    const result = isPiloteAssignable(
      { ...validPilote, dateExpirationLicence: daysFromToday(-5) },
      undefined,
      TODAY,
    )
    expect(result.valid).toBe(false)
    if (!result.valid) expect(result.reason).toMatch(/licence/i)
  })

  it('returns invalid when licence expires exactly today', () => {
    const result = isPiloteAssignable(
      { ...validPilote, dateExpirationLicence: daysFromToday(0) },
      undefined,
      TODAY,
    )
    expect(result.valid).toBe(false)
    if (!result.valid) expect(result.reason).toMatch(/licence/i)
  })

  it('returns invalid when qualificationCommerciale is false', () => {
    const result = isPiloteAssignable(
      { ...validPilote, qualificationCommerciale: false },
      undefined,
      TODAY,
    )
    expect(result.valid).toBe(false)
    if (!result.valid) expect(result.reason).toMatch(/qualification/i)
  })

  it('returns invalid when classeA is false', () => {
    const result = isPiloteAssignable({ ...validPilote, classeA: false }, undefined, TODAY)
    expect(result.valid).toBe(false)
    if (!result.valid) expect(result.reason).toMatch(/classe/i)
  })

  it('returns invalid when required group is not held by pilote', () => {
    const result = isPiloteAssignable(validPilote, 3, TODAY)
    expect(result.valid).toBe(false)
    if (!result.valid) expect(result.reason).toMatch(/groupe/i)
  })

  it('returns invalid when pilote has no group qualifications and group is required', () => {
    const piloteNoGroups = {
      ...validPilote,
      groupeA1: false,
      groupeA2: false,
      groupeA3: false,
      groupeA4: false,
    }
    const result = isPiloteAssignable(piloteNoGroups, 1, TODAY)
    expect(result.valid).toBe(false)
    if (!result.valid) expect(result.reason).toMatch(/groupe/i)
  })

  it('returns valid when licence expires tomorrow', () => {
    const result = isPiloteAssignable(
      { ...validPilote, dateExpirationLicence: daysFromToday(1) },
      undefined,
      TODAY,
    )
    expect(result.valid).toBe(true)
  })

  it('validation checks priority: actif checked before licence', () => {
    const result = isPiloteAssignable(
      {
        actif: false,
        dateExpirationLicence: daysFromToday(-10),
        qualificationCommerciale: false,
        classeA: false,
        groupeA1: false,
        groupeA2: false,
        groupeA3: false,
        groupeA4: false,
      },
      4,
      TODAY,
    )
    expect(result.valid).toBe(false)
    if (!result.valid) expect(result.reason).toMatch(/inactif/i)
  })
})
