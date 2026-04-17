import { requireAuth } from '@/lib/auth/requireAuth'
import { db } from '@/lib/db'
import { redirect, notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { PostVolWizard } from '@/components/post-vol-wizard'

type Props = {
  params: Promise<{ locale: string; id: string }>
}

export default async function PostVolPage({ params }: Props) {
  return requireAuth(async () => {
    const { locale, id } = await params
    const t = await getTranslations('vols')

    const vol = await db.vol.findUnique({
      where: { id },
      include: {
        ballon: { select: { configGaz: true } },
        siteDecollageEntity: { select: { nom: true } },
      },
    })

    if (!vol) notFound()
    if (vol.statut === 'ARCHIVE' || vol.statut === 'ANNULE') {
      redirect(`/${locale}/vols/${id}`)
    }

    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold tracking-tight">{t('postVol.title')}</h1>
        <PostVolWizard
          volId={id}
          locale={locale}
          defaultDecoLieu={vol.siteDecollageEntity?.nom ?? ''}
          configGaz={vol.ballon.configGaz}
        />
      </div>
    )
  })
}
