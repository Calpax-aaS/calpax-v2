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

/** ISO date-only (YYYY-MM-DD) in UTC. Used for week-grid keys, range queries
 *  and any string round-trip that must NOT depend on the server timezone. */
export function toDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10)
}

/** Given a YYYY-MM-DD string, return the Monday of that ISO week as YYYY-MM-DD
 *  (UTC, Monday-first to match the European week convention). */
export function getMondayOfWeek(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00Z')
  const day = d.getUTCDay()
  d.setUTCDate(d.getUTCDate() - ((day + 6) % 7))
  return d.toISOString().slice(0, 10)
}
