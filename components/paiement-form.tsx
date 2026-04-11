'use client'

import { useTranslations } from 'next-intl'
import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { addPaiement } from '@/lib/actions/paiement'

const MODES = ['ESPECES', 'CHEQUE', 'CB', 'VIREMENT', 'CHEQUE_VACANCES', 'AVOIR'] as const

type Props = { billetId: string; locale: string }

export function PaiementForm({ billetId, locale }: Props) {
  const t = useTranslations('paiements')
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!open) {
    return (
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        {t('add')}
      </Button>
    )
  }

  async function handleSubmit(formData: FormData) {
    const result = await addPaiement(billetId, locale, formData)
    if (result?.error) {
      setError(result.error)
    } else {
      setOpen(false)
      setError(null)
    }
  }

  return (
    <form action={handleSubmit} className="border rounded p-4 space-y-3">
      {error && <div className="text-red-600 text-sm">{error}</div>}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>{t('fields.modePaiement')}</Label>
          <select
            name="modePaiement"
            required
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="" />
            {MODES.map((m) => (
              <option key={m} value={m}>
                {t(`modes.${m}`)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label>{t('fields.montantTtc')}</Label>
          <Input name="montantTtc" type="number" min="0" required />
        </div>
        <div>
          <Label>{t('fields.datePaiement')}</Label>
          <Input name="datePaiement" type="date" required />
        </div>
        <div>
          <Label>{t('fields.dateEncaissement')}</Label>
          <Input name="dateEncaissement" type="date" />
        </div>
        <div className="col-span-2">
          <Label>{t('fields.commentaire')}</Label>
          <Input name="commentaire" />
        </div>
      </div>
      <div className="flex gap-2">
        <Button type="submit" size="sm">
          {t('add')}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
          Annuler
        </Button>
      </div>
    </form>
  )
}
