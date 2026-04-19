'use client'

import { useEffect, useMemo, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { zxcvbn, zxcvbnOptions } from '@zxcvbn-ts/core'
import * as zxcvbnCommonPackage from '@zxcvbn-ts/language-common'
import * as zxcvbnEnPackage from '@zxcvbn-ts/language-en'
import * as zxcvbnFrPackage from '@zxcvbn-ts/language-fr'

let zxcvbnLocale: string | null = null
function configureZxcvbn(locale: string) {
  if (zxcvbnLocale === locale) return
  const pack = locale === 'fr' ? zxcvbnFrPackage : zxcvbnEnPackage
  zxcvbnOptions.setOptions({
    translations: pack.translations,
    graphs: zxcvbnCommonPackage.adjacencyGraphs,
    dictionary: {
      ...zxcvbnCommonPackage.dictionary,
      ...pack.dictionary,
    },
  })
  zxcvbnLocale = locale
}

type Props = {
  password: string
  minLength?: number
}

const SCORE_KEYS = ['veryWeak', 'weak', 'fair', 'good', 'strong'] as const
const SCORE_COLORS = [
  'bg-destructive',
  'bg-destructive/60',
  'bg-warning',
  'bg-success/70',
  'bg-success',
] as const

export function PasswordStrength({ password, minLength = 12 }: Props) {
  const locale = useLocale()
  const t = useTranslations('signin.passwordStrength')
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    configureZxcvbn(locale)
    setIsReady(true)
  }, [locale])

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
          {tooShort ? t('tooShort', { min: minLength }) : t(SCORE_KEYS[score])}
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
