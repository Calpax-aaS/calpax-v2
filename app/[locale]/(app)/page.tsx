import { getTranslations } from 'next-intl/server'
import { requireAuth } from '@/lib/auth/requireAuth'
import { getContext } from '@/lib/context'
import { db } from '@/lib/db'

type Props = {
  params: Promise<{ locale: string }>
}

export default async function HomePage({ params }: Props) {
  const { locale } = await params
  const t = await getTranslations('home')

  return requireAuth(async () => {
    const ctx = getContext()

    const [exploitant, user] = await Promise.all([
      db.exploitant.findFirst({ where: { id: ctx.exploitantId } }),
      db.user.findFirst({ where: { id: ctx.userId } }),
    ])

    return (
      <main className="min-h-screen flex flex-col items-center justify-center gap-6">
        <p className="text-xl">
          {t('signedInAs', {
            name: user?.name ?? user?.email ?? 'Unknown',
            exploitant: exploitant?.name ?? ctx.exploitantId,
          })}
        </p>
        <form action={`/${locale}/signout`} method="POST">
          <button
            type="submit"
            className="bg-black text-white rounded px-4 py-2 text-sm font-medium"
          >
            {t('signOut')}
          </button>
        </form>
      </main>
    )
  })
}
