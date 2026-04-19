'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { authClient } from '@/lib/auth-client'
import { useRouter, useSearchParams } from 'next/navigation'
import { PasswordStrength } from '@/components/password-strength'

export default function ResetPasswordPage() {
  const t = useTranslations('signin')
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const isInvitation = searchParams.get('invitation') === '1'

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

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
          <img src="/logo.svg" alt="Calpax" className="h-12 w-12" />
          <h1 className="text-[26px] font-bold text-primary mt-3">Calpax</h1>
        </div>

        <h2 className="text-[18px] font-semibold text-foreground mb-6 text-center">
          {isInvitation ? t('invitationTitle') : t('resetPasswordTitle')}
        </h2>

        {error && (
          <div className="mb-4 rounded-lg bg-destructive/10 px-4 py-2.5 text-sm text-destructive">
            {error}
          </div>
        )}

        {success ? (
          <div className="text-center space-y-4">
            <div className="rounded-lg bg-green-50 px-4 py-3 text-sm text-green-800">
              {isInvitation ? t('invitationSuccess') : t('passwordResetSuccess')}
            </div>
            <button
              type="button"
              onClick={() => router.push('/auth/signin')}
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
              <input
                id="new-password"
                name="newPassword"
                type="password"
                autoComplete="new-password"
                autoFocus
                required
                minLength={12}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder={t('newPasswordPlaceholder')}
                className="w-full bg-secondary/30 border border-border rounded-lg px-3 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
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
              <input
                id="confirm-password"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                minLength={12}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder={t('confirmPasswordPlaceholder')}
                className="w-full bg-secondary/30 border border-border rounded-lg px-3 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-primary-foreground rounded-lg px-4 py-2.5 text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {loading ? '...' : isInvitation ? t('invitationButton') : t('resetPasswordButton')}
            </button>
          </form>
        )}
      </div>
    </main>
  )
}
