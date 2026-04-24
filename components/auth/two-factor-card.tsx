'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import QRCode from 'qrcode'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { PasswordInput } from '@/components/auth/password-input'
import { authClient } from '@/lib/auth-client'
import { formLabelClass } from '@/lib/ui'

type Props = {
  /** Current server-side value of `user.twoFactorEnabled`. Drives the
   *  initial view: enabled → "disable" UI, disabled → "setup" UI. */
  enabled: boolean
}

type View =
  | { kind: 'idle' } // enabled = false, show "enable" button
  | { kind: 'setup'; totpURI: string; qrDataURL: string; backupCodes: string[] }
  | { kind: 'verified' } // user confirmed first TOTP, plugin flipped `enabled = true`
  | { kind: 'enabled' } // loaded with enabled = true (no backup codes shown — secret is gone)

export function TwoFactorCard({ enabled }: Props) {
  const t = useTranslations('profil.twoFactor')
  const [view, setView] = useState<View>(enabled ? { kind: 'enabled' } : { kind: 'idle' })
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleEnable(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const result = await authClient.twoFactor.enable({ password })
      // Better Auth returns `{ data: { totpURI, backupCodes } }` on success,
      // `{ error: { message } }` on failure.
      if (result.error) {
        setError(result.error.message ?? t('enableError'))
        return
      }
      const { totpURI, backupCodes } = result.data
      const qrDataURL = await QRCode.toDataURL(totpURI, { width: 192, margin: 1 })
      setView({ kind: 'setup', totpURI, qrDataURL, backupCodes })
      setPassword('')
    } catch {
      setError(t('enableError'))
    } finally {
      setLoading(false)
    }
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const result = await authClient.twoFactor.verifyTotp({ code })
      if (result.error) {
        setError(result.error.message ?? t('verifyError'))
        return
      }
      setView({ kind: 'verified' })
      setCode('')
      toast.success(t('verifySuccess'))
    } catch {
      setError(t('verifyError'))
    } finally {
      setLoading(false)
    }
  }

  async function handleDisable(e: React.FormEvent) {
    e.preventDefault()
    if (!confirm(t('disableConfirm'))) return
    setLoading(true)
    setError(null)
    try {
      const result = await authClient.twoFactor.disable({ password })
      if (result.error) {
        setError(result.error.message ?? t('disableError'))
        return
      }
      setView({ kind: 'idle' })
      setPassword('')
      toast.success(t('disableSuccess'))
    } catch {
      setError(t('disableError'))
    } finally {
      setLoading(false)
    }
  }

  function copyBackupCodes(codes: string[]) {
    const text = codes.join('\n')
    navigator.clipboard.writeText(text)
    toast.success(t('backupCodesCopied'))
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          {t('title')}
          {(view.kind === 'enabled' || view.kind === 'verified') && (
            <Badge variant="default" className="bg-emerald-600 hover:bg-emerald-600">
              {t('active')}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">{t('description')}</p>

        {error && <p className="text-sm text-destructive">{error}</p>}

        {view.kind === 'idle' && (
          <form onSubmit={handleEnable} className="space-y-3">
            <div>
              <Label htmlFor="tfa-password" className={formLabelClass}>
                {t('passwordLabel')}
              </Label>
              <PasswordInput
                id="tfa-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            <Button type="submit" disabled={loading || !password}>
              {loading ? t('enabling') : t('enableButton')}
            </Button>
          </form>
        )}

        {view.kind === 'setup' && (
          <div className="space-y-4">
            <p className="text-sm">{t('setupStep1')}</p>
            <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={view.qrDataURL}
                alt={t('qrAlt')}
                className="border rounded bg-white p-2"
                width={192}
                height={192}
              />
              <details className="text-xs text-muted-foreground">
                <summary className="cursor-pointer">{t('manualEntry')}</summary>
                <pre className="mt-2 whitespace-pre-wrap break-all rounded bg-muted p-2">
                  {view.totpURI}
                </pre>
              </details>
            </div>

            <div className="space-y-2 rounded border border-amber-300 bg-amber-50 p-3 text-sm">
              <p className="font-medium">{t('backupCodesTitle')}</p>
              <p className="text-xs text-amber-900">{t('backupCodesWarning')}</p>
              <ul className="mono grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                {view.backupCodes.map((code) => (
                  <li key={code}>{code}</li>
                ))}
              </ul>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => copyBackupCodes(view.backupCodes)}
              >
                {t('copyBackupCodes')}
              </Button>
            </div>

            <form onSubmit={handleVerify} className="space-y-3">
              <p className="text-sm">{t('setupStep2')}</p>
              <div>
                <Label htmlFor="tfa-code" className={formLabelClass}>
                  {t('codeLabel')}
                </Label>
                <Input
                  id="tfa-code"
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                  required
                  disabled={loading}
                  autoComplete="one-time-code"
                />
              </div>
              <Button type="submit" disabled={loading || code.length !== 6}>
                {loading ? t('verifying') : t('verifyButton')}
              </Button>
            </form>
          </div>
        )}

        {view.kind === 'verified' && (
          <p className="text-sm text-emerald-700">{t('verifiedHint')}</p>
        )}

        {view.kind === 'enabled' && (
          <form onSubmit={handleDisable} className="space-y-3">
            <p className="text-sm">{t('enabledHint')}</p>
            <div>
              <Label htmlFor="tfa-password-disable" className={formLabelClass}>
                {t('passwordLabel')}
              </Label>
              <PasswordInput
                id="tfa-password-disable"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            <Button type="submit" variant="destructive" disabled={loading || !password}>
              {loading ? t('disabling') : t('disableButton')}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  )
}
