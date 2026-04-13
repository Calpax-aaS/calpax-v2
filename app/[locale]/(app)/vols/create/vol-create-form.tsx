'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button, buttonVariants } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { createVol, updateVol } from '@/lib/actions/vol'
import { cn } from '@/lib/utils'

type BallonOption = {
  id: string
  nom: string
  immatriculation: string
  configGaz: string
  camoExpiryDate: string | null
}

type PiloteOption = {
  id: string
  prenom: string
  nom: string
  dateExpirationLicence: string
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

const labelClassName = 'text-xs font-medium uppercase tracking-wider text-muted-foreground'

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
  const [selectedCreneau, setSelectedCreneau] = useState<string>(defaultCreneau || 'MATIN')
  const [selectedPiloteId, setSelectedPiloteId] = useState<string>(defaultPiloteId ?? '')

  // Determine initial select values: if there is an *Autre value but no *Id, it means "AUTRE" was selected
  const initialEquipierId = defaultEquipierId ?? (defaultEquipierAutre ? 'AUTRE' : '')
  const initialVehiculeId = defaultVehiculeId ?? (defaultVehiculeAutre ? 'AUTRE' : '')
  const initialSiteId = defaultSiteDecollageId ?? (defaultLieuDecollageAutre ? 'AUTRE' : '')

  const [selectedEquipierId, setSelectedEquipierId] = useState<string>(initialEquipierId)
  const [selectedVehiculeId, setSelectedVehiculeId] = useState<string>(initialVehiculeId)
  const [selectedSiteId, setSelectedSiteId] = useState<string>(initialSiteId)

  const isEdit = !!volId

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const selectedBallon = ballons.find((b) => b.id === selectedBallonId)

  async function handleSubmit(formData: FormData) {
    formData.set('creneau', selectedCreneau)
    formData.set('ballonId', selectedBallonId)
    formData.set('piloteId', selectedPiloteId)
    formData.set('equipierId', selectedEquipierId)
    formData.set('vehiculeId', selectedVehiculeId)
    formData.set('siteDecollageId', selectedSiteId)
    const result = volId
      ? await updateVol(volId, locale, formData)
      : await createVol(locale, formData)
    if (result?.error) {
      setError(result.error)
      toast.error(result.error)
    } else {
      toast.success('Vol enregistre')
    }
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
              <Label htmlFor="date" className={labelClassName}>
                {t('fields.date')} *
              </Label>
              <Input id="date" name="date" type="date" defaultValue={defaultDate} required />
            </div>
            <div className="space-y-1">
              <Label className={labelClassName}>{t('fields.creneau')} *</Label>
              <Select value={selectedCreneau} onValueChange={setSelectedCreneau}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CRENEAU_OPTIONS.map((opt) => (
                    <SelectItem key={opt} value={opt}>
                      {t(`creneau.${opt}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1">
            <Label className={labelClassName}>{t('fields.ballon')} *</Label>
            <Select value={selectedBallonId} onValueChange={setSelectedBallonId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="-- Choisir un ballon" />
              </SelectTrigger>
              <SelectContent>
                {ballons.map((b) => {
                  const camoValid = b.camoExpiryDate !== null && new Date(b.camoExpiryDate) > today
                  const label = `${b.nom} (${b.immatriculation})${!camoValid ? ` — CAMO ${b.camoExpiryDate ? 'expire' : 'manquant'}` : ''}`
                  return (
                    <SelectItem
                      key={b.id}
                      value={b.id}
                      disabled={!camoValid}
                      className={camoValid ? '' : 'line-through'}
                    >
                      {label}
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className={labelClassName}>{t('fields.pilote')} *</Label>
            <Select value={selectedPiloteId} onValueChange={setSelectedPiloteId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="-- Choisir un pilote" />
              </SelectTrigger>
              <SelectContent>
                {pilotes.map((p) => {
                  const licenceValid = new Date(p.dateExpirationLicence) > today
                  const label = `${p.prenom} ${p.nom}${!licenceValid ? ' — BFCL expire' : ''}`
                  return (
                    <SelectItem
                      key={p.id}
                      value={p.id}
                      disabled={!licenceValid}
                      className={licenceValid ? '' : 'line-through'}
                    >
                      {label}
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
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
              <Label className={labelClassName}>{t('fields.equipier')}</Label>
              <Select value={selectedEquipierId} onValueChange={setSelectedEquipierId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="-- Choisir" />
                </SelectTrigger>
                <SelectContent>
                  {equipiers.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.prenom} {e.nom}
                    </SelectItem>
                  ))}
                  <SelectItem value="AUTRE">Autre...</SelectItem>
                </SelectContent>
              </Select>
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
              <Label className={labelClassName}>{t('fields.vehicule')}</Label>
              <Select value={selectedVehiculeId} onValueChange={setSelectedVehiculeId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="-- Choisir" />
                </SelectTrigger>
                <SelectContent>
                  {vehicules.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.nom}
                    </SelectItem>
                  ))}
                  <SelectItem value="AUTRE">Autre...</SelectItem>
                </SelectContent>
              </Select>
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
            <Label className={labelClassName}>{t('fields.lieuDecollage')}</Label>
            <Select value={selectedSiteId} onValueChange={setSelectedSiteId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="-- Choisir" />
              </SelectTrigger>
              <SelectContent>
                {sites.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.nom}
                  </SelectItem>
                ))}
                <SelectItem value="AUTRE">Autre...</SelectItem>
              </SelectContent>
            </Select>
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
              <Label htmlFor="configGaz" className={labelClassName}>
                {t('fields.configGaz')}
              </Label>
              <Input
                id="configGaz"
                name="configGaz"
                defaultValue={defaultConfigGaz ?? selectedBallon?.configGaz ?? ''}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="qteGaz" className={labelClassName}>
                {t('fields.qteGaz')}
              </Label>
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
