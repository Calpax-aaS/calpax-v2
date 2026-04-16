'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button, buttonVariants } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { PassagerTableEditor, type PassagerRow } from '@/components/passager-table-editor'
import { createBillet, updateBillet } from '@/lib/actions/billet'
import { cn } from '@/lib/utils'

type BilletDefaults = {
  typePlannif?: string | null
  dateVolDeb?: Date | null
  dateVolFin?: Date | null
  dateValidite?: Date | null
  dateRappel?: Date | null
  payeurCiv?: string | null
  payeurPrenom?: string | null
  payeurNom?: string | null
  payeurEmail?: string | null
  payeurTelephone?: string | null
  payeurAdresse?: string | null
  payeurCp?: string | null
  payeurVille?: string | null
  montantTtc?: number | null
  lieuDecollage?: string | null
  survol?: string | null
  categorie?: string | null
  provenance?: string | null
  commentaire?: string | null
} | null

type Props = {
  locale: string
  billetId?: string
  defaultValues: BilletDefaults
  defaultPassagers: PassagerRow[]
}

const TYPE_PLANNIF_OPTIONS = [
  'MATIN',
  'SOIR',
  'TOUTE_LA_JOURNEE',
  'AU_PLUS_VITE',
  'AUTRE',
  'A_DEFINIR',
] as const

function toDateInputValue(date: Date | null | undefined): string {
  if (!date) return ''
  return date instanceof Date ? date.toISOString().substring(0, 10) : ''
}

