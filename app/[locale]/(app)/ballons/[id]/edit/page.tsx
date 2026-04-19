import { getTranslations } from 'next-intl/server'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireAuth } from '@/lib/auth/requireAuth'
import { db } from '@/lib/db'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { BallonEditForm } from './ballon-edit-form'

type Props = {
  params: Promise<{ locale: string; id: string }>
}

export default async function BallonEditPage({ params }: Props) {
  const { locale, id } = await params
  return requireAuth(async () => {
    const t = await getTranslations('ballons')

    const ballon = await db.ballon.findUnique({ where: { id } })
    if (!ballon) notFound()

    const chart = (ballon.performanceChart ?? {}) as Record<string, number>

    const camoExpiryDateStr = ballon.camoExpiryDate
      ? ballon.camoExpiryDate.toISOString().substring(0, 10)
      : ''

    return (
      <main className="container mx-auto max-w-2xl px-4 py-8 space-y-6">
        <div className="flex items-center gap-4">
          <Link
            href={`/${locale}/ballons/${id}`}
            className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }))}
          >
            {t('backToList')}
          </Link>
          <h1 className="text-2xl font-bold">{t('editTitle')}</h1>
        </div>

        <BallonEditForm
          locale={locale}
          ballonId={id}
          ballon={{
            nom: ballon.nom,
            immatriculation: ballon.immatriculation,
            volumeM3: ballon.volumeM3,
            nbPassagerMax: ballon.nbPassagerMax,
            peseeAVide: ballon.peseeAVide,
            configGaz: ballon.configGaz,
            manexAnnexRef: ballon.manexAnnexRef,
            mtom: ballon.mtom,
            mlm: ballon.mlm,
            camoOrganisme: ballon.camoOrganisme,
            camoExpiryDate: camoExpiryDateStr,
            certificatNavigabilite: ballon.certificatNavigabilite,
            actif: ballon.actif,
          }}
          performanceChart={chart}
        />
      </main>
    )
  })
}
