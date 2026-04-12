import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { requireAuth } from '@/lib/auth/requireAuth'
import { db } from '@/lib/db'
import { PostVolForm } from './post-vol-form'

type Props = {
  params: Promise<{ locale: string; id: string }>
}

export default async function PostVolPage({ params }: Props) {
  const { locale, id } = await params

  return requireAuth(async () => {
    const t = await getTranslations('vols')

    const vol = await db.vol.findUnique({
      where: { id },
      select: { id: true, statut: true },
    })

    if (!vol || vol.statut === 'ARCHIVE' || vol.statut === 'ANNULE') {
      redirect(`/${locale}/vols/${id}`)
    }

    return (
      <main className="container mx-auto max-w-3xl px-4 py-8 space-y-6">
        <h1 className="text-2xl font-bold">{t('postVol.title')}</h1>
        <PostVolForm volId={id} locale={locale} />
      </main>
    )
  })
}
