'use client'

import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { useState } from 'react'
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
  const [error, setError] = useState<string | null>(null)

  async function handleCancel() {
    const confirmed = window.confirm(t('confirmCancel'))
    if (!confirmed) return
    const result = await cancelVol(volId, locale)
    if (result?.error) {
      setError(result.error)
    }
  }

  async function handleConfirmer() {
    const result = await confirmerVol(volId, locale)
    if (result?.error) {
      setError(result.error)
    }
  }

  async function handleArchive() {
    const confirmed = window.confirm(t('confirmArchive'))
    if (!confirmed) return
    const result = await archivePve(volId, locale)
    if (result?.error) {
      setError(result.error)
    }
  }

  const showFiche = statut === 'CONFIRME' || statut === 'TERMINE'

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {error && <span className="text-destructive text-sm">{error}</span>}
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
        <Button size="sm" onClick={handleConfirmer}>
          {t('confirmer')}
        </Button>
      )}
      {canEdit && statut === 'TERMINE' && (
        <Button size="sm" onClick={handleArchive}>
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
        <Button variant="destructive" size="sm" onClick={handleCancel}>
          {t('cancel')}
        </Button>
      )}
    </div>
  )
}
