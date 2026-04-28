'use client'

import { useState } from 'react'
import Image from 'next/image'
import { useTranslations, useLocale } from 'next-intl'
import { authClient } from '@/lib/auth-client'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { PasswordStrength } from '@/components/password-strength'
import { DismissibleError } from '@/components/auth/dismissible-error'
import { PasswordInput } from '@/components/auth/password-input'

export default function ResetPasswordPage() {
  const t = useTranslations('signin')
  const locale = useLocale()
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const isInvitation = searchParams.get('invitation') === '1'

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const mismatch = !!confirmPassword && !!newPassword && confirmPassword !== newPassword

  async function handleReset(e: React.FormEvent) {
    e.preventDefault()
    if (newPassword !== confirmPassword) {
      setError(t('passwordMismatch'))
      return
    }
    if (!token) {
      setError(t('resetError'))
      return
    }
    setLoading(true)
    setError(null)
    try {
      await authClient.resetPassword({
        newPassword,
        token,
      })
      toast.success(isInvitation ? t('invitationSuccess') : t('passwordResetSuccess'))
      setSuccess(true)
    } catch {
      setError(t('resetError'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#E8ECF0] p-4">
      <div className="w-full max-w-md rounded-2xl shadow-xl bg-white px-8 py-12">
        <div className="flex flex-col items-center mb-8">
          <Image
            src="/logo.svg"
            alt="Calpax"
            width={48}
            height={48}
            className="h-12 w-12"
            priority
          />
          <h1 className="text-[26px] font-bold text-primary mt-3">Calpax</h1>
        </div>

        <h2 className="text-[18px] font-semibold text-foreground mb-6 text-center">
          {isInvitation ? t('invitationTitle') : t('resetPasswordTitle')}
        </h2>

        {error && <DismissibleError message={error} onDismiss={() => setError(null)} />}

        {success ? (
          <div className="text-center space-y-4">
            <div className="rounded-lg bg-green-50 px-4 py-3 text-sm text-green-800">
              {isInvitation ? t('invitationSuccess') : t('passwordResetSuccess')}
            </div>
            <button
              type="button"
              onClick={() => router.push(`/${locale}/auth/signin`)}
              className="text-sm text-primary hover:underline"
            >
              {t('backToSignin')}
            </button>
          </div>
        ) : (
          <form onSubmit={handleReset} className="space-y-4">
            <div className="space-y-1.5">
              <label
                htmlFor="new-password"
                className="block text-xs font-medium uppercase tracking-wide text-foreground"
              >
                {t('newPasswordLabel')}
              </label>
              <PasswordInput
                id="new-password"
                name="newPassword"
                autoComplete="new-password"
                autoFocus
                required
                minLength={12}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder={t('newPasswordPlaceholder')}
              />
              <PasswordStrength password={newPassword} minLength={12} />
            </div>
            <div className="space-y-1.5">
              <label
                htmlFor="confirm-password"
                className="block text-xs font-medium uppercase tracking-wide text-foreground"
              >
                {t('confirmPasswordLabel')}
              </label>
              <PasswordInput
                id="confirm-password"
                name="confirmPassword"
                autoComplete="new-password"
                required
                minLength={12}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder={t('confirmPasswordPlaceholder')}
                invalid={mismatch}
                describedById={mismatch ? 'confirm-password-error' : undefined}
              />
              {mismatch && (
                <p id="confirm-password-error" className="text-[11px] text-destructive">
                  {t('passwordMismatch')}
                </p>
              )}
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-primary-foreground rounded-lg px-4 py-2.5 text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {isInvitation ? t('invitationButton') : t('resetPasswordButton')}
            </button>
          </form>
        )}
      </div>
    </main>
  )
}
