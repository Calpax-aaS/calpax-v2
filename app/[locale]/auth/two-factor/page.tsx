'use client'

import { useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'
import { authClient } from '@/lib/auth-client'
import { DismissibleError } from '@/components/auth/dismissible-error'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type Mode = 'totp' | 'backup'

/**
 * Second-factor challenge screen. Reached after `signIn.email()` when
 * the target user has 2FA enabled — the `twoFactorClient` redirect hook
 * (lib/auth-client.ts) lands us here with a pending session cookie.
 *
 * The user submits either their current TOTP code OR one of their 10
 * backup codes. Backup codes are single-use (the plugin consumes them
 * server-side).
 */
export default function TwoFactorChallengePage() {
  const t = useTranslations('twoFactor')
  const locale = useLocale()
  const router = useRouter()
  const [mode, setMode] = useState<Mode>('totp')
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const result =
        mode === 'totp'
          ? await authClient.twoFactor.verifyTotp({ code })
          : await authClient.twoFactor.verifyBackupCode({ code })

      if (result.error) {
        setError(result.error.message ?? t('invalidCode'))
        return
      }
      router.push(`/${locale}`)
      router.refresh()
    } catch {
      setError(t('invalidCode'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#E8ECF0] p-4">
      <div className="w-full max-w-md rounded-2xl shadow-xl bg-white px-8 py-10">
        <div className="flex flex-col items-center mb-6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.svg" alt="Calpax" className="h-12 w-12" />
          <h1 className="text-[26px] font-bold text-primary mt-3">Calpax</h1>
        </div>

        <h2 className="text-[18px] font-semibold text-foreground text-center mb-2">{t('title')}</h2>
        <p className="text-sm text-muted-foreground text-center mb-6">
          {mode === 'totp' ? t('totpHint') : t('backupHint')}
        </p>

        {error && <DismissibleError message={error} onDismiss={() => setError(null)} />}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="tfa-input" className="sr-only">
              {mode === 'totp' ? t('codeLabel') : t('backupCodeLabel')}
            </Label>
            <Input
              id="tfa-input"
              inputMode={mode === 'totp' ? 'numeric' : 'text'}
              pattern={mode === 'totp' ? '[0-9]{6}' : undefined}
              maxLength={mode === 'totp' ? 6 : 11}
              placeholder={mode === 'totp' ? '123456' : 'abcde-fghij'}
              value={code}
              onChange={(e) => {
                const v = e.target.value
                setCode(mode === 'totp' ? v.replace(/\D/g, '') : v.toLowerCase())
              }}
              required
              disabled={loading}
              autoComplete="one-time-code"
              autoFocus
              className="mono text-center text-lg tracking-widest"
            />
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={loading || (mode === 'totp' ? code.length !== 6 : code.length < 10)}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : t('verify')}
          </Button>
        </form>

        <div className="mt-6 flex flex-col items-center gap-2 text-sm">
          <button
            type="button"
            className="text-primary hover:underline"
            onClick={() => {
              setMode(mode === 'totp' ? 'backup' : 'totp')
              setCode('')
              setError(null)
            }}
          >
            {mode === 'totp' ? t('useBackup') : t('useTotp')}
          </button>

          <Link
            href={`/${locale}/auth/signin`}
            className="text-muted-foreground hover:text-primary hover:underline"
          >
            {t('backToSignin')}
          </Link>
        </div>
      </div>
    </main>
  )
}
