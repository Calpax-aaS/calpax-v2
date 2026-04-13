'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { createSiteDecollage } from '@/lib/actions/site-decollage'

type Props = {
  locale: string
}

export function SiteCreateForm({ locale }: Props) {
  const t = useTranslations('sites')
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(formData: FormData) {
    const result = await createSiteDecollage(locale, formData)
    if (result?.error) {
      setError(result.error)
    } else {
      setError(null)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t('new')}</CardTitle>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="mb-4 rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}
        <form action={handleSubmit} className="space-y-3">
          <div className="flex items-end gap-3 flex-wrap">
            <div className="space-y-1">
              <Label htmlFor="nom">{t('fields.nom')} *</Label>
              <Input id="nom" name="nom" required className="w-48" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="adresse">{t('fields.adresse')}</Label>
              <Input id="adresse" name="adresse" className="w-64" />
            </div>
          </div>
          <div className="flex items-end gap-3 flex-wrap">
            <div className="space-y-1">
              <Label htmlFor="latitude">{t('fields.latitude')}</Label>
              <Input id="latitude" name="latitude" type="number" step="0.0001" className="w-32" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="longitude">{t('fields.longitude')}</Label>
              <Input id="longitude" name="longitude" type="number" step="0.0001" className="w-32" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="notes">{t('fields.notes')}</Label>
              <Input id="notes" name="notes" className="w-48" />
            </div>
            <Button type="submit" size="sm">
              {t('add')}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
