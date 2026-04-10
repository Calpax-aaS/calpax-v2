import { getTranslations } from 'next-intl/server'
import { signIn } from '@/lib/auth'

type Props = {
  params: Promise<{ locale: string }>
}

export default async function SignInPage({ params }: Props) {
  const { locale } = await params
  const t = await getTranslations('signin')

  return (
    <main className="min-h-screen flex items-center justify-center">
      <div className="w-full max-w-sm space-y-6 p-8">
        <h1 className="text-2xl font-bold text-center">{t('title')}</h1>
        <form
          action={async (formData: FormData) => {
            'use server'
            const email = formData.get('email') as string
            await signIn('resend', {
              email,
              redirectTo: `/${locale}`,
            })
          }}
          className="space-y-4"
        >
          <div className="space-y-1">
            <label htmlFor="email" className="block text-sm font-medium">
              {t('emailLabel')}
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              placeholder={t('emailPlaceholder')}
              className="w-full border rounded px-3 py-2 text-sm"
            />
          </div>
          <button
            type="submit"
            className="w-full bg-black text-white rounded px-4 py-2 text-sm font-medium"
          >
            {t('submit')}
          </button>
        </form>
      </div>
    </main>
  )
}
