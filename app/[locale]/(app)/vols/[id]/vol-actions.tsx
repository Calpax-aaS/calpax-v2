'use client'

import { useTranslations } from 'next-intl'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { cancelVol } from '@/lib/actions/vol'
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

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {error && <span className="text-destructive text-sm">{error}</span>}
      {statut === 'PLANIFIE' && (
        <Button size="sm" onClick={handleConfirmer}>
          {t('confirmer')}
        </Button>
      )}
      {statut !== 'ARCHIVE' && (
        <Button variant="destructive" size="sm" onClick={handleCancel}>
          {t('cancel')}
        </Button>
      )}
    </div>
  )
}
