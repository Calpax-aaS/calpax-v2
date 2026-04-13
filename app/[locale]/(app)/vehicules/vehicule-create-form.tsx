'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { createVehicule } from '@/lib/actions/vehicule'

type Props = {
  locale: string
}

export function VehiculeCreateForm({ locale }: Props) {
  const t = useTranslations('vehicules')
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(formData: FormData) {
    const result = await createVehicule(locale, formData)
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
        <form action={handleSubmit} className="flex items-end gap-3 flex-wrap">
          <div className="space-y-1">
            <Label htmlFor="nom">{t('fields.nom')} *</Label>
            <Input id="nom" name="nom" required className="w-48" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="immatriculation">{t('fields.immatriculation')}</Label>
            <Input id="immatriculation" name="immatriculation" className="w-40" />
          </div>
          <Button type="submit" size="sm">
            {t('add')}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
