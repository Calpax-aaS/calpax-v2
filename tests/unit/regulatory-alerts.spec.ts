import { describe, it, expect } from 'vitest'
import {
  computeAlertSeverity,
  buildBallonAlerts,
  buildPiloteAlerts,
  sortAlerts,
  type Alert,
} from '@/lib/regulatory/alerts'

const TODAY = new Date('2026-04-09')

function daysFromToday(days: number): Date {
  const d = new Date(TODAY)
  d.setDate(d.getDate() + days)
  return d
}

// ─── computeAlertSeverity ─────────────────────────────────────────────────────

describe('computeAlertSeverity — CAMO', () => {
  it('returns EXPIRED when expiryDate is today (0 days)', () => {
    expect(computeAlertSeverity(daysFromToday(0), 'CAMO', TODAY)).toBe('EXPIRED')
  })

  it('returns EXPIRED when expiryDate is in the past', () => {
    expect(computeAlertSeverity(daysFromToday(-10), 'CAMO', TODAY)).toBe('EXPIRED')
  })

  it('returns CRITICAL when 1 day remaining', () => {
    expect(computeAlertSeverity(daysFromToday(1), 'CAMO', TODAY)).toBe('CRITICAL')
  })

  it('returns CRITICAL when 30 days remaining', () => {
    expect(computeAlertSeverity(daysFromToday(30), 'CAMO', TODAY)).toBe('CRITICAL')
  })

  it('returns WARNING when 31 days remaining', () => {
    expect(computeAlertSeverity(daysFromToday(31), 'CAMO', TODAY)).toBe('WARNING')
  })

  it('returns WARNING when 60 days remaining', () => {
    expect(computeAlertSeverity(daysFromToday(60), 'CAMO', TODAY)).toBe('WARNING')
  })

  it('returns OK when 61 days remaining', () => {
    expect(computeAlertSeverity(daysFromToday(61), 'CAMO', TODAY)).toBe('OK')
  })

  it('returns OK when expiry is far in the future', () => {
    expect(computeAlertSeverity(daysFromToday(365), 'CAMO', TODAY)).toBe('OK')
  })
})

describe('computeAlertSeverity — BFCL', () => {
  it('returns EXPIRED when expiryDate is today (0 days)', () => {
    expect(computeAlertSeverity(daysFromToday(0), 'BFCL', TODAY)).toBe('EXPIRED')
  })

  it('returns EXPIRED when expiryDate is in the past', () => {
    expect(computeAlertSeverity(daysFromToday(-5), 'BFCL', TODAY)).toBe('EXPIRED')
  })

  it('returns CRITICAL when 1 day remaining', () => {
    expect(computeAlertSeverity(daysFromToday(1), 'BFCL', TODAY)).toBe('CRITICAL')
  })

  it('returns CRITICAL when 30 days remaining', () => {
    expect(computeAlertSeverity(daysFromToday(30), 'BFCL', TODAY)).toBe('CRITICAL')
  })

  it('returns WARNING when 31 days remaining', () => {
    expect(computeAlertSeverity(daysFromToday(31), 'BFCL', TODAY)).toBe('WARNING')
  })

  it('returns WARNING when 90 days remaining', () => {
    expect(computeAlertSeverity(daysFromToday(90), 'BFCL', TODAY)).toBe('WARNING')
  })

  it('returns OK when 91 days remaining', () => {
    expect(computeAlertSeverity(daysFromToday(91), 'BFCL', TODAY)).toBe('OK')
  })
})

// ─── buildBallonAlerts ────────────────────────────────────────────────────────

