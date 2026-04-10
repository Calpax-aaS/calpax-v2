import { getTranslations } from 'next-intl/server'

export default async function VerifyPage() {
  const t = await getTranslations('signin')

  return (
    <main className="min-h-screen flex items-center justify-center">
      <div className="w-full max-w-sm space-y-4 p-8 text-center">
        <h1 className="text-2xl font-bold">{t('verifyTitle')}</h1>
        <p className="text-gray-600">{t('verifySent')}</p>
      </div>
    </main>
  )
}
