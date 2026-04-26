'use client'

import { useState, useTransition } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { toast } from 'sonner'
import { Loader2, Monitor, Smartphone } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { revokeMySession, type MySession } from '@/lib/actions/session'
import { formatDateTimeShort } from '@/lib/format'

type Props = {
  sessions: MySession[]
}

function deviceLabel(ua: string | null): { label: string; icon: typeof Monitor } {
  if (!ua) return { label: 'Inconnu', icon: Monitor }
  const isMobile = /Mobi|Android|iPhone|iPad/i.test(ua)
  const browser =
    (ua.match(/Chrome\/[\d.]+/)?.[0] && 'Chrome') ||
    (ua.match(/Firefox\/[\d.]+/)?.[0] && 'Firefox') ||
    (ua.match(/Safari\/[\d.]+/)?.[0] && 'Safari') ||
    (ua.match(/Edg\/[\d.]+/)?.[0] && 'Edge') ||
    'Navigateur'
  const os =
    (ua.includes('Windows') && 'Windows') ||
    (ua.includes('Macintosh') && 'macOS') ||
    (ua.includes('Linux') && 'Linux') ||
    (ua.includes('Android') && 'Android') ||
    (ua.includes('iPhone') && 'iOS') ||
    ''
  return { label: [browser, os].filter(Boolean).join(' — '), icon: isMobile ? Smartphone : Monitor }
}

export function MySessionsCard({ sessions }: Props) {
  const t = useTranslations('profil.sessions')
  const locale = useLocale()
  const [pending, startTransition] = useTransition()
  const [revokingId, setRevokingId] = useState<string | null>(null)
  const [revoked, setRevoked] = useState<Set<string>>(new Set())

  function handleRevoke(sessionId: string) {
    setRevokingId(sessionId)
    startTransition(async () => {
      const result = await revokeMySession(sessionId)
      setRevokingId(null)
      if (result?.error) {
        toast.error(result.error)
      } else {
        toast.success(t('revokeSuccess'))
        setRevoked((prev) => new Set(prev).add(sessionId))
      }
    })
  }

  const visible = sessions.filter((s) => !revoked.has(s.id))

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t('title')}</CardTitle>
        <p className="text-xs text-muted-foreground">{t('description')}</p>
      </CardHeader>
      <CardContent>
        {visible.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('empty')}</p>
        ) : (
          <ul className="divide-y divide-border">
            {visible.map((s) => {
              const { label, icon: Icon } = deviceLabel(s.userAgent)
              const isRevoking = pending && revokingId === s.id
              return (
                <li key={s.id} className="flex items-center gap-3 py-3">
                  <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium truncate">{label}</span>
                      {s.isCurrent && (
                        <Badge variant="secondary" className="text-[10px]">
                          {t('currentSession')}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {s.ipAddress ?? '—'} · {formatDateTimeShort(s.createdAt, locale)}
                    </p>
                  </div>
                  {!s.isCurrent && (
                    <ConfirmDialog
                      title={t('revokeConfirmTitle')}
                      description={t('revokeConfirm')}
                      confirmLabel={t('revoke')}
                      destructive
                      onConfirm={() => handleRevoke(s.id)}
                      trigger={
                        <Button variant="outline" size="sm" disabled={isRevoking}>
                          {isRevoking && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
                          {t('revoke')}
                        </Button>
                      }
                    />
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