describe('buildBallonAlerts', () => {
  it('returns empty array for empty input', () => {
    expect(buildBallonAlerts([], TODAY)).toEqual([])
  })

  it('skips inactive ballons', () => {
    const ballon = {
      id: 'b1',
      immatriculation: 'F-HXXX',
      camoExpiryDate: daysFromToday(10),
      actif: false,
    }
    expect(buildBallonAlerts([ballon], TODAY)).toEqual([])
  })

  it('skips ballons with null camoExpiryDate', () => {
    const ballon = {
      id: 'b1',
      immatriculation: 'F-HXXX',
      camoExpiryDate: null,
      actif: true,
    }
    expect(
      buildBallonAlerts([ballon as Parameters<typeof buildBallonAlerts>[0][0]], TODAY),
    ).toEqual([])
  })

  it('produces CRITICAL alert for ballon expiring in 15 days', () => {
    const ballon = {
      id: 'b2',
      immatriculation: 'F-HABC',
      camoExpiryDate: daysFromToday(15),
      actif: true,
    }
    const alerts = buildBallonAlerts([ballon], TODAY)
    expect(alerts).toHaveLength(1)
    expect(alerts[0]?.severity).toBe('CRITICAL')
    expect(alerts[0]?.alertType).toBe('CAMO_EXPIRY')
    expect(alerts[0]?.entityType).toBe('BALLON')
    expect(alerts[0]?.entityId).toBe('b2')
    expect(alerts[0]?.entityName).toBe('F-HABC')
    expect(alerts[0]?.daysRemaining).toBe(15)
  })

  it('produces EXPIRED alert for ballon past CAMO date', () => {
    const ballon = {
      id: 'b3',
      immatriculation: 'F-HDEF',
      camoExpiryDate: daysFromToday(-2),
      actif: true,
    }
    const alerts = buildBallonAlerts([ballon], TODAY)
    expect(alerts[0]?.severity).toBe('EXPIRED')
    expect(alerts[0]?.daysRemaining).toBe(-2)
  })

  it('produces no alert when CAMO is OK (> 60 days)', () => {
    const ballon = {
      id: 'b4',
      immatriculation: 'F-HGHI',
      camoExpiryDate: daysFromToday(90),
      actif: true,
    }
    const alerts = buildBallonAlerts([ballon], TODAY)
    expect(alerts).toHaveLength(0)
  })
})

// ─── buildPiloteAlerts ────────────────────────────────────────────────────────

describe('buildPiloteAlerts', () => {
  it('returns empty array for empty input', () => {
    expect(buildPiloteAlerts([], TODAY)).toEqual([])
  })

  it('skips inactive pilotes', () => {
    const pilote = {
      id: 'p1',
      prenom: 'Jean',
      nom: 'Dupont',
      dateExpirationLicence: daysFromToday(10),
      actif: false,
    }
    expect(buildPiloteAlerts([pilote], TODAY)).toEqual([])
  })

  it('produces CRITICAL alert for pilote licence expiring in 20 days', () => {
    const pilote = {
      id: 'p2',
      prenom: 'Marie',
      nom: 'Martin',
      dateExpirationLicence: daysFromToday(20),
      actif: true,
    }
    const alerts = buildPiloteAlerts([pilote], TODAY)
    expect(alerts).toHaveLength(1)
    expect(alerts[0]?.severity).toBe('CRITICAL')
    expect(alerts[0]?.alertType).toBe('BFCL_EXPIRY')
    expect(alerts[0]?.entityType).toBe('PILOTE')
    expect(alerts[0]?.entityId).toBe('p2')
    expect(alerts[0]?.entityName).toBe('Marie Martin')
    expect(alerts[0]?.daysRemaining).toBe(20)
  })

  it('produces WARNING alert for pilote licence expiring in 60 days', () => {
    const pilote = {
      id: 'p3',
      prenom: 'Paul',
      nom: 'Bernard',
      dateExpirationLicence: daysFromToday(60),
      actif: true,
    }
    const alerts = buildPiloteAlerts([pilote], TODAY)
    expect(alerts[0]?.severity).toBe('WARNING')
  })

  it('produces no alert when licence is OK (> 90 days)', () => {
    const pilote = {
      id: 'p4',
      prenom: 'Luc',
      nom: 'Simon',
      dateExpirationLicence: daysFromToday(120),
      actif: true,
    }
    expect(buildPiloteAlerts([pilote], TODAY)).toHaveLength(0)
  })
})

// ─── sortAlerts ───────────────────────────────────────────────────────────────

describe('sortAlerts', () => {
  function makeAlert(severity: Alert['severity'], id: string): Alert {
    return {
      severity,
      entityType: 'BALLON',
      entityId: id,
      entityName: `Entity ${id}`,
      alertType: 'CAMO_EXPIRY',
      expiryDate: new Date(),
      daysRemaining: 10,
    }
  }

  it('sorts EXPIRED before CRITICAL before WARNING', () => {
    const alerts = [
      makeAlert('WARNING', '1'),
      makeAlert('EXPIRED', '2'),
      makeAlert('CRITICAL', '3'),
    ]
    const sorted = sortAlerts(alerts)
    expect(sorted[0]?.severity).toBe('EXPIRED')
    expect(sorted[1]?.severity).toBe('CRITICAL')
    expect(sorted[2]?.severity).toBe('WARNING')
  })

  it('does not mutate the original array', () => {
    const alerts = [makeAlert('WARNING', '1'), makeAlert('EXPIRED', '2')]
    const original = [...alerts]
    sortAlerts(alerts)
    expect(alerts[0]?.severity).toBe(original[0]?.severity)
  })

  it('handles empty array', () => {
    expect(sortAlerts([])).toEqual([])
  })
})
