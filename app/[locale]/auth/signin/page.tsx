'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { ArrowRight, Eye, EyeOff, Loader2, X } from 'lucide-react'
import { authClient, signIn } from '@/lib/auth-client'
import { CalpaxWordmark } from '@/components/brand/calpax-wordmark'
import { StatusDot } from '@/components/cockpit/status-dot'
import { TopoPattern } from '@/components/cockpit/topo-pattern'

type Mode = 'signin' | 'forgot'

export default function SignInPage() {
  const t = useTranslations('signin')
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
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
      await signIn.social({ provider: 'google', callbackURL: '/' })
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
      await authClient.requestPasswordReset({ email, redirectTo: '/auth/reset-password' })
      setResetSent(true)
    } catch {
      setError(t('resetError'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="grid min-h-screen grid-cols-1 bg-white font-sans text-sky-900 md:grid-cols-[1.3fr_1fr]">
      <EditorialHero />
      <FormPanel
        mode={mode}
        resetSent={resetSent}
        error={error}
        loading={loading}
        email={email}
        password={password}
        rememberMe={rememberMe}
        showPassword={showPassword}
        onEmailChange={setEmail}
        onPasswordChange={setPassword}
        onRememberChange={setRememberMe}
        onTogglePassword={() => setShowPassword((s) => !s)}
        onDismissError={() => setError(null)}
        onSubmitSignin={handleEmailPassword}
        onSubmitForgot={handleForgotPassword}
        onGoogleSignIn={handleGoogleSignIn}
        onSwitchToForgot={() => {
          setMode('forgot')
          setError(null)
        }}
        onSwitchToSignin={() => {
          setMode('signin')
          setError(null)
          setResetSent(false)
        }}
      />
    </main>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// LEFT — Editorial hero (gradient couchant + typo Archivo)
// ─────────────────────────────────────────────────────────────────────────

function EditorialHero() {
  const t = useTranslations('signin')
  const stats = [
    { value: t('hero.stats.companies.value'), label: t('hero.stats.companies.label') },
    { value: t('hero.stats.flights.value'), label: t('hero.stats.flights.label') },
    { value: t('hero.stats.compliance.value'), label: t('hero.stats.compliance.label') },
  ]
  return (
    <section
      aria-hidden
      className="relative hidden overflow-hidden px-12 py-12 text-white md:flex md:flex-col md:justify-between"
      style={{
        background: 'linear-gradient(160deg, #091a30 0%, #1b3a5e 40%, #8f3a0c 75%, #ee7f26 100%)',
      }}
    >
      <TopoPattern color="rgba(252,195,135,0.08)" />
      {/* Sun glow bottom-right */}
      <div
        className="pointer-events-none absolute -bottom-16 -right-16 h-64 w-64 rounded-full"
        style={{
          background:
            'radial-gradient(circle at 30% 30%, #fcc387 0%, #db6411 45%, transparent 70%)',
          filter: 'blur(8px)',
        }}
      />
      {/* Horizon line */}
      <div
        className="pointer-events-none absolute left-0 right-0 bottom-[32%] h-px"
        style={{ background: 'rgba(252,195,135,0.25)' }}
      />

      {/* Top row */}
      <div className="relative flex items-center justify-between">
        <CalpaxWordmark size={22} wordmarkClassName="text-dusk-200" priority />
        <div className="mono flex items-center gap-2 text-[10px] text-dusk-200/70 tracking-[0.1em]">
          <StatusDot tone="ok" pulse />
          <span>{t('hero.systemOperational')}</span>
        </div>
      </div>

      {/* Hero text */}
      <div className="relative max-w-[440px]">
        <h1
          className="font-display text-dusk-200 mb-4 whitespace-pre-line font-semibold"
          style={{ fontSize: 54, lineHeight: 1.05, letterSpacing: '-0.025em' }}
        >
          {t('hero.title')}
          {'\n'}
          <span className="text-white">{t('hero.titleAccent')}</span>
        </h1>
        <p className="max-w-[380px] text-[14px] leading-relaxed text-white/85">
          {t('hero.subtitle')}
        </p>
      </div>

      {/* Stats */}
      <div className="relative flex gap-8 border-t border-dusk-200/20 pt-4 text-[11px] text-dusk-200/85">
        {stats.map((s) => (
          <div key={s.label}>
            <div className="font-display text-[22px] font-medium text-white">{s.value}</div>
            <div className="mono tracking-[0.08em]">{s.label}</div>
          </div>
        ))}
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// RIGHT — Form panel
// ─────────────────────────────────────────────────────────────────────────

type FormPanelProps = {
  mode: Mode
  resetSent: boolean
  error: string | null
  loading: boolean
  email: string
  password: string
  rememberMe: boolean
  showPassword: boolean
  onEmailChange: (v: string) => void
  onPasswordChange: (v: string) => void
  onRememberChange: (v: boolean) => void
  onTogglePassword: () => void
  onDismissError: () => void
  onSubmitSignin: (e: React.FormEvent) => void
  onSubmitForgot: (e: React.FormEvent) => void
  onGoogleSignIn: () => void
  onSwitchToForgot: () => void
  onSwitchToSignin: () => void
}

function FormPanel(props: FormPanelProps) {
  const t = useTranslations('signin')
  const {
    mode,
    resetSent,
    error,
    loading,
    email,
    password,
    rememberMe,
    showPassword,
    onEmailChange,
    onPasswordChange,
    onRememberChange,
    onTogglePassword,
    onDismissError,
    onSubmitSignin,
    onSubmitForgot,
    onGoogleSignIn,
    onSwitchToForgot,
    onSwitchToSignin,
  } = props

  return (
    <section className="relative flex flex-col justify-between bg-sky-0 px-8 py-10 sm:px-12">
      {/* Top: "Not a customer? Request access" */}
      <div className="flex justify-center md:justify-end text-[11px] text-sky-500">
        <span>{t('notClient')}</span>
        <a
          className="ml-1.5 text-ink-700 underline-offset-2 hover:underline"
          href="mailto:contact@calpax.fr"
        >
          {t('requestAccess')}
        </a>
      </div>

      <div className="mx-auto w-full max-w-[340px]">
        {/* Mobile logo (hero is hidden on mobile) */}
        <div className="mb-8 flex justify-center md:hidden">
          <CalpaxWordmark size={22} priority />
        </div>

        <div className="mono cap mb-2 text-[10px] text-sky-500">{t('kicker')}</div>
        <h2
          className="font-display mb-7 font-semibold tracking-tight text-sky-900"
          style={{ fontSize: 34, lineHeight: 1.1, letterSpacing: '-0.015em' }}
        >
          {mode === 'forgot' ? t('forgotPasswordTitle') : t('welcome')}
        </h2>

        {error && (
          <div className="mb-4 flex items-start justify-between gap-2 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            <span>{error}</span>
            <button
              type="button"
              onClick={onDismissError}
              aria-label="Dismiss"
              className="text-destructive/70 hover:text-destructive"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {resetSent ? (
          <ResetSentPanel onBack={onSwitchToSignin} />
        ) : mode === 'signin' ? (
          <SigninForm
            email={email}
            password={password}
            rememberMe={rememberMe}
            showPassword={showPassword}
            loading={loading}
            onEmailChange={onEmailChange}
            onPasswordChange={onPasswordChange}
            onRememberChange={onRememberChange}
            onTogglePassword={onTogglePassword}
            onSubmit={onSubmitSignin}
            onGoogle={onGoogleSignIn}
            onForgot={onSwitchToForgot}
          />
        ) : (
          <ForgotForm
            email={email}
            loading={loading}
            onEmailChange={onEmailChange}
            onSubmit={onSubmitForgot}
            onBack={onSwitchToSignin}
          />
        )}
      </div>

      {/* Mono footer */}
      <div className="mono flex flex-wrap justify-between gap-2 text-[10px] text-sky-300">
        <span>{t('footerSerial')}</span>
        <span>{t('footerCert')}</span>
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// Sub-forms
// ─────────────────────────────────────────────────────────────────────────

function SigninForm({
  email,
  password,
  rememberMe,
  showPassword,
  loading,
  onEmailChange,
  onPasswordChange,
  onRememberChange,
  onTogglePassword,
  onSubmit,
  onGoogle,
  onForgot,
}: {
  email: string
  password: string
  rememberMe: boolean
  showPassword: boolean
  loading: boolean
  onEmailChange: (v: string) => void
  onPasswordChange: (v: string) => void
  onRememberChange: (v: boolean) => void
  onTogglePassword: () => void
  onSubmit: (e: React.FormEvent) => void
  onGoogle: () => void
  onForgot: () => void
}) {
  const t = useTranslations('signin')
  return (
    <>
      <form onSubmit={onSubmit} className="space-y-3.5">
        <Field
          id="email"
          label={t('emailLabel')}
          type="email"
          autoComplete="email"
          autoFocus
          required
          value={email}
          onChange={onEmailChange}
          placeholder={t('emailPlaceholder')}
        />
        <div>
          <Field
            id="password"
            label={t('passwordLabel')}
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            required
            value={password}
            onChange={onPasswordChange}
            placeholder={t('passwordPlaceholder')}
            rightAdornment={
              <button
                type="button"
                onClick={onTogglePassword}
                aria-label={showPassword ? t('hidePassword') : t('showPassword')}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-sky-500 hover:text-sky-700"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            }
          />
        </div>
        <div className="flex items-center justify-between pt-0.5">
          <label className="flex cursor-pointer select-none items-center gap-2 text-[11px] text-sky-500">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => onRememberChange(e.target.checked)}
              className="h-3.5 w-3.5 rounded border-sky-200 accent-dusk-500"
            />
            {t('rememberMe')}
          </label>
          <button
            type="button"
            onClick={onForgot}
            className="text-[11px] text-dusk-700 transition-colors hover:text-dusk-500"
          >
            {t('forgotPassword')}
          </button>
        </div>
        <button
          type="submit"
          disabled={loading}
          className="mt-1 flex w-full items-center justify-center gap-2 rounded-md bg-sky-900 px-4 py-3 text-sm font-medium text-dusk-200 transition-colors hover:bg-sky-800 disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          <span>{t('cockpitAction')}</span>
          {!loading && <ArrowRight className="h-4 w-4" />}
        </button>
      </form>

      <div className="my-4 flex items-center gap-3">
        <div className="h-px flex-1 bg-sky-100" />
        <span className="mono cap text-[10px] text-sky-500">{t('orContinueWith')}</span>
        <div className="h-px flex-1 bg-sky-100" />
      </div>

      <button
        type="button"
        onClick={onGoogle}
        disabled={loading}
        className="flex w-full items-center justify-center gap-2 rounded-md border border-sky-200 bg-white px-4 py-2.5 text-xs font-medium text-sky-700 transition-colors hover:bg-sky-50 disabled:opacity-50"
      >
        <GoogleIcon />
        <span>{t('continueWithGoogle')}</span>
      </button>
    </>
  )
}

function ForgotForm({
  email,
  loading,
  onEmailChange,
  onSubmit,
  onBack,
}: {
  email: string
  loading: boolean
  onEmailChange: (v: string) => void
  onSubmit: (e: React.FormEvent) => void
  onBack: () => void
}) {
  const t = useTranslations('signin')
  return (
    <>
      <form onSubmit={onSubmit} className="space-y-3.5">
        <Field
          id="forgot-email"
          label={t('emailLabel')}
          type="email"
          autoComplete="email"
          autoFocus
          required
          value={email}
          onChange={onEmailChange}
          placeholder={t('emailPlaceholder')}
        />
        <button
          type="submit"
          disabled={loading}
          className="mt-1 flex w-full items-center justify-center gap-2 rounded-md bg-sky-900 px-4 py-3 text-sm font-medium text-dusk-200 transition-colors hover:bg-sky-800 disabled:opacity-50"
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          {t('sendResetLink')}
        </button>
      </form>
      <button
        type="button"
        onClick={onBack}
        className="mt-4 text-xs text-sky-500 transition-colors hover:text-ink-500"
      >
        {t('backToSignin')}
      </button>
    </>
  )
}

function ResetSentPanel({ onBack }: { onBack: () => void }) {
  const t = useTranslations('signin')
  return (
    <div className="space-y-4">
      <div className="rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
        {t('resetSent')}
      </div>
      <button type="button" onClick={onBack} className="text-sm text-dusk-700 hover:underline">
        {t('backToSignin')}
      </button>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// Field primitive (uniform styling for email/password)
// ─────────────────────────────────────────────────────────────────────────

function Field({
  id,
  label,
  rightAdornment,
  onChange,
  ...inputProps
}: {
  id: string
  label: string
  rightAdornment?: React.ReactNode
  onChange: (value: string) => void
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'id' | 'onChange'>) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="mono cap block text-[10px] text-sky-500">
        {label}
      </label>
      <div className="relative">
        <input
          {...inputProps}
          id={id}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-md border border-sky-200 bg-white px-3 py-2.5 text-sm text-sky-900 placeholder:text-sky-400 focus:border-dusk-300 focus:outline-none focus:ring-2 focus:ring-dusk-300/30"
        />
        {rightAdornment}
      </div>
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
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
  )
}
