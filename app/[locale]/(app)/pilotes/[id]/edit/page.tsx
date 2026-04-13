import { getTranslations } from 'next-intl/server'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireAuth } from '@/lib/auth/requireAuth'
import { db } from '@/lib/db'
import { decrypt } from '@/lib/crypto'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { PiloteEditForm } from './pilote-edit-form'

type Props = {
  params: Promise<{ locale: string; id: string }>
}

export default async function PiloteEditPage({ params }: Props) {
  const { locale, id } = await params
  return requireAuth(async () => {
    const t = await getTranslations('pilotes')

    const pilote = await db.pilote.findUnique({ where: { id } })
    if (!pilote) notFound()

    let poids: number | null = null
    if (pilote.poidsEncrypted) {
      try {
        poids = Number(decrypt(pilote.poidsEncrypted))
      } catch {
        poids = null
      }
    }

    const dateExpirationStr = pilote.dateExpirationLicence
      ? pilote.dateExpirationLicence.toISOString().substring(0, 10)
      : ''

    return (
      <main className="container mx-auto max-w-2xl px-4 py-8 space-y-6">
        <div className="flex items-center gap-4">
          <Link
            href={`/${locale}/pilotes/${id}`}
            className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }))}
          >
            {t('backToList')}
          </Link>
          <h1 className="text-2xl font-bold">{t('editTitle')}</h1>
        </div>

        <PiloteEditForm
          locale={locale}
          piloteId={id}
          pilote={{
            prenom: pilote.prenom,
            nom: pilote.nom,
            email: pilote.email,
            telephone: pilote.telephone,
            poids,
            licenceBfcl: pilote.licenceBfcl,
            dateExpirationLicence: dateExpirationStr,
            qualificationCommerciale: pilote.qualificationCommerciale,
            qualificationNuit: pilote.qualificationNuit,
            qualificationInstructeur: pilote.qualificationInstructeur,
            qualificationCaptif: pilote.qualificationCaptif,
            classeA: pilote.classeA,
            classeB: pilote.classeB,
            classeC: pilote.classeC,
            classeD: pilote.classeD,
            groupeA1: pilote.groupeA1,
            groupeA2: pilote.groupeA2,
            groupeA3: pilote.groupeA3,
            groupeA4: pilote.groupeA4,
            heuresDeVol: pilote.heuresDeVol,
          }}
        />
      </main>
    )
  })
}
