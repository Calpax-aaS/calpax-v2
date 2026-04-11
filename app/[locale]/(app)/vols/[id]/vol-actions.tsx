'use client'

import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { cancelVol, archivePve } from '@/lib/actions/vol'
import { confirmerVol } from '@/lib/actions/organisation'

type Props = {
  volId: string
  locale: string
  statut: string
}

export function VolActions({ volId, locale, statut }: Props) {
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

  const showFiche = statut === 'CONFIRME' || statut === 'TERMINE' || statut === 'ARCHIVE'

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {error && <span className="text-destructive text-sm">{error}</span>}
      {showFiche && (
        <a
          href={`/api/vols/${volId}/fiche-vol`}
          download
          className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-3"
        >
          {t('downloadFiche')}
        </a>
      )}
      {statut === 'CONFIRME' && (
        <Link
          href={`/${locale}/vols/${volId}/post-vol`}
          className="inline-flex items-center justify-center rounded-md border border-input bg-background px-3 py-1.5 text-sm font-medium hover:bg-accent hover:text-accent-foreground"
        >
          {t('postVolLink')}
        </Link>
      )}
      {statut === 'PLANIFIE' && (
        <Button size="sm" onClick={handleConfirmer}>
          {t('confirmer')}
        </Button>
      )}
      {statut === 'TERMINE' && (
        <Button size="sm" onClick={handleArchive}>
          {t('archivePve')}
        </Button>
      )}
      {statut === 'ARCHIVE' && (
        <a
          href={`/api/vols/${volId}/pve`}
          download
          className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-3"
        >
          {t('downloadPve')}
        </a>
      )}
      {statut !== 'ARCHIVE' && statut !== 'ANNULE' && (
        <Button variant="destructive" size="sm" onClick={handleCancel}>
          {t('cancel')}
        </Button>
      )}
    </div>
  )
}
