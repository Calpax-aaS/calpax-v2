import { describe, it, expect } from 'vitest'
import { buildVolWhereForRole } from '@/lib/vol/role-filter'

describe('buildVolWhereForRole', () => {
  const baseWhere = { date: new Date('2026-04-17') }

  it('adds piloteId filter for PILOTE role', () => {
    const result = buildVolWhereForRole(baseWhere, 'PILOTE', 'user-123')
    expect(result).toEqual({
      date: new Date('2026-04-17'),
      pilote: { userId: 'user-123' },
    })
  })

  it('does not add filter for GERANT role', () => {
    const result = buildVolWhereForRole(baseWhere, 'GERANT', 'user-456')
    expect(result).toEqual({ date: new Date('2026-04-17') })
  })

  it('does not add filter for ADMIN_CALPAX role', () => {
    const result = buildVolWhereForRole(baseWhere, 'ADMIN_CALPAX', 'user-789')
    expect(result).toEqual({ date: new Date('2026-04-17') })
  })

  it('does not add filter for EQUIPIER role (no User→Equipier link)', () => {
    const result = buildVolWhereForRole(baseWhere, 'EQUIPIER', 'user-eq')
    expect(result).toEqual({ date: new Date('2026-04-17') })
  })

  it('preserves existing where conditions', () => {
    const where = { date: new Date('2026-04-17'), statut: { not: 'ANNULE' as const } }
    const result = buildVolWhereForRole(where, 'PILOTE', 'user-123')
    expect(result).toEqual({
      date: new Date('2026-04-17'),
      statut: { not: 'ANNULE' },
      pilote: { userId: 'user-123' },
    })
  })
})
