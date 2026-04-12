import { getTranslations } from 'next-intl/server'
import { requireAuth } from '@/lib/auth/requireAuth'
import { getContext } from '@/lib/context'
import { db } from '@/lib/db'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { LogoUpload } from '@/components/logo-upload'
import { updateExploitant } from '@/lib/actions/exploitant'

export default async function SettingsPage() {
  return requireAuth(async () => {
    const t = await getTranslations('settings')
    const ctx = getContext()

    const exploitant = await db.exploitant.findFirstOrThrow({
      where: { id: ctx.exploitantId },
    })

    async function handleUpdate(formData: FormData) {
      'use server'
      await updateExploitant(formData)
    }

    return (
      <main className="container mx-auto max-w-2xl px-4 py-8 space-y-6">
        <h1 className="text-2xl font-bold">{t('title')}</h1>

        {/* Logo upload section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('logoSection')}</CardTitle>
          </CardHeader>
          <CardContent>
            <LogoUpload currentLogoUrl={exploitant.logoUrl} />
          </CardContent>
        </Card>

        {/* Settings form */}
        <form action={handleUpdate} className="space-y-6">
          {/* Legal section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t('legalSection')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <Label htmlFor="name">{t('fields.name')}</Label>
                <Input
                  id="name"
                  name="name"
                  defaultValue={exploitant.name}
                  readOnly
                  className="bg-muted"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="frDecNumber">{t('fields.frDecNumber')}</Label>
                <Input
                  id="frDecNumber"
                  name="frDecNumber"
                  defaultValue={exploitant.frDecNumber}
                  readOnly
                  className="bg-muted"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="siret">{t('fields.siret')}</Label>
                <Input id="siret" name="siret" defaultValue={exploitant.siret ?? ''} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="numCamo">{t('fields.numCamo')}</Label>
                <Input id="numCamo" name="numCamo" defaultValue={exploitant.numCamo ?? ''} />
              </div>
            </CardContent>
          </Card>

          <Separator />

          {/* Contact section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t('contactSection')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <Label htmlFor="adresse">{t('fields.adresse')}</Label>
                <Input id="adresse" name="adresse" defaultValue={exploitant.adresse ?? ''} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="codePostal">{t('fields.codePostal')}</Label>
                  <Input
                    id="codePostal"
                    name="codePostal"
                    defaultValue={exploitant.codePostal ?? ''}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="ville">{t('fields.ville')}</Label>
                  <Input id="ville" name="ville" defaultValue={exploitant.ville ?? ''} />
                </div>
              </div>
              <div className="space-y-1">
                <Label htmlFor="pays">{t('fields.pays')}</Label>
                <Input id="pays" name="pays" defaultValue={exploitant.pays ?? 'France'} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="telephone">{t('fields.telephone')}</Label>
                <Input id="telephone" name="telephone" defaultValue={exploitant.telephone ?? ''} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="email">{t('fields.email')}</Label>
                <Input id="email" name="email" type="email" defaultValue={exploitant.email ?? ''} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="website">{t('fields.website')}</Label>
                <Input id="website" name="website" defaultValue={exploitant.website ?? ''} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="contactName">{t('fields.contactName')}</Label>
                <Input
                  id="contactName"
                  name="contactName"
                  defaultValue={exploitant.contactName ?? ''}
                />
              </div>
            </CardContent>
          </Card>

          <Separator />

          {/* Meteo section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t('meteoSection')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="meteoLatitude">{t('fields.meteoLatitude')}</Label>
                  <Input
                    id="meteoLatitude"
                    name="meteoLatitude"
                    type="number"
                    step="0.000001"
                    defaultValue={exploitant.meteoLatitude ?? ''}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="meteoLongitude">{t('fields.meteoLongitude')}</Label>
                  <Input
                    id="meteoLongitude"
                    name="meteoLongitude"
                    type="number"
                    step="0.000001"
                    defaultValue={exploitant.meteoLongitude ?? ''}
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label htmlFor="meteoSeuilVent">{t('fields.meteoSeuilVent')}</Label>
                <Input
                  id="meteoSeuilVent"
                  name="meteoSeuilVent"
                  type="number"
                  defaultValue={exploitant.meteoSeuilVent ?? 15}
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button type="submit">{t('saveButton')}</Button>
          </div>
        </form>
      </main>
    )
  })
}
