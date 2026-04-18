'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'

type Props = {
  defaultValue: string
  name?: string
  required?: boolean
  labelClassName?: string
}

function parseConfigGaz(value: string): {
  qty: string
  model: string
  weight: string
} | null {
  // Parse "4xCB2990 : 4x23 kg" or "4xCB2990:4x23kg"
  const match = value.match(/^(\d+)\s*x\s*([A-Za-z0-9]+)\s*:\s*\d+\s*x\s*(\d+)\s*kg?$/i)
  if (!match) return null
  return { qty: match[1]!, model: match[2]!, weight: match[3]! }
}

function buildConfigGaz(qty: string, model: string, weight: string): string {
  if (!qty || !model || !weight) return ''
  return `${qty}x${model} : ${qty}x${weight} kg`
}

export function ConfigGazInput({
  defaultValue,
  name = 'configGaz',
  required = false,
  labelClassName,
}: Props) {
  const parsed = parseConfigGaz(defaultValue)
  const canUseStructured = parsed !== null || defaultValue === ''

  const [freeMode, setFreeMode] = useState(!canUseStructured)
  const [qty, setQty] = useState(parsed?.qty ?? '')
  const [model, setModel] = useState(parsed?.model ?? '')
  const [weight, setWeight] = useState(parsed?.weight ?? '')
  const [freeValue, setFreeValue] = useState(defaultValue)

  const structuredValue = buildConfigGaz(qty, model, weight)
  const finalValue = freeMode ? freeValue : structuredValue

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className={labelClassName}>Configuration gaz {required && '*'}</Label>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>Saisie libre</span>
          <Switch checked={freeMode} onCheckedChange={setFreeMode} />
        </div>
      </div>

      {freeMode ? (
        <Input
          value={freeValue}
          onChange={(e) => setFreeValue(e.target.value)}
          placeholder="2xCB2901+1xCB2380 : 2x30+29 kg"
        />
      ) : (
        <div className="grid grid-cols-3 gap-2">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Nb bouteilles</Label>
            <Input
              type="number"
              min={1}
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              placeholder="4"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Modele</Label>
            <Input value={model} onChange={(e) => setModel(e.target.value)} placeholder="CB2990" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Poids unitaire (kg)</Label>
            <Input
              type="number"
              min={1}
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              placeholder="23"
            />
          </div>
        </div>
      )}

      {!freeMode && structuredValue && (
        <p className="text-xs text-muted-foreground">{structuredValue}</p>
      )}

      <input type="hidden" name={name} value={finalValue} />
    </div>
  )
}
