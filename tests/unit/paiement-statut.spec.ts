import { describe, it, expect } from 'vitest'
import { computeStatutPaiement } from '@/lib/billet/paiement'

describe('computeStatutPaiement', () => {
  it('returns EN_ATTENTE when no payments exist', () => {
    expect(computeStatutPaiement(15000, [])).toBe('EN_ATTENTE')
  })

  it('returns PARTIEL when total paid < montantTtc', () => {
    expect(computeStatutPaiement(15000, [5000])).toBe('PARTIEL')
  })

  it('returns SOLDE when total paid == montantTtc', () => {
    expect(computeStatutPaiement(15000, [10000, 5000])).toBe('SOLDE')
  })

  it('returns SOLDE when total paid > montantTtc (overpayment)', () => {
    expect(computeStatutPaiement(15000, [10000, 6000])).toBe('SOLDE')
  })

  it('handles refunds (negative amounts)', () => {
    expect(computeStatutPaiement(15000, [15000, -5000])).toBe('PARTIEL')
  })

  it('returns EN_ATTENTE when refunds cancel all payments', () => {
    expect(computeStatutPaiement(15000, [15000, -15000])).toBe('EN_ATTENTE')
  })

  it('returns REMBOURSE when net amount is negative', () => {
    expect(computeStatutPaiement(15000, [15000, -20000])).toBe('REMBOURSE')
  })
})
