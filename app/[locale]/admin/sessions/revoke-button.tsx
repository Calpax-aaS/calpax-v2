'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { revokeSession } from '@/lib/actions/admin'

export function RevokeSessionButton({ sessionId }: { sessionId: string }) {
  const t = useTranslations('admin.sessions')
  const [loading, setLoading] = useState(false)
  const [revoked, setRevoked] = useState(false)

  async function handleRevoke() {
    setLoading(true)
    try {
      await revokeSession(sessionId)
      setRevoked(true)
    } finally {
      setLoading(false)
    }
  }

  if (revoked) {
    return <span className="text-xs text-muted-foreground">{t('revoked')}</span>
  }

  return (
    <Button variant="destructive" size="sm" disabled={loading} onClick={handleRevoke}>
      {t('revoke')}
    </Button>
  )
}
