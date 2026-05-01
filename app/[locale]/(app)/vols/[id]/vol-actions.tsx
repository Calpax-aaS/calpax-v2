'use client'

import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { useState } from 'react'
import { Button, buttonVariants } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { cn } from '@/lib/utils'
import { cancelVol, archivePve } from '@/lib/actions/vol'
import { confirmerVol } from '@/lib/actions/organisation'

type Props = {
  volId: string
  locale: string
  statut: string
  canEdit?: boolean
}

type DialogKind = 'cancel' | 'archive' | null

export function VolActions({ volId, locale, statut, canEdit = true }: Props) {
  const t = useTranslations('vols')
  const [error, setError] = useState<string | null>(null)
  const [dialog, setDialog] = useState<DialogKind>(null)

  async function handleCancel() {
    setError(null)
    const result = await cancelVol(volId, locale)
    if (result?.error) setError(result.error)
  }

  async function handleConfirmer() {
    setError(null)
    const result = await confirmerVol(volId, locale)
    if (result?.error) setError(result.error)
  }

  async function handleArchive() {
    setError(null)
    const result = await archivePve(volId, locale)
    if (result?.error) setError(result.error)
  }

  const showFiche = statut === 'CONFIRME' || statut === 'TERMINE'

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {error && (
        <span role="alert" className="text-destructive text-sm">
          {error}
        </span>
      )}
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
        <Button size="sm" onClick={() => setDialog('archive')}>
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
        <Button variant="destructive" size="sm" onClick={() => setDialog('cancel')}>
          {t('cancel')}
        </Button>
      )}

      <ConfirmDialog
        open={dialog === 'cancel'}
        onOpenChange={(open) => !open && setDialog(null)}
        title={t('cancel')}
        description={t('confirmCancel')}
        confirmLabel={t('cancel')}
        variant="destructive"
        onConfirm={handleCancel}
      />
      <ConfirmDialog
        open={dialog === 'archive'}
        onOpenChange={(open) => !open && setDialog(null)}
        title={t('archivePve')}
        description={t('confirmArchive')}
        confirmLabel={t('archivePve')}
        onConfirm={handleArchive}
      />
    </div>
  )
}
