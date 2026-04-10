import { getTranslations } from 'next-intl/server'

export default async function AdminPage() {
  const t = await getTranslations('admin')

  return (
    <main className="min-h-screen flex items-center justify-center">
      <h1 className="text-2xl font-bold">{t('title')}</h1>
    </main>
  )
}
