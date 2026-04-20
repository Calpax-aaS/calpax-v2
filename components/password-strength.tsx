'use client'

import { useEffect, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'

type ZxcvbnFn = (password: string) => {
  score: number
  feedback: { warning: string | null; suggestions: string[] }
}

let zxcvbnFn: ZxcvbnFn | null = null
let zxcvbnLocale: string | null = null
let zxcvbnPromise: Promise<ZxcvbnFn> | null = null

async function loadZxcvbn(locale: string): Promise<ZxcvbnFn> {
  if (zxcvbnFn && zxcvbnLocale === locale) return zxcvbnFn
  if (!zxcvbnPromise || zxcvbnLocale !== locale) {
    zxcvbnPromise = (async () => {
      const [core, common, pack] = await Promise.all([
        import('@zxcvbn-ts/core'),
        import('@zxcvbn-ts/language-common'),
        locale === 'fr' ? import('@zxcvbn-ts/language-fr') : import('@zxcvbn-ts/language-en'),
      ])
      core.zxcvbnOptions.setOptions({
        translations: pack.translations,
        graphs: common.adjacencyGraphs,
        dictionary: { ...common.dictionary, ...pack.dictionary },
      })
      zxcvbnFn = core.zxcvbn
      zxcvbnLocale = locale
      return core.zxcvbn
    })()
  }
  return zxcvbnPromise
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
  const [result, setResult] = useState<ReturnType<ZxcvbnFn> | null>(null)

  useEffect(() => {
    if (!password) {
      setResult(null)
      return
    }
    let cancelled = false
    loadZxcvbn(locale).then((fn) => {
      if (!cancelled) setResult(fn(password))
    })
    return () => {
      cancelled = true
    }
  }, [locale, password])

  if (!password) return null

  const tooShort = password.length < minLength
  const score = Math.min(Math.max(result?.score ?? 0, 0), 4) as 0 | 1 | 2 | 3 | 4
  const feedback = result?.feedback.warning ?? result?.feedback.suggestions?.[0] ?? ''

  return (
    <div className="space-y-1.5">
      <div className="flex gap-1">
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-colors ${
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