export function BilletForm({ locale, billetId, defaultValues, defaultPassagers }: Props) {
  const t = useTranslations('billets')
  const [passagers, setPassagers] = useState<PassagerRow[]>(defaultPassagers)
  const [error, setError] = useState<string | null>(null)
  const [typePlannif, setTypePlannif] = useState(defaultValues?.typePlannif ?? 'A_DEFINIR')
  const [payeurCiv, setPayeurCiv] = useState(defaultValues?.payeurCiv ?? '')

  const showDates =
    typePlannif === 'MATIN' || typePlannif === 'SOIR' || typePlannif === 'TOUTE_LA_JOURNEE'

  async function handleSubmit(formData: FormData) {
    formData.set('passagers', JSON.stringify(passagers))
    formData.set('payeurCiv', payeurCiv)
    formData.set('typePlannif', typePlannif)
    const result = billetId
      ? await updateBillet(billetId, locale, formData)
      : await createBillet(locale, formData)
    if (result?.error) {
      setError(result.error)
      toast.error(result.error)
    } else {
      toast.success(t('saveSuccess'))
    }
  }

  const isNew = !billetId
  const backHref = isNew ? `/${locale}/billets` : `/${locale}/billets/${billetId}`

  return (
    <form action={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Section Payeur */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Payeur</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {t('fields.payeurCiv')}
            </Label>
            <Select value={payeurCiv} onValueChange={setPayeurCiv}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="—" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="M.">M.</SelectItem>
                <SelectItem value="Mme">Mme</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label
                htmlFor="payeurPrenom"
                className="text-xs font-medium uppercase tracking-wider text-muted-foreground"
              >
                {t('fields.payeurPrenom')} *
              </Label>
              <Input
                id="payeurPrenom"
                name="payeurPrenom"
                defaultValue={defaultValues?.payeurPrenom ?? ''}
                required
              />
            </div>
            <div className="space-y-1">
              <Label
                htmlFor="payeurNom"
                className="text-xs font-medium uppercase tracking-wider text-muted-foreground"
              >
                {t('fields.payeurNom')} *
              </Label>
              <Input
                id="payeurNom"
                name="payeurNom"
                defaultValue={defaultValues?.payeurNom ?? ''}
                required
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label
              htmlFor="payeurEmail"
              className="text-xs font-medium uppercase tracking-wider text-muted-foreground"
            >
              {t('fields.payeurEmail')}
            </Label>
            <Input
              id="payeurEmail"
              name="payeurEmail"
              type="email"
              defaultValue={defaultValues?.payeurEmail ?? ''}
            />
          </div>
          <div className="space-y-1">
            <Label
              htmlFor="payeurTelephone"
              className="text-xs font-medium uppercase tracking-wider text-muted-foreground"
            >
              {t('fields.payeurTelephone')}
            </Label>
            <Input
              id="payeurTelephone"
              name="payeurTelephone"
              defaultValue={defaultValues?.payeurTelephone ?? ''}
            />
          </div>
          <div className="space-y-1">
            <Label
              htmlFor="payeurAdresse"
              className="text-xs font-medium uppercase tracking-wider text-muted-foreground"
            >
              {t('fields.payeurAdresse')}
            </Label>
            <Input
              id="payeurAdresse"
              name="payeurAdresse"
              defaultValue={defaultValues?.payeurAdresse ?? ''}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label
                htmlFor="payeurCp"
                className="text-xs font-medium uppercase tracking-wider text-muted-foreground"
              >
                {t('fields.payeurCp')}
              </Label>
              <Input id="payeurCp" name="payeurCp" defaultValue={defaultValues?.payeurCp ?? ''} />
            </div>
            <div className="space-y-1">
              <Label
                htmlFor="payeurVille"
                className="text-xs font-medium uppercase tracking-wider text-muted-foreground"
              >
                {t('fields.payeurVille')}
              </Label>
              <Input
                id="payeurVille"
                name="payeurVille"
                defaultValue={defaultValues?.payeurVille ?? ''}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Section Planification */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Planification</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {t('fields.typePlannif')} *
            </Label>
            <Select value={typePlannif} onValueChange={setTypePlannif}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TYPE_PLANNIF_OPTIONS.map((opt) => (
                  <SelectItem key={opt} value={opt}>
                    {t(`typePlannif.${opt}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label
              htmlFor="montantTtc"
              className="text-xs font-medium uppercase tracking-wider text-muted-foreground"
            >
              {t('fields.montantTtc')} *
            </Label>
            <Input
              id="montantTtc"
              name="montantTtc"
              type="number"
              min="0"
              step="0.01"
              defaultValue={
                defaultValues?.montantTtc != null ? String(defaultValues.montantTtc) : ''
              }
              required
            />
          </div>
          {showDates && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label
                  htmlFor="dateVolDeb"
                  className="text-xs font-medium uppercase tracking-wider text-muted-foreground"
                >
                  {t('fields.dateVolDeb')}
                </Label>
                <Input
                  id="dateVolDeb"
                  name="dateVolDeb"
                  type="date"
                  defaultValue={toDateInputValue(defaultValues?.dateVolDeb)}
                />
              </div>
              <div className="space-y-1">
                <Label
                  htmlFor="dateVolFin"
                  className="text-xs font-medium uppercase tracking-wider text-muted-foreground"
                >
                  {t('fields.dateVolFin')}
                </Label>
                <Input
                  id="dateVolFin"
                  name="dateVolFin"
                  type="date"
                  defaultValue={toDateInputValue(defaultValues?.dateVolFin)}
                />
              </div>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label
                htmlFor="dateValidite"
                className="text-xs font-medium uppercase tracking-wider text-muted-foreground"
              >
                {t('fields.dateValidite')}
              </Label>
              <Input
                id="dateValidite"
                name="dateValidite"
                type="date"
                defaultValue={toDateInputValue(defaultValues?.dateValidite)}
              />
            </div>
            <div className="space-y-1">
              <Label
                htmlFor="dateRappel"
                className="text-xs font-medium uppercase tracking-wider text-muted-foreground"
              >
                {t('fields.dateRappel')}
              </Label>
              <Input
                id="dateRappel"
                name="dateRappel"
                type="date"
                defaultValue={toDateInputValue(defaultValues?.dateRappel)}
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label
              htmlFor="lieuDecollage"
              className="text-xs font-medium uppercase tracking-wider text-muted-foreground"
            >
              {t('fields.lieuDecollage')}
            </Label>
            <Input
              id="lieuDecollage"
              name="lieuDecollage"
              defaultValue={defaultValues?.lieuDecollage ?? ''}
            />
          </div>
          <div className="space-y-1">
            <Label
              htmlFor="survol"
              className="text-xs font-medium uppercase tracking-wider text-muted-foreground"
            >
              {t('fields.survol')}
            </Label>
            <Input id="survol" name="survol" defaultValue={defaultValues?.survol ?? ''} />
          </div>
          <div className="space-y-1">
            <Label
              htmlFor="categorie"
              className="text-xs font-medium uppercase tracking-wider text-muted-foreground"
            >
              {t('fields.categorie')}
            </Label>
            <Input id="categorie" name="categorie" defaultValue={defaultValues?.categorie ?? ''} />
          </div>
          <div className="space-y-1">
            <Label
              htmlFor="provenance"
              className="text-xs font-medium uppercase tracking-wider text-muted-foreground"
            >
              {t('fields.provenance')}
            </Label>
            <Input
              id="provenance"
              name="provenance"
              defaultValue={defaultValues?.provenance ?? ''}
            />
          </div>
          <div className="space-y-1">
            <Label
              htmlFor="commentaire"
              className="text-xs font-medium uppercase tracking-wider text-muted-foreground"
            >
              {t('fields.commentaire')}
            </Label>
            <Textarea
              id="commentaire"
              name="commentaire"
              defaultValue={defaultValues?.commentaire ?? ''}
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Section Passagers */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Passagers</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <PassagerTableEditor passagers={passagers} onChange={setPassagers} />
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3">
        <Link href={backHref} className={cn(buttonVariants({ variant: 'outline' }))}>
          {t('backToList')}
        </Link>
        <Button type="submit">{t('save')}</Button>
      </div>
    </form>
  )
}
