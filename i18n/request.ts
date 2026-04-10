import { getRequestConfig } from 'next-intl/server'
import { routing } from './routing'

export default getRequestConfig(async ({ requestLocale }) => {
  // requestLocale is the locale from the [locale] segment
  let locale = await requestLocale

  // Ensure the locale is valid; fall back to the default locale
  if (!locale || !routing.locales.includes(locale as (typeof routing.locales)[number])) {
    locale = routing.defaultLocale
  }

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default as Record<string, unknown>,
  }
})
