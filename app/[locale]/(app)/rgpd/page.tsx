import { getTranslations } from 'next-intl/server'
import { requireAuth } from '@/lib/auth/requireAuth'
import { RgpdClient } from './rgpd-client'

export default async function RgpdPage() {
  return requireAuth(async () => {
    const t = await getTranslations('rgpd')
    return (
      <main className="container mx-auto max-w-3xl px-4 py-8 space-y-6">
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        <RgpdClient />
      </main>
    )
  })
}
