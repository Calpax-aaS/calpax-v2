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
