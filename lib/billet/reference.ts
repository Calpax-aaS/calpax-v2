/**
 * Format a billet reference: PREFIX-YYYY-NNNN
 */
export function formatReference(prefix: string, year: number, seq: number): string {
  const padded = String(seq).padStart(4, '0')
  return `${prefix}-${year}-${padded}`
}

/**
 * Luhn mod-10 checksum on the numeric characters of a reference string.
 * Used for telephone verification of billet references.
 */
export function computeLuhnChecksum(reference: string): string {
  const digits = reference.replace(/\D/g, '').split('').map(Number)
  let sum = 0
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = digits[i] ?? 0
    if ((digits.length - i) % 2 === 0) {
      d *= 2
      if (d > 9) d -= 9
    }
    sum += d
  }
  return String((10 - (sum % 10)) % 10)
}

/**
 * Verify a reference against its checksum.
 */
export function verifyReference(reference: string, checksum: string): boolean {
  return computeLuhnChecksum(reference) === checksum
}
