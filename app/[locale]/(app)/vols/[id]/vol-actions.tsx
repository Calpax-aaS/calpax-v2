'use client'

import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { useTransition } from 'react'
import { toast } from 'sonner'
import { Button, buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { cancelVol, archivePve } from '@/lib/actions/vol'
import { confirmerVol } from '@/lib/actions/organisation'

type Props = {
  volId: string
  locale: string
  statut: string
  canEdit?: boolean
}

export function VolActions({ volId, locale, statut, canEdit = true }: Props) {
  const t = useTranslations('vols')
  const [pending, startTransition] = useTransition()

  function handleCancel() {
    if (!window.confirm(t('confirmCancel'))) return
    startTransition(async () => {
      const result = await cancelVol(volId, locale)
      if (result?.error) toast.error(result.error)
    })
  }

  function handleConfirmer() {
    startTransition(async () => {
      const result = await confirmerVol(volId, locale)
      if (result?.error) toast.error(result.error)
    })
  }

  function handleArchive() {
    if (!window.confirm(t('confirmArchive'))) return
    startTransition(async () => {
      const result = await archivePve(volId, locale)
      if (result?.error) toast.error(result.error)
    })
  }

  const showFiche = statut === 'CONFIRME' || statut === 'TERMINE'

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {showFiche && (
        <a
          href={`/api/vols/${volId}/fiche-vol`}
          download
          className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
        >
          {t('downloadFiche')}
        </a>
      )}
      {(statut === 'PLANIFIE' || statut === 'CONFIRME') && (
        <Link
          href={`/${locale}/vols/${volId}/post-vol`}
          className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
        >
          {t('postVolLink')}
        </Link>
      )}
      {canEdit && statut === 'PLANIFIE' && (
        <Button size="sm" disabled={pending} onClick={handleConfirmer}>
          {t('confirmer')}
        </Button>
      )}
      {canEdit && statut === 'TERMINE' && (
        <Button size="sm" disabled={pending} onClick={handleArchive}>
          {t('archivePve')}
        </Button>
      )}
      {statut === 'ARCHIVE' && (
        <a
          href={`/api/vols/${volId}/pve`}
          download
          className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
        >
          {t('downloadPve')}
        </a>
      )}
      {canEdit && statut !== 'ARCHIVE' && statut !== 'ANNULE' && (
        <Button variant="destructive" size="sm" disabled={pending} onClick={handleCancel}>
          {t('cancel')}
        </Button>
      )}
    </div>
  )
}
