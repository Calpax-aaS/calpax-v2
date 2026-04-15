'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { signIn } from '@/lib/auth-client'
import { useRouter } from 'next/navigation'

export default function SignInPage() {
  const t = useTranslations('signin')
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleEmailPassword(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const result = await signIn.email({ email, password })
      if (result.error) {
        setError(result.error.message ?? 'Erreur de connexion')
      } else {
        router.push('/')
        router.refresh()
      }
    } catch {
      setError('Erreur de connexion')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#E8ECF0] p-4">
      <div className="w-full max-w-5xl rounded-2xl shadow-xl bg-white flex flex-row overflow-hidden">
        {/* Left panel - branding */}
        <div
          className="hidden md:flex md:w-1/2 relative flex-col justify-end p-10"
          style={{
            background:
              'linear-gradient(160deg, #0D3B66 0%, #1A5A96 30%, #3B82F6 55%, #7DD3FC 70%, #F59E0B 88%, #FCD34D 100%)',
          }}
        >
          {/* Diagonal stripe pattern overlay */}
          <div
            className="absolute inset-0"
            style={{
              backgroundImage:
                'repeating-linear-gradient(135deg, transparent, transparent 10px, rgba(255,255,255,0.05) 10px, rgba(255,255,255,0.05) 12px)',
            }}
          />

          {/* Balloon silhouettes */}
          <div className="absolute inset-0 flex items-start justify-center pt-16">
            <svg
              viewBox="0 0 400 320"
              className="w-72 h-auto"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              style={{ opacity: 0.15 }}
            >
              {/* Large balloon center */}
              <ellipse cx="200" cy="100" rx="70" ry="90" fill="white" />
              <rect x="192" y="185" width="16" height="20" rx="2" fill="white" />
              <rect x="185" y="205" width="30" height="22" rx="4" fill="white" />

              {/* Small balloon left */}
              <ellipse cx="80" cy="130" rx="40" ry="52" fill="white" />
              <rect x="75" y="178" width="10" height="12" rx="2" fill="white" />
              <rect x="70" y="190" width="20" height="14" rx="3" fill="white" />

              {/* Small balloon right */}
              <ellipse cx="320" cy="80" rx="35" ry="45" fill="white" />
              <rect x="315" y="122" width="10" height="10" rx="2" fill="white" />
              <rect x="310" y="132" width="20" height="13" rx="3" fill="white" />
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
          <h2 className="text-[18px] font-semibold text-foreground mb-6">{t('connectTitle')}</h2>

          {error && (
            <div className="mb-4 w-full max-w-xs rounded-lg bg-destructive/10 px-4 py-2.5 text-sm text-destructive">
              {error}
            </div>
          )}

          {/* Form */}
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
              <input
                id="password"
                name="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t('passwordPlaceholder')}
                className="w-full bg-secondary/30 border border-border rounded-lg px-3 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-primary-foreground rounded-lg px-4 py-2.5 text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {loading ? '...' : t('submit')}
            </button>
          </form>

          {/* Footer */}
          <p className="text-[10px] text-muted-foreground mt-auto pt-10">{t('footer')}</p>
        </div>
      </div>
    </main>
  )
}
