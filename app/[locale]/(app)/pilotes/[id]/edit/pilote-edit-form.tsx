'use client'

import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button, buttonVariants } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { updatePilote } from '@/lib/actions/pilote'
import { cn } from '@/lib/utils'

const labelClassName = 'text-xs font-medium uppercase tracking-wider text-muted-foreground'

type Props = {
  locale: string
  piloteId: string
  pilote: {
    prenom: string
    nom: string
    email: string | null
    telephone: string | null
    poids: number | null
    licenceBfcl: string
    dateExpirationLicence: string
    qualificationCommerciale: boolean
    qualificationNuit: boolean
    qualificationInstructeur: boolean
    qualificationCaptif: boolean
    classeA: boolean
    classeB: boolean
    classeC: boolean
    classeD: boolean
    groupeA1: boolean
    groupeA2: boolean
    groupeA3: boolean
    groupeA4: boolean
    heuresDeVol: number | null
  }
}

export function PiloteEditForm({ locale, piloteId, pilote }: Props) {
  const t = useTranslations('pilotes')

  async function handleUpdate(formData: FormData) {
    const result = await updatePilote(piloteId, locale, formData)
    if (result?.error) {
      toast.error(result.error)
    } else {
      toast.success(t('saveSuccess'))
    }
  }

  return (
    <form action={handleUpdate} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Identite</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="prenom" className={labelClassName}>
                {t('fields.prenom')} *
              </Label>
              <Input id="prenom" name="prenom" defaultValue={pilote.prenom} required />
            </div>
            <div className="space-y-1">
              <Label htmlFor="nom" className={labelClassName}>
                {t('fields.nom')} *
              </Label>
              <Input id="nom" name="nom" defaultValue={pilote.nom} required />
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="email" className={labelClassName}>
              {t('fields.email')}
            </Label>
            <Input id="email" name="email" type="email" defaultValue={pilote.email ?? ''} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="telephone" className={labelClassName}>
              {t('fields.telephone')}
            </Label>
            <Input id="telephone" name="telephone" defaultValue={pilote.telephone ?? ''} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="poids" className={labelClassName}>
              {t('fields.poids')}{' '}
              <span className="text-xs text-muted-foreground">({t('fields.poidsNote')})</span>
            </Label>
            <Input
              id="poids"
              name="poids"
              type="number"
              min="1"
              step="0.1"
              defaultValue={pilote.poids ?? ''}
            />
          </div>
        </CardContent>
      </Card>

      <Separator />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Licence BFCL</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="licenceBfcl" className={labelClassName}>
              {t('fields.licenceBfcl')} *
            </Label>
            <Input id="licenceBfcl" name="licenceBfcl" defaultValue={pilote.licenceBfcl} required />
          </div>
          <div className="space-y-1">
            <Label htmlFor="dateExpirationLicence" className={labelClassName}>
              {t('fields.dateExpirationLicence')} *
            </Label>
            <Input
              id="dateExpirationLicence"
              name="dateExpirationLicence"
              type="date"
              defaultValue={pilote.dateExpirationLicence}
              required
            />
          </div>
          <div className="flex items-center gap-3">
            <input
              id="qualificationCommerciale"
              name="qualificationCommerciale"
              type="checkbox"
              defaultChecked={pilote.qualificationCommerciale}
              className="h-4 w-4 rounded border-input"
            />
            <Label htmlFor="qualificationCommerciale" className={labelClassName}>
              {t('fields.qualificationCommerciale')}
            </Label>
          </div>
          <div className="flex items-center gap-3">
            <input
              id="qualificationNuit"
              name="qualificationNuit"
              type="checkbox"
              defaultChecked={pilote.qualificationNuit}
              className="h-4 w-4 rounded border-input"
            />
            <Label htmlFor="qualificationNuit" className={labelClassName}>
              {t('fields.qualificationNuit')}
            </Label>
          </div>
          <div className="flex items-center gap-3">
            <input
              id="qualificationInstructeur"
              name="qualificationInstructeur"
              type="checkbox"
              defaultChecked={pilote.qualificationInstructeur}
              className="h-4 w-4 rounded border-input"
            />
            <Label htmlFor="qualificationInstructeur" className={labelClassName}>
              {t('fields.qualificationInstructeur')}
            </Label>
          </div>
          <div className="flex items-center gap-3">
            <input
              id="qualificationCaptif"
              name="qualificationCaptif"
              type="checkbox"
              defaultChecked={pilote.qualificationCaptif}
              className="h-4 w-4 rounded border-input"
            />
            <Label htmlFor="qualificationCaptif" className={labelClassName}>
              {t('fields.qualificationCaptif')}
            </Label>
          </div>
        </CardContent>
      </Card>

      <Separator />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('sections.classesBfcl')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className={labelClassName}>{t('fields.classesBfcl')}</Label>
            <div className="flex gap-4">
              {(['A', 'B', 'C', 'D'] as const).map((cls) => (
                <div key={cls} className="flex items-center gap-2">
                  <input
                    id={`classe${cls}`}
                    name={`classe${cls}`}
                    type="checkbox"
                    defaultChecked={pilote[`classe${cls}` as keyof typeof pilote] as boolean}
                    className="h-4 w-4 rounded border-input"
                  />
                  <Label htmlFor={`classe${cls}`}>{t(`classes.${cls}`)}</Label>
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label className={labelClassName}>{t('fields.groupesA')}</Label>
            <div className="flex gap-4">
              {([1, 2, 3, 4] as const).map((g) => (
                <div key={g} className="flex items-center gap-2">
                  <input
                    id={`groupeA${g}`}
                    name={`groupeA${g}`}
                    type="checkbox"
                    defaultChecked={pilote[`groupeA${g}` as keyof typeof pilote] as boolean}
                    className="h-4 w-4 rounded border-input"
                  />
                  <Label htmlFor={`groupeA${g}`}>{t(`groupes.A${g}`)}</Label>
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="heuresDeVol" className={labelClassName}>
              {t('fields.heuresDeVol')}
            </Label>
            <Input
              id="heuresDeVol"
              name="heuresDeVol"
              type="number"
              min="0"
              defaultValue={pilote.heuresDeVol ?? ''}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3">
        <Link
          href={`/${locale}/pilotes/${piloteId}`}
          className={cn(buttonVariants({ variant: 'outline' }))}
        >
          {t('backToList')}
        </Link>
        <Button type="submit">{t('saveButton')}</Button>
      </div>
    </form>
  )
}
