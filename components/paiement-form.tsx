'use client'

import { useTranslations } from 'next-intl'
import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { AlertCircle, Loader2 } from 'lucide-react'
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
import { formLabelClass as labelClassName } from '@/lib/ui'

const MODES = ['ESPECES', 'CHEQUE', 'CB', 'VIREMENT', 'CHEQUE_VACANCES', 'AVOIR'] as const

type Props = { billetId: string; locale: string }

export function PaiementForm({ billetId, locale }: Props) {
  const t = useTranslations('paiements')
  const tc = useTranslations('common')
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [modePaiement, setModePaiement] = useState<string>('')
  const [pending, startTransition] = useTransition()

  if (!open) {
    return (
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        {t('add')}
      </Button>
    )
  }

  function handleSubmit(formData: FormData) {
    formData.set('modePaiement', modePaiement)
    startTransition(async () => {
      const result = await addPaiement(billetId, locale, formData)
      if (result?.error) {
        setError(result.error)
        toast.error(result.error)
      } else {
        setOpen(false)
        setError(null)
        setModePaiement('')
        toast.success(t('saveSuccess'))
      }
    })
  }

  return (
    <form action={handleSubmit} className="border rounded p-4 space-y-3">
      {error && (
        <div
          role="alert"
          aria-live="polite"
          className="flex items-start gap-2 rounded border border-red-200 bg-red-50 p-2 text-sm text-red-700"
        >
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
        <Button type="submit" size="sm" disabled={pending}>
          {pending && <Loader2 className="h-4 w-4 animate-spin mr-1" aria-hidden="true" />}
          {pending ? tc('saving') : t('add')}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setOpen(false)}
          disabled={pending}
        >
          {tc('cancel')}
        </Button>
      </div>
    </form>
  )
}
