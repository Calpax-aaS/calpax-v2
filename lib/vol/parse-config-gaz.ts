/**
 * Parse the total gas weight (kg) from a configGaz string.
 *
 * Supported formats (after the colon separator):
 *   "4xCB2990 : 4x23 kg"       → 4*23 = 92
 *   "3xCB2901:3x30kg"          → 3*30 = 90
 *   "2xCB2901+1xCB2380:2x30+29kg" → 2*30 + 29 = 89
 *   "4xCB2903 : 4x36 kg"      → 4*36 = 144
 *
 * Returns null if the string cannot be parsed.
 */
export function parseQteGazFromConfig(configGaz: string): number | null {
  const colonIndex = configGaz.indexOf(':')
  if (colonIndex === -1) return null

  const weightPart = configGaz
    .slice(colonIndex + 1)
    .replace(/\s/g, '')
    .replace(/kg$/i, '')

  // Split on '+' to handle "2x30+29" patterns
  const segments = weightPart.split('+')
  let total = 0

  for (const segment of segments) {
    const match = segment.match(/^(\d+)x(\d+)$/)
    if (match) {
      total += Number(match[1]) * Number(match[2])
    } else {
      const num = Number(segment)
      if (!isNaN(num) && num > 0) {
        total += num
      } else {
        return null
      }
    }
  }

  return total > 0 ? total : null
}
