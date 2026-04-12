import { getTranslations } from 'next-intl/server'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth/requireAuth'
import { db } from '@/lib/db'
import { getContext } from '@/lib/context'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { VolCreateForm } from '../../create/vol-create-form'

type Props = {
  params: Promise<{ locale: string; id: string }>
}

export default async function VolEditPage({ params }: Props) {
  const { locale, id } = await params

  return requireAuth(async () => {
    const t = await getTranslations('vols')
    const ctx = getContext()

    const vol = await db.vol.findUnique({ where: { id } })
    if (!vol) notFound()

    if (vol.statut !== 'PLANIFIE' && vol.statut !== 'CONFIRME') {
      redirect(`/${locale}/vols/${id}`)
    }

    const [ballons, pilotes] = await Promise.all([
      db.ballon.findMany({
        where: { actif: true, exploitantId: ctx.exploitantId },
        orderBy: { nom: 'asc' },
        select: { id: true, nom: true, immatriculation: true, configGaz: true },
      }),
      db.pilote.findMany({
        where: { actif: true, exploitantId: ctx.exploitantId },
        orderBy: { nom: 'asc' },
        select: { id: true, prenom: true, nom: true },
      }),
    ])

    return (
      <main className="container mx-auto max-w-2xl px-4 py-8 space-y-6">
        <div className="flex items-center gap-4">
          <Link
            href={`/${locale}/vols/${id}`}
            className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }))}
          >
            {t('backToList')}
          </Link>
          <h1 className="text-2xl font-bold">{t('edit')}</h1>
        </div>

        <VolCreateForm
          locale={locale}
          ballons={ballons}
          pilotes={pilotes}
          volId={id}
          defaultDate={vol.date.toISOString().slice(0, 10)}
          defaultCreneau={vol.creneau}
          defaultBallonId={vol.ballonId}
          defaultPiloteId={vol.piloteId}
          defaultEquipier={vol.equipier ?? ''}
          defaultVehicule={vol.vehicule ?? ''}
          defaultLieuDecollage={vol.lieuDecollage ?? ''}
          defaultConfigGaz={vol.configGaz ?? ''}
          defaultQteGaz={vol.qteGaz != null ? String(vol.qteGaz) : ''}
        />
      </main>
    )
  })
}
