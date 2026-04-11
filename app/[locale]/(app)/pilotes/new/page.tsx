import { getTranslations } from 'next-intl/server'
import Link from 'next/link'
import { requireAuth } from '@/lib/auth/requireAuth'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button, buttonVariants } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { createPilote } from '@/lib/actions/pilote'
import { cn } from '@/lib/utils'

type Props = {
  params: Promise<{ locale: string }>
}

const BALLOON_CLASSES = ['A', 'B', 'C', 'D']

export default async function PiloteNewPage({ params }: Props) {
  const { locale } = await params
  return requireAuth(async () => {
    const t = await getTranslations('pilotes')

    async function handleCreate(formData: FormData) {
      'use server'
      await createPilote(locale, formData)
    }

    return (
      <main className="container mx-auto max-w-2xl px-4 py-8 space-y-6">
        <div className="flex items-center gap-4">
          <Link
            href={`/${locale}/pilotes`}
            className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }))}
          >
            {t('backToList')}
          </Link>
          <h1 className="text-2xl font-bold">{t('createTitle')}</h1>
        </div>

        <form action={handleCreate} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Identité</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="prenom">{t('fields.prenom')} *</Label>
                  <Input id="prenom" name="prenom" required />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="nom">{t('fields.nom')} *</Label>
                  <Input id="nom" name="nom" required />
                </div>
              </div>
              <div className="space-y-1">
                <Label htmlFor="email">{t('fields.email')}</Label>
                <Input id="email" name="email" type="email" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="telephone">{t('fields.telephone')}</Label>
                <Input id="telephone" name="telephone" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="poids">
                  {t('fields.poids')}{' '}
                  <span className="text-xs text-muted-foreground">({t('fields.poidsNote')})</span>
                </Label>
                <Input id="poids" name="poids" type="number" min="1" step="0.1" />
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
                <Label htmlFor="licenceBfcl">{t('fields.licenceBfcl')} *</Label>
                <Input id="licenceBfcl" name="licenceBfcl" required />
              </div>
              <div className="space-y-1">
                <Label htmlFor="dateExpirationLicence">{t('fields.dateExpirationLicence')} *</Label>
                <Input
                  id="dateExpirationLicence"
                  name="dateExpirationLicence"
                  type="date"
                  required
                />
              </div>
              <div className="flex items-center gap-3">
                <input
                  id="qualificationCommerciale"
                  name="qualificationCommerciale"
                  type="checkbox"
                  value="true"
                  className="h-4 w-4 rounded border-input"
                />
                <Label htmlFor="qualificationCommerciale">
                  {t('fields.qualificationCommerciale')}
                </Label>
              </div>
            </CardContent>
          </Card>

          <Separator />

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Qualifications</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>{t('fields.classesBallon')} *</Label>
                <div className="flex gap-4">
                  {BALLOON_CLASSES.map((cls) => (
                    <div key={cls} className="flex items-center gap-2">
                      <input
                        id={`class_${cls}`}
                        name="classesBallon"
                        type="checkbox"
                        value={cls}
                        className="h-4 w-4 rounded border-input"
                      />
                      <Label htmlFor={`class_${cls}`}>{t(`classes.${cls}` as `classes.A`)}</Label>
                    </div>
                  ))}
                </div>
              </div>
              <div className="space-y-1">
                <Label htmlFor="heuresDeVol">{t('fields.heuresDeVol')}</Label>
                <Input id="heuresDeVol" name="heuresDeVol" type="number" min="0" />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-3">
            <Link
              href={`/${locale}/pilotes`}
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
