'use client'

import { useRef, useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { uploadLogo } from '@/lib/actions/exploitant'

interface LogoUploadProps {
  currentLogoUrl: string | null
}

export function LogoUpload({ currentLogoUrl }: LogoUploadProps) {
  const t = useTranslations('settings')
  const [logoUrl, setLogoUrl] = useState<string | null>(currentLogoUrl)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [isPending, startTransition] = useTransition()
  const inputRef = useRef<HTMLInputElement>(null)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setSuccess(false)
    const formData = new FormData(e.currentTarget)
    startTransition(async () => {
      const result = await uploadLogo(formData)
      if (result.error) {
        setError(result.error)
      } else if (result.url) {
        setLogoUrl(result.url)
        setSuccess(true)
        if (inputRef.current) inputRef.current.value = ''
      }
    })
  }

  return (
    <div className="space-y-3">
      {logoUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logoUrl} alt="Logo" className="h-20 w-40 rounded border object-contain" />
      )}
      <form onSubmit={handleSubmit} className="flex items-end gap-3">
        <div className="space-y-1">
          <Label htmlFor="logo">{t('logoUpload')}</Label>
          <input
            ref={inputRef}
            id="logo"
            name="logo"
            type="file"
            accept="image/png,image/jpeg,image/jpg,image/svg+xml"
            className="block text-sm text-muted-foreground file:mr-3 file:rounded file:border file:border-input file:bg-secondary file:px-3 file:py-1 file:text-sm"
            required
          />
        </div>
        <Button type="submit" disabled={isPending} size="sm">
          {isPending && <Loader2 className="mr-1 h-3 w-3 animate-spin" aria-hidden />}
          {t('logoUploadButton')}
        </Button>
      </form>
      {error && <p className="text-sm text-destructive">{error}</p>}
      {success && <p className="text-sm text-green-600">{t('logoUploadSuccess')}</p>}
    </div>
  )
}
