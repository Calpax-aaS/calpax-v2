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

type EquipierOption = {
  id: string
  prenom: string
  nom: string
}

type VehiculeOption = {
  id: string
  nom: string
}

type SiteOption = {
  id: string
  nom: string
}

type Props = {
  locale: string
  ballons: BallonOption[]
  pilotes: PiloteOption[]
  equipiers: EquipierOption[]
  vehicules: VehiculeOption[]
  sites: SiteOption[]
  defaultDate: string
  defaultCreneau: string
  volId?: string
  defaultBallonId?: string
  defaultPiloteId?: string
  defaultEquipierId?: string
  defaultEquipierAutre?: string
  defaultVehiculeId?: string
  defaultVehiculeAutre?: string
  defaultSiteDecollageId?: string
  defaultLieuDecollageAutre?: string
  defaultConfigGaz?: string
  defaultQteGaz?: string
}

const CRENEAU_OPTIONS = ['MATIN', 'SOIR'] as const

const selectClassName =
  'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring'

export function VolCreateForm({
  locale,
  ballons,
  pilotes,
  equipiers,
  vehicules,
  sites,
  defaultDate,
  defaultCreneau,
  volId,
  defaultBallonId,
  defaultPiloteId,
  defaultEquipierId,
  defaultEquipierAutre,
  defaultVehiculeId,
  defaultVehiculeAutre,
  defaultSiteDecollageId,
  defaultLieuDecollageAutre,
  defaultConfigGaz,
  defaultQteGaz,
}: Props) {
  const t = useTranslations('vols')
  const [error, setError] = useState<string | null>(null)
  const [selectedBallonId, setSelectedBallonId] = useState<string>(
    defaultBallonId ?? ballons[0]?.id ?? '',
  )

  // Determine initial select values: if there is an *Autre value but no *Id, it means "AUTRE" was selected
  const initialEquipierId = defaultEquipierId ?? (defaultEquipierAutre ? 'AUTRE' : '')
  const initialVehiculeId = defaultVehiculeId ?? (defaultVehiculeAutre ? 'AUTRE' : '')
  const initialSiteId = defaultSiteDecollageId ?? (defaultLieuDecollageAutre ? 'AUTRE' : '')

  const [selectedEquipierId, setSelectedEquipierId] = useState<string>(initialEquipierId)
  const [selectedVehiculeId, setSelectedVehiculeId] = useState<string>(initialVehiculeId)
  const [selectedSiteId, setSelectedSiteId] = useState<string>(initialSiteId)

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
                className={selectClassName}
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
              className={selectClassName}
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
              className={selectClassName}
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
            {/* Equipier */}
            <div className="space-y-1">
              <Label htmlFor="equipierId">{t('fields.equipier')}</Label>
              <select
                id="equipierId"
                name="equipierId"
                value={selectedEquipierId}
                onChange={(e) => setSelectedEquipierId(e.target.value)}
                className={selectClassName}
              >
                <option value="">— Choisir</option>
                {equipiers.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.prenom} {e.nom}
                  </option>
                ))}
                <option value="AUTRE">Autre...</option>
              </select>
              {selectedEquipierId === 'AUTRE' && (
                <Input
                  name="equipierAutre"
                  placeholder="Nom de l'equipier"
                  defaultValue={defaultEquipierAutre ?? ''}
                  className="mt-1"
                />
              )}
            </div>

            {/* Vehicule */}
            <div className="space-y-1">
              <Label htmlFor="vehiculeId">{t('fields.vehicule')}</Label>
              <select
                id="vehiculeId"
                name="vehiculeId"
                value={selectedVehiculeId}
                onChange={(e) => setSelectedVehiculeId(e.target.value)}
                className={selectClassName}
              >
                <option value="">— Choisir</option>
                {vehicules.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.nom}
                  </option>
                ))}
                <option value="AUTRE">Autre...</option>
              </select>
              {selectedVehiculeId === 'AUTRE' && (
                <Input
                  name="vehiculeAutre"
                  placeholder="Nom du vehicule"
                  defaultValue={defaultVehiculeAutre ?? ''}
                  className="mt-1"
                />
              )}
            </div>
          </div>

          {/* Site de decollage */}
          <div className="space-y-1">
            <Label htmlFor="siteDecollageId">{t('fields.lieuDecollage')}</Label>
            <select
              id="siteDecollageId"
              name="siteDecollageId"
              value={selectedSiteId}
              onChange={(e) => setSelectedSiteId(e.target.value)}
              className={selectClassName}
            >
              <option value="">— Choisir</option>
              {sites.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nom}
                </option>
              ))}
              <option value="AUTRE">Autre...</option>
            </select>
            {selectedSiteId === 'AUTRE' && (
              <Input
                name="lieuDecollageAutre"
                placeholder="Lieu de decollage"
                defaultValue={defaultLieuDecollageAutre ?? ''}
                className="mt-1"
              />
            )}
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
