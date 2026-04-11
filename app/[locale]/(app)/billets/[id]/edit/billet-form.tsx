'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button, buttonVariants } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
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
  'INDETERMINE',
] as const

function toDateInputValue(date: Date | null | undefined): string {
  if (!date) return ''
  return date instanceof Date ? date.toISOString().substring(0, 10) : ''
}

export function BilletForm({ locale, billetId, defaultValues, defaultPassagers }: Props) {
  const t = useTranslations('billets')
  const [passagers, setPassagers] = useState<PassagerRow[]>(defaultPassagers)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(formData: FormData) {
    formData.set('passagers', JSON.stringify(passagers))
    const result = billetId
      ? await updateBillet(billetId, locale, formData)
      : await createBillet(locale, formData)
    if (result?.error) setError(result.error)
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
            <Label htmlFor="payeurCiv">{t('fields.payeurCiv')}</Label>
            <select
              id="payeurCiv"
              name="payeurCiv"
              defaultValue={defaultValues?.payeurCiv ?? ''}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="">—</option>
              <option value="M.">M.</option>
              <option value="Mme">Mme</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="payeurPrenom">{t('fields.payeurPrenom')} *</Label>
              <Input
                id="payeurPrenom"
                name="payeurPrenom"
                defaultValue={defaultValues?.payeurPrenom ?? ''}
                required
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="payeurNom">{t('fields.payeurNom')} *</Label>
              <Input
                id="payeurNom"
                name="payeurNom"
                defaultValue={defaultValues?.payeurNom ?? ''}
                required
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="payeurEmail">{t('fields.payeurEmail')}</Label>
            <Input
              id="payeurEmail"
              name="payeurEmail"
              type="email"
              defaultValue={defaultValues?.payeurEmail ?? ''}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="payeurTelephone">{t('fields.payeurTelephone')}</Label>
            <Input
              id="payeurTelephone"
              name="payeurTelephone"
              defaultValue={defaultValues?.payeurTelephone ?? ''}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="payeurAdresse">{t('fields.payeurAdresse')}</Label>
            <Input
              id="payeurAdresse"
              name="payeurAdresse"
              defaultValue={defaultValues?.payeurAdresse ?? ''}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="payeurCp">{t('fields.payeurCp')}</Label>
              <Input id="payeurCp" name="payeurCp" defaultValue={defaultValues?.payeurCp ?? ''} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="payeurVille">{t('fields.payeurVille')}</Label>
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
            <Label htmlFor="typePlannif">{t('fields.typePlannif')} *</Label>
            <select
              id="typePlannif"
              name="typePlannif"
              defaultValue={defaultValues?.typePlannif ?? 'INDETERMINE'}
              required
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              {TYPE_PLANNIF_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {t(`typePlannif.${opt}`)}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="montantTtc">{t('fields.montantTtc')} *</Label>
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
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="dateVolDeb">{t('fields.dateVolDeb')}</Label>
              <Input
                id="dateVolDeb"
                name="dateVolDeb"
                type="date"
                defaultValue={toDateInputValue(defaultValues?.dateVolDeb)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="dateVolFin">{t('fields.dateVolFin')}</Label>
              <Input
                id="dateVolFin"
                name="dateVolFin"
                type="date"
                defaultValue={toDateInputValue(defaultValues?.dateVolFin)}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="dateValidite">{t('fields.dateValidite')}</Label>
              <Input
                id="dateValidite"
                name="dateValidite"
                type="date"
                defaultValue={toDateInputValue(defaultValues?.dateValidite)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="dateRappel">{t('fields.dateRappel')}</Label>
              <Input
                id="dateRappel"
                name="dateRappel"
                type="date"
                defaultValue={toDateInputValue(defaultValues?.dateRappel)}
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="lieuDecollage">{t('fields.lieuDecollage')}</Label>
            <Input
              id="lieuDecollage"
              name="lieuDecollage"
              defaultValue={defaultValues?.lieuDecollage ?? ''}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="survol">{t('fields.survol')}</Label>
            <Input id="survol" name="survol" defaultValue={defaultValues?.survol ?? ''} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="categorie">{t('fields.categorie')}</Label>
            <Input id="categorie" name="categorie" defaultValue={defaultValues?.categorie ?? ''} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="provenance">{t('fields.provenance')}</Label>
            <Input
              id="provenance"
              name="provenance"
              defaultValue={defaultValues?.provenance ?? ''}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="commentaire">{t('fields.commentaire')}</Label>
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
