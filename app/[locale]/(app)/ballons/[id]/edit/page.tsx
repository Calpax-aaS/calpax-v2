import { getTranslations } from 'next-intl/server'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireAuth } from '@/lib/auth/requireAuth'
import { db } from '@/lib/db'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button, buttonVariants } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { PerformanceChartInput } from '@/components/performance-chart-input'
import { updateBallon } from '@/lib/actions/ballon'
import { cn } from '@/lib/utils'

type Props = {
  params: Promise<{ locale: string; id: string }>
}

export default async function BallonEditPage({ params }: Props) {
  const { locale, id } = await params
  return requireAuth(async () => {
    const t = await getTranslations('ballons')

    const ballon = await db.ballon.findUnique({ where: { id } })
    if (!ballon) notFound()

    const chart = (ballon.performanceChart ?? {}) as Record<string, number>

    async function handleUpdate(formData: FormData) {
      'use server'
      await updateBallon(id, locale, formData)
    }

    const camoExpiryDateStr = ballon.camoExpiryDate
      ? ballon.camoExpiryDate.toISOString().substring(0, 10)
      : ''

    return (
      <main className="container mx-auto max-w-2xl px-4 py-8 space-y-6">
        <div className="flex items-center gap-4">
          <Link
            href={`/${locale}/ballons/${id}`}
            className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }))}
          >
            {t('backToList')}
          </Link>
          <h1 className="text-2xl font-bold">{t('editTitle')}</h1>
        </div>

        <form action={handleUpdate} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Informations générales</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <Label htmlFor="nom">{t('fields.nom')} *</Label>
                <Input id="nom" name="nom" defaultValue={ballon.nom} required />
              </div>
              <div className="space-y-1">
                <Label htmlFor="immatriculation">{t('fields.immatriculation')} *</Label>
                <Input
                  id="immatriculation"
                  name="immatriculation"
                  defaultValue={ballon.immatriculation}
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="volume">{t('fields.volume')} *</Label>
                <Input id="volume" name="volume" defaultValue={ballon.volume} required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="nbPassagerMax">{t('fields.nbPassagerMax')} *</Label>
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
                  <Label htmlFor="peseeAVide">{t('fields.peseeAVide')} *</Label>
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
              <div className="space-y-1">
                <Label htmlFor="configGaz">{t('fields.configGaz')} *</Label>
                <Input id="configGaz" name="configGaz" defaultValue={ballon.configGaz} required />
              </div>
              <div className="space-y-1">
                <Label htmlFor="manexAnnexRef">{t('fields.manexAnnexRef')} *</Label>
                <Input
                  id="manexAnnexRef"
                  name="manexAnnexRef"
                  defaultValue={ballon.manexAnnexRef}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="mtom">{t('fields.mtom')}</Label>
                  <Input
                    id="mtom"
                    name="mtom"
                    type="number"
                    min="0"
                    defaultValue={ballon.mtom ?? ''}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="mlm">{t('fields.mlm')}</Label>
                  <Input
                    id="mlm"
                    name="mlm"
                    type="number"
                    min="0"
                    defaultValue={ballon.mlm ?? ''}
                  />
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
                <Input
                  id="camoOrganisme"
                  name="camoOrganisme"
                  defaultValue={ballon.camoOrganisme ?? ''}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="camoExpiryDate">{t('fields.camoExpiryDate')}</Label>
                <Input
                  id="camoExpiryDate"
                  name="camoExpiryDate"
                  type="date"
                  defaultValue={camoExpiryDateStr}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="certificatNavigabilite">{t('fields.certificatNavigabilite')}</Label>
                <Input
                  id="certificatNavigabilite"
                  name="certificatNavigabilite"
                  defaultValue={ballon.certificatNavigabilite ?? ''}
                />
              </div>
            </CardContent>
          </Card>

          <Separator />

          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t('fields.performanceChart')}</CardTitle>
            </CardHeader>
            <CardContent>
              <PerformanceChartInput defaultValues={chart} />
            </CardContent>
          </Card>

          <div className="flex justify-end gap-3">
            <Link
              href={`/${locale}/ballons/${id}`}
              className={cn(buttonVariants({ variant: 'outline' }))}
            >
              {t('backToList')}
            </Link>
            <Button type="submit">{t('saveButton')}</Button>
          </div>
        </form>
      </main>
    )
  })
}
