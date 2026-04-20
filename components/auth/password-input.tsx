'use client'

import { useId, useState, forwardRef } from 'react'
import { useTranslations } from 'next-intl'
import { Eye, EyeOff } from 'lucide-react'

type Props = React.InputHTMLAttributes<HTMLInputElement> & {
  describedById?: string
  invalid?: boolean
}

export const PasswordInput = forwardRef<HTMLInputElement, Props>(function PasswordInput(
  { describedById, invalid, className, ...inputProps },
  ref,
) {
  const t = useTranslations('signin')
  const [visible, setVisible] = useState(false)
  const reactId = useId()
  const id = inputProps.id ?? reactId

  return (
    <div className="relative">
      <input
        ref={ref}
        {...inputProps}
        id={id}
        type={visible ? 'text' : 'password'}
        aria-invalid={invalid || undefined}
        aria-describedby={describedById}
        className={
          className ??
          'w-full bg-secondary/30 border border-border rounded-lg px-3 py-2.5 pr-12 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40'
        }
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? t('hidePassword') : t('showPassword')}
        aria-controls={id}
        className="absolute right-1 top-1/2 -translate-y-1/2 min-h-[44px] min-w-[44px] flex items-center justify-center text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded-md"
      >
        {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  )
})
