import { getTranslations } from 'next-intl/server'
import Link from 'next/link'
import { requireAuth } from '@/lib/auth/requireAuth'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button, buttonVariants } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { PerformanceChartInput } from '@/components/performance-chart-input'
import { createBallon } from '@/lib/actions/ballon'
import { cn } from '@/lib/utils'

type Props = {
  params: Promise<{ locale: string }>
}

export default async function BallonNewPage({ params }: Props) {
  const { locale } = await params
  return requireAuth(async () => {
    const t = await getTranslations('ballons')

    async function handleCreate(formData: FormData) {
      'use server'
      await createBallon(locale, formData)
    }

    return (
      <main className="container mx-auto max-w-2xl px-4 py-8 space-y-6">
        <div className="flex items-center gap-4">
          <Link
            href={`/${locale}/ballons`}
            className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }))}
          >
            {t('backToList')}
          </Link>
          <h1 className="text-2xl font-bold">{t('createTitle')}</h1>
        </div>

        <form action={handleCreate} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Informations générales</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <Label htmlFor="nom">{t('fields.nom')} *</Label>
                <Input id="nom" name="nom" required />
              </div>
              <div className="space-y-1">
                <Label htmlFor="immatriculation">{t('fields.immatriculation')} *</Label>
                <Input id="immatriculation" name="immatriculation" required />
              </div>
              <div className="space-y-1">
                <Label htmlFor="volume">{t('fields.volume')} *</Label>
                <Input id="volume" name="volume" placeholder="ex: 3400m³" required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="nbPassagerMax">{t('fields.nbPassagerMax')} *</Label>
                  <Input id="nbPassagerMax" name="nbPassagerMax" type="number" min="1" required />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="peseeAVide">{t('fields.peseeAVide')} *</Label>
                  <Input id="peseeAVide" name="peseeAVide" type="number" min="1" required />
                </div>
              </div>
              <div className="space-y-1">
                <Label htmlFor="configGaz">{t('fields.configGaz')} *</Label>
                <Input id="configGaz" name="configGaz" required />
              </div>
              <div className="space-y-1">
                <Label htmlFor="manexAnnexRef">{t('fields.manexAnnexRef')} *</Label>
                <Input id="manexAnnexRef" name="manexAnnexRef" required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="mtom">{t('fields.mtom')}</Label>
                  <Input id="mtom" name="mtom" type="number" min="0" />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="mlm">{t('fields.mlm')}</Label>
                  <Input id="mlm" name="mlm" type="number" min="0" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Separator />

          <Card>
            <CardHeader>
              <CardTitle className="text-base">CAMO &amp; Navigabilité</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <Label htmlFor="camoOrganisme">{t('fields.camoOrganisme')}</Label>
                <Input id="camoOrganisme" name="camoOrganisme" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="camoExpiryDate">{t('fields.camoExpiryDate')}</Label>
                <Input id="camoExpiryDate" name="camoExpiryDate" type="date" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="certificatNavigabilite">{t('fields.certificatNavigabilite')}</Label>
                <Input id="certificatNavigabilite" name="certificatNavigabilite" />
              </div>
            </CardContent>
          </Card>

          <Separator />

          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t('fields.performanceChart')}</CardTitle>
            </CardHeader>
            <CardContent>
              <PerformanceChartInput />
            </CardContent>
          </Card>

          <div className="flex justify-end gap-3">
            <Link
              href={`/${locale}/ballons`}
              className={cn(buttonVariants({ variant: 'outline' }))}
            >
              {t('backToList')}
            </Link>
            <Button type="submit">{t('createButton')}</Button>
          </div>
        </form>
      </main>
    )
  })
}
