'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button, buttonVariants } from '@/components/ui/button'
import { createVol, updateVol } from '@/lib/actions/vol'
import { cn } from '@/lib/utils'

type BallonOption = {
  id: string
  nom: string
  immatriculation: string
  configGaz: string
}

type PiloteOption = {
  id: string
  prenom: string
  nom: string
}

type Props = {
  locale: string
  ballons: BallonOption[]
  pilotes: PiloteOption[]
  defaultDate: string
  defaultCreneau: string
  volId?: string
  defaultBallonId?: string
  defaultPiloteId?: string
  defaultEquipier?: string
  defaultVehicule?: string
  defaultLieuDecollage?: string
  defaultConfigGaz?: string
  defaultQteGaz?: string
}

const CRENEAU_OPTIONS = ['MATIN', 'SOIR'] as const

export function VolCreateForm({
  locale,
  ballons,
  pilotes,
  defaultDate,
  defaultCreneau,
  volId,
  defaultBallonId,
  defaultPiloteId,
  defaultEquipier,
  defaultVehicule,
  defaultLieuDecollage,
  defaultConfigGaz,
  defaultQteGaz,
}: Props) {
  const t = useTranslations('vols')
  const [error, setError] = useState<string | null>(null)
  const [selectedBallonId, setSelectedBallonId] = useState<string>(
    defaultBallonId ?? ballons[0]?.id ?? '',
  )
  const isEdit = !!volId

  const selectedBallon = ballons.find((b) => b.id === selectedBallonId)

  async function handleSubmit(formData: FormData) {
    const result = volId
      ? await updateVol(volId, locale, formData)
      : await createVol(locale, formData)
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
          <CardTitle className="text-base">Informations du vol</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="date">{t('fields.date')} *</Label>
              <Input id="date" name="date" type="date" defaultValue={defaultDate} required />
            </div>
            <div className="space-y-1">
              <Label htmlFor="creneau">{t('fields.creneau')} *</Label>
              <select
                id="creneau"
                name="creneau"
                defaultValue={defaultCreneau || 'MATIN'}
                required
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                {CRENEAU_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {t(`creneau.${opt}`)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="ballonId">{t('fields.ballon')} *</Label>
            <select
              id="ballonId"
              name="ballonId"
              value={selectedBallonId}
              onChange={(e) => setSelectedBallonId(e.target.value)}
              required
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="">— Choisir un ballon</option>
              {ballons.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.nom} ({b.immatriculation})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <Label htmlFor="piloteId">{t('fields.pilote')} *</Label>
            <select
              id="piloteId"
              name="piloteId"
              defaultValue={defaultPiloteId ?? ''}
              required
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="">— Choisir un pilote</option>
              {pilotes.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.prenom} {p.nom}
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Logistique</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="equipier">{t('fields.equipier')}</Label>
              <Input id="equipier" name="equipier" defaultValue={defaultEquipier ?? ''} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="vehicule">{t('fields.vehicule')}</Label>
              <Input id="vehicule" name="vehicule" defaultValue={defaultVehicule ?? ''} />
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="lieuDecollage">{t('fields.lieuDecollage')}</Label>
            <Input
              id="lieuDecollage"
              name="lieuDecollage"
              defaultValue={defaultLieuDecollage ?? ''}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="configGaz">{t('fields.configGaz')}</Label>
              <Input
                id="configGaz"
                name="configGaz"
                defaultValue={defaultConfigGaz ?? selectedBallon?.configGaz ?? ''}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="qteGaz">{t('fields.qteGaz')}</Label>
              <Input
                id="qteGaz"
                name="qteGaz"
                type="number"
                min="0"
                step="1"
                defaultValue={defaultQteGaz ?? ''}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3">
        <Link href={`/${locale}/vols`} className={cn(buttonVariants({ variant: 'outline' }))}>
          {t('backToList')}
        </Link>
        <Button type="submit">{isEdit ? t('save') : t('new')}</Button>
      </div>
    </form>
  )
}
