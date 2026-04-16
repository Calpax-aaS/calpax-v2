'use client'

import { useEffect, useMemo, useState } from 'react'
import { zxcvbn, zxcvbnOptions } from '@zxcvbn-ts/core'
import * as zxcvbnCommonPackage from '@zxcvbn-ts/language-common'
import * as zxcvbnFrPackage from '@zxcvbn-ts/language-fr'

let zxcvbnConfigured = false
function configureZxcvbn() {
  if (zxcvbnConfigured) return
  zxcvbnOptions.setOptions({
    translations: zxcvbnFrPackage.translations,
    graphs: zxcvbnCommonPackage.adjacencyGraphs,
    dictionary: {
      ...zxcvbnCommonPackage.dictionary,
      ...zxcvbnFrPackage.dictionary,
    },
  })
  zxcvbnConfigured = true
}

type Props = {
  password: string
  minLength?: number
}

const SCORE_LABELS = ['Tres faible', 'Faible', 'Moyen', 'Bon', 'Excellent'] as const
const SCORE_COLORS = [
  'bg-destructive',
  'bg-destructive/60',
  'bg-warning',
  'bg-success/70',
  'bg-success',
] as const

export function PasswordStrength({ password, minLength = 12 }: Props) {
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    configureZxcvbn()
    setIsReady(true)
  }, [])

  const result = useMemo(() => {
    if (!isReady || !password) return null
    return zxcvbn(password)
  }, [isReady, password])

  if (!password) return null

  const tooShort = password.length < minLength
  const score = result?.score ?? 0
  const feedback = result?.feedback.warning ?? result?.feedback.suggestions?.[0] ?? ''

  return (
    <div className="space-y-1.5">
      <div className="flex gap-1">
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-colors ${
              i <= score && !tooShort ? SCORE_COLORS[score] : 'bg-border'
            }`}
          />
        ))}
      </div>
      <div className="flex items-center justify-between text-[11px]">
        <span
          className={
            tooShort
              ? 'text-destructive'
              : score >= 3
                ? 'text-success'
                : score >= 2
                  ? 'text-warning'
                  : 'text-destructive'
          }
        >
          {tooShort ? `Minimum ${minLength} caracteres` : SCORE_LABELS[score]}
        </span>
        {feedback && !tooShort && (
          <span className="text-muted-foreground truncate max-w-[60%]" title={feedback}>
            {feedback}
          </span>
        )}
      </div>
    </div>
  )
}
