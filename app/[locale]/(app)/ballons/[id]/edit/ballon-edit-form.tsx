'use client'

import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button, buttonVariants } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { PerformanceChartInput } from '@/components/performance-chart-input'
import { ConfigGazInput } from '@/components/config-gaz-input'
import { updateBallon } from '@/lib/actions/ballon'
import { cn } from '@/lib/utils'

const labelClassName = 'text-xs font-medium uppercase tracking-wider text-muted-foreground'

type Props = {
  locale: string
  ballonId: string
  ballon: {
    nom: string
    immatriculation: string
    volumeM3: number
    nbPassagerMax: number
    peseeAVide: number
    configGaz: string
    manexAnnexRef: string
    mtom: number | null
    mlm: number | null
    camoOrganisme: string | null
    camoExpiryDate: string
    certificatNavigabilite: string | null
  }
  performanceChart: Record<string, number>
}

export function BallonEditForm({ locale, ballonId, ballon, performanceChart }: Props) {
  const t = useTranslations('ballons')

  async function handleUpdate(formData: FormData) {
    const result = await updateBallon(ballonId, locale, formData)
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
          <CardTitle className="text-base">Informations generales</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="nom" className={labelClassName}>
              {t('fields.nom')} *
            </Label>
            <Input id="nom" name="nom" defaultValue={ballon.nom} required />
          </div>
          <div className="space-y-1">
            <Label htmlFor="immatriculation" className={labelClassName}>
              {t('fields.immatriculation')} *
            </Label>
            <Input
              id="immatriculation"
              name="immatriculation"
              defaultValue={ballon.immatriculation}
              required
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="volumeM3" className={labelClassName}>
              {t('fields.volumeM3')} *
            </Label>
            <Input
              id="volumeM3"
              name="volumeM3"
              type="number"
              min="1"
              defaultValue={ballon.volumeM3}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="nbPassagerMax" className={labelClassName}>
                {t('fields.nbPassagerMax')} *
              </Label>
              <Input
                id="nbPassagerMax"
                name="nbPassagerMax"
                type="number"
                min="1"
                defaultValue={ballon.nbPassagerMax}
                required
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="peseeAVide" className={labelClassName}>
                {t('fields.peseeAVide')} *
              </Label>
              <Input
                id="peseeAVide"
                name="peseeAVide"
                type="number"
                min="1"
                defaultValue={ballon.peseeAVide}
                required
              />
            </div>
          </div>
          <ConfigGazInput
            defaultValue={ballon.configGaz}
            required
            labelClassName={labelClassName}
          />
          <div className="space-y-1">
            <Label htmlFor="manexAnnexRef" className={labelClassName}>
              {t('fields.manexAnnexRef')} *
            </Label>
            <Input
              id="manexAnnexRef"
              name="manexAnnexRef"
              defaultValue={ballon.manexAnnexRef}
              required
            />
            <p className="text-xs text-muted-foreground">{t('fields.manexAnnexRefHint')}</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="mtom" className={labelClassName}>
                {t('fields.mtom')}
              </Label>
              <Input id="mtom" name="mtom" type="number" min="0" defaultValue={ballon.mtom ?? ''} />
              <p className="text-xs text-muted-foreground">{t('fields.mtomHint')}</p>
            </div>
            <div className="space-y-1">
              <Label htmlFor="mlm" className={labelClassName}>
                {t('fields.mlm')}
              </Label>
              <Input id="mlm" name="mlm" type="number" min="0" defaultValue={ballon.mlm ?? ''} />
              <p className="text-xs text-muted-foreground">{t('fields.mlmHint')}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Separator />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">CAMO &amp; Navigabilite</CardTitle>
          <p className="text-xs text-muted-foreground">{t('fields.camoSectionHint')}</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="camoOrganisme" className={labelClassName}>
              {t('fields.camoOrganisme')}
            </Label>
            <Input
              id="camoOrganisme"
              name="camoOrganisme"
              defaultValue={ballon.camoOrganisme ?? ''}
              placeholder="ex: OSAC"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="camoExpiryDate" className={labelClassName}>
              {t('fields.camoExpiryDate')}
            </Label>
            <Input
              id="camoExpiryDate"
              name="camoExpiryDate"
              type="date"
              defaultValue={ballon.camoExpiryDate}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="certificatNavigabilite" className={labelClassName}>
              {t('fields.certificatNavigabilite')}
            </Label>
            <Input
              id="certificatNavigabilite"
              name="certificatNavigabilite"
              defaultValue={ballon.certificatNavigabilite ?? ''}
              placeholder="ex: CDN-FR-2024-001"
            />
            <p className="text-xs text-muted-foreground">
              {t('fields.certificatNavigabiliteHint')}
            </p>
          </div>
        </CardContent>
      </Card>

      <Separator />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('fields.performanceChart')}</CardTitle>
        </CardHeader>
        <CardContent>
          <PerformanceChartInput defaultValues={performanceChart} />
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3">
        <Link
          href={`/${locale}/ballons/${ballonId}`}
          className={cn(buttonVariants({ variant: 'outline' }))}
        >
          {t('backToList')}
        </Link>
        <Button type="submit">{t('saveButton')}</Button>
      </div>
    </form>
  )
}
