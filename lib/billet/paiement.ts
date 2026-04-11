type StatutPaiement = 'EN_ATTENTE' | 'PARTIEL' | 'SOLDE' | 'REMBOURSE'

/**
 * Compute the payment status for a billet based on its total amount and payment amounts.
 * All amounts are in euros.
 *
 * @param montantTtc - Total billet amount in euros
 * @param paiementMontants - Array of payment amounts in euros (negative = refund)
 */
export function computeStatutPaiement(
  montantTtc: number,
  paiementMontants: readonly number[],
): StatutPaiement {
  const totalPaye = paiementMontants.reduce((sum, m) => sum + m, 0)

  if (totalPaye < 0) return 'REMBOURSE'
  if (totalPaye === 0) return 'EN_ATTENTE'
  if (totalPaye >= montantTtc) return 'SOLDE'
  return 'PARTIEL'
}
