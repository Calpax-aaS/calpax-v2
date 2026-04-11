import { getTranslations } from 'next-intl/server'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireAuth } from '@/lib/auth/requireAuth'
import { db } from '@/lib/db'
import { decrypt } from '@/lib/crypto'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button, buttonVariants } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { updatePilote } from '@/lib/actions/pilote'
import { cn } from '@/lib/utils'

type Props = {
  params: Promise<{ locale: string; id: string }>
}

const BALLOON_CLASSES = ['A', 'B', 'C', 'D']

export default async function PiloteEditPage({ params }: Props) {
  const { locale, id } = await params
  return requireAuth(async () => {
    const t = await getTranslations('pilotes')

    const pilote = await db.pilote.findUnique({ where: { id } })
    if (!pilote) notFound()

    let poids: number | null = null
    if (pilote.poidsEncrypted) {
      try {
        poids = Number(decrypt(pilote.poidsEncrypted))
      } catch {
        poids = null
      }
    }

    async function handleUpdate(formData: FormData) {
      'use server'
      await updatePilote(id, locale, formData)
    }

    const dateExpirationStr = pilote.dateExpirationLicence
      ? pilote.dateExpirationLicence.toISOString().substring(0, 10)
      : ''

    return (
      <main className="container mx-auto max-w-2xl px-4 py-8 space-y-6">
        <div className="flex items-center gap-4">
          <Link
            href={`/${locale}/pilotes/${id}`}
            className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }))}
          >
            {t('backToList')}
          </Link>
          <h1 className="text-2xl font-bold">{t('editTitle')}</h1>
        </div>

        <form action={handleUpdate} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Identité</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="prenom">{t('fields.prenom')} *</Label>
                  <Input id="prenom" name="prenom" defaultValue={pilote.prenom} required />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="nom">{t('fields.nom')} *</Label>
                  <Input id="nom" name="nom" defaultValue={pilote.nom} required />
                </div>
              </div>
              <div className="space-y-1">
                <Label htmlFor="email">{t('fields.email')}</Label>
                <Input id="email" name="email" type="email" defaultValue={pilote.email ?? ''} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="telephone">{t('fields.telephone')}</Label>
                <Input id="telephone" name="telephone" defaultValue={pilote.telephone ?? ''} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="poids">
                  {t('fields.poids')}{' '}
                  <span className="text-xs text-muted-foreground">({t('fields.poidsNote')})</span>
                </Label>
                <Input
                  id="poids"
                  name="poids"
                  type="number"
                  min="1"
                  step="0.1"
                  defaultValue={poids ?? ''}
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
                <Label htmlFor="licenceBfcl">{t('fields.licenceBfcl')} *</Label>
                <Input
                  id="licenceBfcl"
                  name="licenceBfcl"
                  defaultValue={pilote.licenceBfcl}
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="dateExpirationLicence">{t('fields.dateExpirationLicence')} *</Label>
                <Input
                  id="dateExpirationLicence"
                  name="dateExpirationLicence"
                  type="date"
                  defaultValue={dateExpirationStr}
                  required
                />
              </div>
              <div className="flex items-center gap-3">
                <input
                  id="qualificationCommerciale"
                  name="qualificationCommerciale"
                  type="checkbox"
                  value="true"
                  defaultChecked={pilote.qualificationCommerciale}
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
                        defaultChecked={pilote.classesBallon.includes(cls)}
                        className="h-4 w-4 rounded border-input"
                      />
                      <Label htmlFor={`class_${cls}`}>{t(`classes.${cls}` as `classes.A`)}</Label>
                    </div>
                  ))}
                </div>
              </div>
              <div className="space-y-1">
                <Label htmlFor="heuresDeVol">{t('fields.heuresDeVol')}</Label>
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
              href={`/${locale}/pilotes/${id}`}
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
