import type { ZodError } from 'zod'

export function formatZodError(error: ZodError): string {
  const messages = error.issues.map((i) => i.message).filter(Boolean)
  return messages.length > 0 ? messages.join(' — ') : 'Données invalides'
}
