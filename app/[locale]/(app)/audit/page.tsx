import { getTranslations } from 'next-intl/server'
import { requireAuth } from '@/lib/auth/requireAuth'
import { AuditClient } from './audit-client'

export default async function AuditPage() {
  return requireAuth(async () => {
    const t = await getTranslations('audit')
    return (
      <main className="container mx-auto max-w-5xl px-4 py-8 space-y-6">
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        <AuditClient />
      </main>
    )
  })
}
