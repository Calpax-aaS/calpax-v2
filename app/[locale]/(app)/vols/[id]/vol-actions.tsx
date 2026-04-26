'use client'

import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { useState, useTransition } from 'react'
import { toast } from 'sonner'
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

export function VolActions({ volId, locale, statut, canEdit = true }: Props) {
  const t = useTranslations('vols')
  const [, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleCancel() {
    setError(null)
    startTransition(async () => {
      const result = await cancelVol(volId, locale)
      if (result?.error) {
        setError(result.error)
        toast.error(result.error)
        return
      }
      toast.success(t('cancel'))
    })
  }

  function handleConfirmer() {
    setError(null)
    startTransition(async () => {
      const result = await confirmerVol(volId, locale)
      if (result?.error) {
        setError(result.error)
        toast.error(result.error)
        return
      }
      toast.success(t('confirmer'))
    })
  }

  function handleArchive() {
    setError(null)
    startTransition(async () => {
      const result = await archivePve(volId, locale)
      if (result?.error) {
        setError(result.error)
        toast.error(result.error)
        return
      }
      toast.success(t('archivePve'))
    })
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
        <ConfirmDialog
          title={t('confirmArchiveTitle')}
          description={t('confirmArchive')}
          confirmLabel={t('archivePve')}
          onConfirm={handleArchive}
          trigger={<Button size="sm">{t('archivePve')}</Button>}
        />
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
        <ConfirmDialog
          title={t('confirmCancelTitle')}
          description={t('confirmCancel')}
          confirmLabel={t('cancel')}
          destructive
          onConfirm={handleCancel}
          trigger={
            <Button variant="destructive" size="sm">
              {t('cancel')}
            </Button>
          }
        />
      )}
    </div>
  )
}
