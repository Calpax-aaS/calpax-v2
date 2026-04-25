'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button, buttonVariants } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { savePostFlight } from '@/lib/actions/vol'
import { cn } from '@/lib/utils'

type Props = {
  volId: string
  locale: string
}

export function PostVolForm({ volId, locale }: Props) {
  const t = useTranslations('vols')
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(formData: FormData) {
    const result = await savePostFlight(volId, locale, formData)
    if (result?.error) setError(result.error)
  }

  return (
    <form action={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('postVol.title')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Decollage */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="decoLieu">{t('postVol.decoLieu')} *</Label>
              <Input id="decoLieu" name="decoLieu" required />
            </div>
            <div className="space-y-1">
              <Label htmlFor="decoHeure">{t('postVol.decoHeure')} *</Label>
              <Input id="decoHeure" name="decoHeure" type="datetime-local" required />
            </div>
          </div>

          {/* Atterrissage */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="atterLieu">{t('postVol.atterLieu')} *</Label>
              <Input id="atterLieu" name="atterLieu" required />
            </div>
            <div className="space-y-1">
              <Label htmlFor="atterHeure">{t('postVol.atterHeure')} *</Label>
              <Input id="atterHeure" name="atterHeure" type="datetime-local" required />
            </div>
          </div>

          {/* Gaz et distance */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="gasConso">{t('postVol.gasConso')}</Label>
              <Input id="gasConso" name="gasConso" type="number" min="0" step="1" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="distance">{t('postVol.distance')}</Label>
              <Input id="distance" name="distance" type="number" min="0" step="1" />
            </div>
          </div>

          {/* Anomalies */}
          <div className="space-y-1">
            <Label htmlFor="anomalies">{t('postVol.anomalies')}</Label>
            <Textarea id="anomalies" name="anomalies" rows={4} />
          </div>

          {/* Note dans carnet */}
          <div className="flex items-center gap-2">
            <input
              id="noteDansCarnet"
              name="noteDansCarnet"
              type="checkbox"
              defaultChecked
              value="true"
              className="h-4 w-4 rounded border-input"
            />
            <Label htmlFor="noteDansCarnet">{t('postVol.noteDansCarnet')}</Label>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3">
        <Link
          href={`/${locale}/vols/${volId}`}
          className={cn(buttonVariants({ variant: 'outline' }))}
        >
          {t('backToList')}
        </Link>
        <Button type="submit">{t('postVol.save')}</Button>
      </div>
    </form>
  )
}
