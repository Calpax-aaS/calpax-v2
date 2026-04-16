'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { authClient } from '@/lib/auth-client'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Check, Link2, Unlink } from 'lucide-react'

type Props = {
  linkedProviders: string[]
  hasCredential: boolean
}

export function LinkedAccounts({ linkedProviders, hasCredential }: Props) {
  const t = useTranslations('profil.linkedAccounts')
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)

  const googleLinked = linkedProviders.includes('google')

  async function handleLink(provider: 'google') {
    setLoading(provider)
    try {
      await authClient.linkSocial({
        provider,
        callbackURL: '/profil?linked=1',
      })
    } catch {
      toast.error(t('linkError'))
      setLoading(null)
    }
  }

  async function handleUnlink(provider: 'google') {
    if (!confirm(t('unlinkConfirm'))) return
    setLoading(provider)
    try {
      const result = await authClient.unlinkAccount({ providerId: provider })
      if (result.error) {
        toast.error(result.error.message ?? t('unlinkError'))
      } else {
        toast.success(t('unlinkSuccess'))
        router.refresh()
      }
    } catch {
      toast.error(t('unlinkError'))
    } finally {
      setLoading(null)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t('title')}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-4">{t('description')}</p>
        <div className="space-y-3">
          {/* Credential account (email + password) */}
          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Link2 className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-medium">{t('emailPassword')}</p>
                <p className="text-xs text-muted-foreground">{t('emailPasswordDescription')}</p>
              </div>
            </div>
            {hasCredential && (
              <span className="flex items-center gap-1 text-xs text-success">
                <Check className="h-3.5 w-3.5" />
                {t('active')}
              </span>
            )}
          </div>

          {/* Google */}
          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium">Google</p>
                <p className="text-xs text-muted-foreground">
                  {googleLinked ? t('googleLinked') : t('googleNotLinked')}
                </p>
              </div>
            </div>
            {googleLinked ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleUnlink('google')}
                disabled={loading === 'google' || (!hasCredential && linkedProviders.length === 1)}
              >
                <Unlink className="h-3.5 w-3.5 mr-1" />
                {t('unlink')}
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleLink('google')}
                disabled={loading === 'google'}
              >
                <Link2 className="h-3.5 w-3.5 mr-1" />
                {t('link')}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
