'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { authClient } from '@/lib/auth-client'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'
import { PasswordInput } from '@/components/auth/password-input'
import { PasswordStrength } from '@/components/password-strength'
import { formLabelClass } from '@/lib/ui'

export function ChangePasswordForm() {
  const t = useTranslations('profil')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (newPassword !== confirmPassword) {
      toast.error(t('passwordMismatch'))
      return
    }
    setLoading(true)
    try {
      const result = await authClient.changePassword({
        currentPassword,
        newPassword,
      })
      if (result.error) {
        toast.error(result.error.message ?? t('passwordError'))
      } else {
        toast.success(t('passwordChanged'))
        setCurrentPassword('')
        setNewPassword('')
        setConfirmPassword('')
      }
    } catch {
      toast.error(t('passwordError'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t('changePassword')}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="current-password" className={formLabelClass}>
              {t('currentPassword')}
            </Label>
            <PasswordInput
              id="current-password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="new-password" className={formLabelClass}>
              {t('newPassword')}
            </Label>
            <PasswordInput
              id="new-password"
              required
              minLength={12}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
            <PasswordStrength password={newPassword} minLength={12} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirm-password" className={formLabelClass}>
              {t('confirmPassword')}
            </Label>
            <PasswordInput
              id="confirm-password"
              required
              minLength={12}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>
          <Button type="submit" disabled={loading} className="w-full sm:w-auto">
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {t('changePasswordButton')}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
