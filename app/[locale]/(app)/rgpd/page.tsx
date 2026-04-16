import { getTranslations } from 'next-intl/server'
import { requireAuth } from '@/lib/auth/requireAuth'
import { requireRole } from '@/lib/auth/requireRole'
import { RgpdClient } from './rgpd-client'

export default async function RgpdPage() {
  return requireAuth(async () => {
    requireRole('ADMIN_CALPAX', 'GERANT')
    const t = await getTranslations('rgpd')
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
        <RgpdClient />
      </div>
    )
  })
}
