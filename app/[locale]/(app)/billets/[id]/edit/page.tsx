import { getTranslations } from 'next-intl/server'
import { notFound } from 'next/navigation'
import { requireAuth } from '@/lib/auth/requireAuth'
import { db } from '@/lib/db'
import { safeDecryptIntOrNull, safeDecryptString } from '@/lib/crypto'
import { BilletForm } from './billet-form'
import type { PassagerRow } from '@/components/passager-table-editor'

type Props = {
  params: Promise<{ locale: string; id: string }>
}

export default async function BilletEditPage({ params }: Props) {
  const { locale, id } = await params
  return requireAuth(async () => {
    const t = await getTranslations('billets')
    const isNew = id === 'new'

    let billet = null
    let passagers: PassagerRow[] = []

    if (!isNew) {
      billet = await db.billet.findUnique({ where: { id }, include: { passagers: true } })
      if (!billet) notFound()

      passagers = billet.passagers.map((p) => {
        const poids = safeDecryptIntOrNull(p.poidsEncrypted)
        return {
          prenom: p.prenom,
          nom: p.nom,
          email: safeDecryptString(p.emailEncrypted) ?? '',
          telephone: safeDecryptString(p.telephoneEncrypted) ?? '',
          age: p.age != null ? String(p.age) : '',
          poids: poids != null ? String(poids) : '',
          pmr: p.pmr,
        }
      })
    }

    return (
      <main className="container mx-auto max-w-3xl px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">{isNew ? t('new') : t('edit')}</h1>
        <BilletForm
          locale={locale}
          billetId={isNew ? undefined : id}
          defaultValues={billet ? { ...billet, montantTtc: Number(billet.montantTtc) } : null}
          defaultPassagers={passagers}
        />
      </main>
    )
  })
}
