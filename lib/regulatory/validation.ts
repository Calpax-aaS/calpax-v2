export type ValidationResult = { valid: true } | { valid: false; reason: string }

type BallonFlightInput = {
  actif: boolean
  camoExpiryDate: Date | null
}

type PiloteAssignInput = {
  actif: boolean
  dateExpirationLicence: Date
  qualificationCommerciale: boolean
  classeA: boolean
  groupeA1?: boolean
  groupeA2?: boolean
  groupeA3?: boolean
  groupeA4?: boolean
}

/**
 * Returns true if expiryDate is strictly after today (tomorrow or later).
 */
function isDateValid(expiryDate: Date, today: Date): boolean {
  const todayMs = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())
  const expiryMs = Date.UTC(expiryDate.getFullYear(), expiryDate.getMonth(), expiryDate.getDate())
  return expiryMs > todayMs
}

/**
 * Check whether a ballon is cleared for flight.
 *
 * Rules:
 * - ballon must be actif
 * - camoExpiryDate must exist and be strictly after today
 */
export function isBallonFlightReady(
  ballon: BallonFlightInput,
  today: Date = new Date(),
): ValidationResult {
  if (!ballon.actif) {
    return { valid: false, reason: 'Ballon inactif' }
  }

  if (ballon.camoExpiryDate === null) {
    return { valid: false, reason: 'Date expiration CAMO manquante' }
  }

  if (!isDateValid(ballon.camoExpiryDate, today)) {
    return { valid: false, reason: 'Certificat CAMO expiré' }
  }

  return { valid: true }
}

function groupeField(groupe: number): keyof PiloteAssignInput {
  const map: Record<number, keyof PiloteAssignInput> = {
    1: 'groupeA1',
    2: 'groupeA2',
    3: 'groupeA3',
    4: 'groupeA4',
  }
  return map[groupe] ?? 'groupeA1'
}

/**
 * Check whether a pilote can be assigned to a flight.
 *
 * Rules (in order):
 * - pilote must be actif
 * - licence BFCL must not be expired (strictly after today)
 * - must hold qualification commerciale
 * - must hold classe A (Calpax is hot-air balloon only)
 * - if a balloon group (1–4) is required, pilote must hold the corresponding groupeA{N} boolean
 */
export function isPiloteAssignable(
  pilote: PiloteAssignInput,
  requiredGroupe?: number,
  today: Date = new Date(),
): ValidationResult {
  if (!pilote.actif) {
    return { valid: false, reason: 'Pilote inactif' }
  }

  if (!isDateValid(pilote.dateExpirationLicence, today)) {
    return { valid: false, reason: 'Licence BFCL expirée' }
  }

  if (!pilote.qualificationCommerciale) {
    return { valid: false, reason: 'Qualification commerciale manquante' }
  }

  if (!pilote.classeA) {
    return { valid: false, reason: 'Pilote non qualifié classe A' }
  }

  if (requiredGroupe !== undefined) {
    const field = groupeField(requiredGroupe)
    if (!pilote[field]) {
      return {
        valid: false,
        reason: `Pilote non qualifié pour le groupe A${requiredGroupe}`,
      }
    }
  }

  return { valid: true }
}
