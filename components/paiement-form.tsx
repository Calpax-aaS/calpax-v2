'use client'

import { useTranslations } from 'next-intl'
import { useState } from 'react'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { addPaiement } from '@/lib/actions/paiement'

const MODES = ['ESPECES', 'CHEQUE', 'CB', 'VIREMENT', 'CHEQUE_VACANCES', 'AVOIR'] as const

const labelClassName = 'text-xs font-medium uppercase tracking-wider text-muted-foreground'

type Props = { billetId: string; locale: string }

export function PaiementForm({ billetId, locale }: Props) {
  const t = useTranslations('paiements')
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [modePaiement, setModePaiement] = useState<string>('')

  if (!open) {
    return (
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        {t('add')}
      </Button>
    )
  }

  async function handleSubmit(formData: FormData) {
    formData.set('modePaiement', modePaiement)
    const result = await addPaiement(billetId, locale, formData)
    if (result?.error) {
      setError(result.error)
      toast.error(result.error)
    } else {
      setOpen(false)
      setError(null)
      setModePaiement('')
      toast.success('Paiement enregistre')
    }
  }

  return (
    <form action={handleSubmit} className="border rounded p-4 space-y-3">
      {error && <div className="text-red-600 text-sm">{error}</div>}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className={labelClassName}>{t('fields.modePaiement')}</Label>
          <Select value={modePaiement} onValueChange={setModePaiement}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="--" />
            </SelectTrigger>
            <SelectContent>
              {MODES.map((m) => (
                <SelectItem key={m} value={m}>
                  {t(`modes.${m}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className={labelClassName}>{t('fields.montantTtc')}</Label>
          <Input name="montantTtc" type="number" min="0" required />
        </div>
        <div>
          <Label className={labelClassName}>{t('fields.datePaiement')}</Label>
          <Input name="datePaiement" type="date" required />
        </div>
        <div>
          <Label className={labelClassName}>{t('fields.dateEncaissement')}</Label>
          <Input name="dateEncaissement" type="date" />
        </div>
        <div className="col-span-2">
          <Label className={labelClassName}>{t('fields.commentaire')}</Label>
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
