'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { savePostFlight } from '@/lib/actions/vol'

type Props = {
  volId: string
  locale: string
  defaultDecoLieu: string
  configGaz: string | null
}

const STEPS = ['step1', 'step2', 'step3'] as const

export function PostVolWizard({ volId, locale, defaultDecoLieu, configGaz }: Props) {
  const t = useTranslations('vols.postVol')
  const [step, setStep] = useState(0)
  const [submitting, setSubmitting] = useState(false)

  // Form state
  const [decoLieu, setDecoLieu] = useState(defaultDecoLieu)
  const [decoHeure, setDecoHeure] = useState('')
  const [atterLieu, setAtterLieu] = useState('')
  const [atterHeure, setAtterHeure] = useState('')
  const [gasConso, setGasConso] = useState('')
  const [distance, setDistance] = useState('')
  const [anomalies, setAnomalies] = useState('')
  const [noteDansCarnet, setNoteDansCarnet] = useState(true)

  async function handleSubmit() {
    setSubmitting(true)
    const formData = new FormData()
    formData.set('decoLieu', decoLieu)
    formData.set('decoHeure', decoHeure)
    formData.set('atterLieu', atterLieu)
    formData.set('atterHeure', atterHeure)
    formData.set('gasConso', gasConso)
    formData.set('distance', distance)
    formData.set('anomalies', anomalies)
    formData.set('noteDansCarnet', noteDansCarnet ? 'true' : 'false')

    const result = await savePostFlight(volId, locale, formData)
    if (result?.error) {
      toast.error(result.error)
      setSubmitting(false)
    }
    // On success, savePostFlight redirects — no need to handle here
  }

  return (
    <div className="space-y-6">
      {/* Progress indicator */}
      <div className="flex items-center justify-center gap-2">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium',
                i < step && 'bg-primary text-primary-foreground',
                i === step && 'bg-primary text-primary-foreground ring-2 ring-primary/30',
                i > step && 'bg-muted text-muted-foreground',
              )}
            >
              {i + 1}
            </div>
            <span className="text-sm hidden sm:inline">{t(s)}</span>
            {i < STEPS.length - 1 && <div className="w-8 h-px bg-border" />}
          </div>
        ))}
      </div>

      {/* Step 1: Decollage */}
      {step === 0 && (
        <Card>
          <CardContent className="p-6 space-y-4">
            <h2 className="text-lg font-semibold">{t('step1')}</h2>
            <div className="space-y-2">
              <Label htmlFor="decoLieu">{t('decoLieu')}</Label>
              <Input
                id="decoLieu"
                value={decoLieu}
                onChange={(e) => setDecoLieu(e.target.value)}
                className="text-lg"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="decoHeure">{t('decoHeure')}</Label>
              <Input
                id="decoHeure"
                type="time"
                value={decoHeure}
                onChange={(e) => setDecoHeure(e.target.value)}
                className="text-lg"
              />
            </div>
            <Button className="w-full" size="lg" onClick={() => setStep(1)} disabled={!decoHeure}>
              {t('next')}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Atterrissage */}
      {step === 1 && (
        <Card>
          <CardContent className="p-6 space-y-4">
            <h2 className="text-lg font-semibold">{t('step2')}</h2>
            <div className="space-y-2">
              <Label htmlFor="atterLieu">{t('atterLieu')}</Label>
              <Input
                id="atterLieu"
                value={atterLieu}
                onChange={(e) => setAtterLieu(e.target.value)}
                className="text-lg"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="atterHeure">{t('atterHeure')}</Label>
              <Input
                id="atterHeure"
                type="time"
                value={atterHeure}
                onChange={(e) => setAtterHeure(e.target.value)}
                className="text-lg"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="gasConso">
                {t('gasConso')}
                {configGaz ? ` (${configGaz})` : ''}
              </Label>
              <Input
                id="gasConso"
                type="number"
                value={gasConso}
                onChange={(e) => setGasConso(e.target.value)}
                className="text-lg"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="distance">{t('distance')}</Label>
              <Input
                id="distance"
                type="number"
                value={distance}
                onChange={(e) => setDistance(e.target.value)}
                className="text-lg"
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" size="lg" onClick={() => setStep(0)}>
                {t('back')}
              </Button>
              <Button
                className="flex-1"
                size="lg"
                onClick={() => setStep(2)}
                disabled={!atterHeure}
              >
                {t('next')}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Compte-rendu */}
      {step === 2 && (
        <Card>
          <CardContent className="p-6 space-y-4">
            <h2 className="text-lg font-semibold">{t('step3')}</h2>
            <div className="space-y-2">
              <Label htmlFor="anomalies">{t('anomalies')}</Label>
              <Textarea
                id="anomalies"
                value={anomalies}
                onChange={(e) => setAnomalies(e.target.value)}
                rows={4}
                className="text-lg"
              />
            </div>
            <div className="flex items-center gap-3">
              <Switch
                id="noteDansCarnet"
                checked={noteDansCarnet}
                onCheckedChange={setNoteDansCarnet}
              />
              <Label htmlFor="noteDansCarnet">{t('noteDansCarnet')}</Label>
            </div>

            {/* Summary */}
            <div className="rounded-lg bg-muted p-4 space-y-1 text-sm">
              <h3 className="font-medium">{t('summary')}</h3>
              <p>
                {t('decoLieu')}: {decoLieu}
              </p>
              <p>
                {t('decoHeure')}: {decoHeure}
              </p>
              <p>
                {t('atterLieu')}: {atterLieu}
              </p>
              <p>
                {t('atterHeure')}: {atterHeure}
              </p>
              {gasConso && (
                <p>
                  {t('gasConso')}: {gasConso}
                </p>
              )}
              {distance && (
                <p>
                  {t('distance')}: {distance}
                </p>
              )}
            </div>

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" size="lg" onClick={() => setStep(1)}>
                {t('back')}
              </Button>
              <Button className="flex-1" size="lg" onClick={handleSubmit} disabled={submitting}>
                {t('submit')}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
