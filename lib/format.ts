export function formatDateFr(date: Date): string {
  return date.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function localeTag(locale: string): 'fr-FR' | 'en-US' {
  return locale === 'fr' ? 'fr-FR' : 'en-US'
}

export function formatDateLong(date: Date, locale: string): string {
  return date.toLocaleDateString(localeTag(locale), {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export function formatDateMedium(date: Date, locale: string): string {
  return date.toLocaleDateString(localeTag(locale), {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export function formatDateTimeShort(date: Date, locale: string): string {
  return date.toLocaleString(localeTag(locale), {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * Render a value pulled from an audit-log JSON column for display in a table
 * cell. Strings are returned verbatim; null/undefined become an em-dash;
 * everything else (numbers, booleans, objects, arrays, `[REDACTED]` markers)
 * is JSON-serialized so it stays inspectable but renders as a single line.
 */
export function formatAuditValue(value: unknown): string {
  if (value === null || value === undefined) return '—'
  if (typeof value === 'string') return value
  return JSON.stringify(value)
}
