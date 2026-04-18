import { getTranslations } from 'next-intl/server'
import Link from 'next/link'
import { requireAuth } from '@/lib/auth/requireAuth'
import { db } from '@/lib/db'
import { getContext } from '@/lib/context'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { VolCreateForm } from './vol-create-form'

type Props = {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ date?: string; creneau?: string }>
}

export default async function VolCreatePage({ params, searchParams }: Props) {
  const { locale } = await params
  const { date, creneau } = await searchParams

  return requireAuth(async () => {
    const t = await getTranslations('vols')
    const ctx = getContext()

    const [ballons, pilotes, equipiers, vehicules, sites] = await Promise.all([
      db.ballon.findMany({
        where: { actif: true, exploitantId: ctx.exploitantId },
        orderBy: [{ volumeM3: 'desc' }, { immatriculation: 'asc' }],
        select: {
          id: true,
          nom: true,
          immatriculation: true,
          configGaz: true,
          camoExpiryDate: true,
        },
      }),
      db.pilote.findMany({
        where: { actif: true, exploitantId: ctx.exploitantId },
        orderBy: { nom: 'asc' },
        select: { id: true, prenom: true, nom: true, dateExpirationLicence: true },
      }),
      db.equipier.findMany({
        where: { actif: true, exploitantId: ctx.exploitantId },
        orderBy: { nom: 'asc' },
        select: { id: true, prenom: true, nom: true },
      }),
      db.vehicule.findMany({
        where: { actif: true, exploitantId: ctx.exploitantId },
        orderBy: { nom: 'asc' },
        select: { id: true, nom: true },
      }),
      db.siteDecollage.findMany({
        where: { actif: true, exploitantId: ctx.exploitantId },
        orderBy: { nom: 'asc' },
        select: { id: true, nom: true },
      }),
    ])

    return (
      <main className="container mx-auto max-w-2xl px-4 py-8 space-y-6">
        <div className="flex items-center gap-4">
          <Link
            href={`/${locale}/vols`}
            className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }))}
          >
            {t('backToList')}
          </Link>
          <h1 className="text-2xl font-bold">{t('new')}</h1>
        </div>

        <VolCreateForm
          locale={locale}
          ballons={ballons.map((b) => ({
            ...b,
            camoExpiryDate: b.camoExpiryDate?.toISOString() ?? null,
          }))}
          pilotes={pilotes.map((p) => ({
            ...p,
            dateExpirationLicence: p.dateExpirationLicence.toISOString(),
          }))}
          equipiers={equipiers}
          vehicules={vehicules}
          sites={sites}
          defaultDate={date ?? ''}
          defaultCreneau={creneau ?? 'MATIN'}
        />
      </main>
    )
  })
}
