'use client'

import { useState } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { authClient, signIn } from '@/lib/auth-client'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { DismissibleError } from '@/components/auth/dismissible-error'
import { PasswordInput } from '@/components/auth/password-input'

type Mode = 'signin' | 'forgot'

export default function SignInPage() {
  const t = useTranslations('signin')
  const locale = useLocale()
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState<Mode>('signin')
  const [resetSent, setResetSent] = useState(false)

  async function handleEmailPassword(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const result = await signIn.email({ email, password, rememberMe })
      if (result.error) {
        setError(result.error.message ?? t('loginError'))
      } else {
        router.push('/')
        router.refresh()
      }
    } catch {
      setError(t('loginError'))
    } finally {
      setLoading(false)
    }
  }

  async function handleGoogleSignIn() {
    setLoading(true)
    setError(null)
    try {
      await signIn.social({
        provider: 'google',
        callbackURL: '/',
      })
    } catch {
      setError(t('googleError'))
      setLoading(false)
    }
  }

  async function handleForgotPassword(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      await authClient.requestPasswordReset({
        email,
        redirectTo: `/${locale}/auth/reset-password`,
      })
      setResetSent(true)
    } catch {
      setError(t('resetError'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#E8ECF0] p-4">
      <div className="w-full max-w-5xl rounded-2xl shadow-xl bg-white flex flex-row overflow-hidden">
        {/* Left panel - branding */}
        <div
          className="hidden md:flex md:w-1/2 relative flex-col justify-end p-10 overflow-hidden"
          style={{
            background:
              'linear-gradient(160deg, #0D3B66 0%, #144B82 35%, #1E6BA8 62%, #F59E0B 92%, #FCD34D 100%)',
          }}
        >
          {/* Soft radial glow */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                'radial-gradient(circle at 70% 85%, rgba(252,211,77,0.35), transparent 55%)',
            }}
          />

          {/* Main balloon — paneled, detailed */}
          <div className="absolute inset-0 flex items-start justify-center pt-10">
            <svg
              viewBox="0 0 320 420"
              className="w-80 h-auto"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              style={{ opacity: 0.22 }}
              aria-hidden="true"
            >
              {/* Envelope — alternating panels */}
              <path
                d="M160 20 C90 20 45 90 45 160 C45 220 85 270 130 290 L190 290 C235 270 275 220 275 160 C275 90 230 20 160 20 Z"
                fill="white"
                fillOpacity="0.9"
              />
              <path
                d="M160 20 C130 20 110 90 110 160 C110 220 125 270 145 290 L175 290 C195 270 210 220 210 160 C210 90 190 20 160 20 Z"
                fill="white"
                fillOpacity="0.55"
              />
              <path d="M160 20 L160 290" stroke="white" strokeOpacity="0.4" strokeWidth="1.5" />
              <path d="M110 160 L210 160" stroke="white" strokeOpacity="0.4" strokeWidth="1" />
              <path d="M75 160 L245 160" stroke="white" strokeOpacity="0.25" strokeWidth="1" />

              {/* Burner + lines */}
              <rect x="152" y="290" width="16" height="14" rx="2" fill="white" />
              <line
                x1="140"
                y1="304"
                x2="145"
                y2="345"
                stroke="white"
                strokeOpacity="0.8"
                strokeWidth="1.2"
              />
              <line
                x1="180"
                y1="304"
                x2="175"
                y2="345"
                stroke="white"
                strokeOpacity="0.8"
                strokeWidth="1.2"
              />
              <line
                x1="160"
                y1="304"
                x2="160"
                y2="345"
                stroke="white"
                strokeOpacity="0.8"
                strokeWidth="1.2"
              />

              {/* Basket */}
              <rect x="130" y="345" width="60" height="34" rx="4" fill="white" fillOpacity="0.95" />
              <path d="M130 355 L190 355" stroke="white" strokeOpacity="0.4" strokeWidth="0.8" />
            </svg>
          </div>

          {/* Small balloon accent — top right */}
          <div className="absolute top-14 right-10 pointer-events-none">
            <svg
              viewBox="0 0 80 100"
              className="w-12 h-auto"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              style={{ opacity: 0.18 }}
              aria-hidden="true"
            >
              <ellipse cx="40" cy="40" rx="30" ry="38" fill="white" />
              <rect x="35" y="76" width="10" height="8" rx="1" fill="white" />
              <rect x="30" y="82" width="20" height="13" rx="2" fill="white" />
            </svg>
          </div>

          {/* Tagline */}
          <div className="relative z-10">
            <p className="text-white font-bold text-[28px] leading-tight whitespace-pre-line">
              {t('tagline')}
            </p>
            <p className="text-white/70 text-base mt-3">{t('subtitle')}</p>
          </div>
        </div>

        {/* Right panel - form */}
        <div className="w-full md:w-1/2 flex flex-col items-center justify-center px-8 py-12 sm:px-12">
          {/* Logo + app name */}
          <div className="flex flex-col items-center mb-8">
            <img src="/logo.svg" alt="Calpax" className="h-12 w-12" />
            <h1 className="text-[26px] font-bold text-primary mt-3">Calpax</h1>
            <p className="text-[11px] text-muted-foreground mt-1">{t('appDescription')}</p>
          </div>

          {/* Connect title */}
          <h2 className="text-[18px] font-semibold text-foreground mb-6">
            {mode === 'signin' ? t('connectTitle') : t('forgotPasswordTitle')}
          </h2>

          {error && (
            <div className="w-full max-w-xs">
              <DismissibleError message={error} onDismiss={() => setError(null)} />
            </div>
          )}

          {resetSent ? (
            <div className="w-full max-w-xs text-center space-y-4">
              <div className="rounded-lg bg-green-50 px-4 py-3 text-sm text-green-800">
                {t('resetSent')}
              </div>
              <button
                type="button"
                onClick={() => {
                  setMode('signin')
                  setResetSent(false)
                  setError(null)
                }}
                className="text-sm text-primary hover:underline"
              >
                {t('backToSignin')}
              </button>
            </div>
          ) : mode === 'signin' ? (
            <>
              {/* Sign-in form */}
              <form onSubmit={handleEmailPassword} className="w-full max-w-xs space-y-4">
                <div className="space-y-1.5">
                  <label
                    htmlFor="email"
                    className="block text-xs font-medium uppercase tracking-wide text-foreground"
                  >
                    {t('emailLabel')}
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    autoFocus
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t('emailPlaceholder')}
                    className="w-full bg-secondary/30 border border-border rounded-lg px-3 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>
                <div className="space-y-1.5">
                  <label
                    htmlFor="password"
                    className="block text-xs font-medium uppercase tracking-wide text-foreground"
                  >
                    {t('passwordLabel')}
                  </label>
                  <PasswordInput
                    id="password"
                    name="password"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={t('passwordPlaceholder')}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="h-3.5 w-3.5 rounded border-border accent-primary"
                    />
                    {t('rememberMe')}
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setMode('forgot')
                      setError(null)
                    }}
                    className="text-xs text-muted-foreground hover:text-primary transition-colors"
                  >
                    {t('forgotPassword')}
                  </button>
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-primary text-primary-foreground rounded-lg px-4 py-2.5 text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  {t('submit')}
                </button>
              </form>

              {/* Separator */}
              <div className="w-full max-w-xs mt-6 mb-4 flex items-center gap-3">
                <div className="flex-1 h-px bg-border" />
                <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  {t('orContinueWith')}
                </span>
                <div className="flex-1 h-px bg-border" />
              </div>

              {/* Google OAuth button */}
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="w-full max-w-xs flex items-center justify-center gap-2 border border-border bg-background hover:bg-secondary/30 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors disabled:opacity-50"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                <span>{t('continueWithGoogle')}</span>
              </button>
            </>
          ) : (
            <>
              {/* Forgot password form */}
              <form onSubmit={handleForgotPassword} className="w-full max-w-xs space-y-4">
                <div className="space-y-1.5">
                  <label
                    htmlFor="forgot-email"
                    className="block text-xs font-medium uppercase tracking-wide text-foreground"
                  >
                    {t('emailLabel')}
                  </label>
                  <input
                    id="forgot-email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    autoFocus
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t('emailPlaceholder')}
                    className="w-full bg-secondary/30 border border-border rounded-lg px-3 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-primary text-primary-foreground rounded-lg px-4 py-2.5 text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  {t('sendResetLink')}
                </button>
              </form>
              <button
                type="button"
                onClick={() => {
                  setMode('signin')
                  setError(null)
                }}
                className="mt-4 text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                {t('backToSignin')}
              </button>
            </>
          )}

          {/* Footer */}
          <p className="text-[10px] text-muted-foreground mt-auto pt-10">{t('footer')}</p>
        </div>
      </div>
    </main>
  )
}
