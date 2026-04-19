import * as React from 'react'

import { cn } from '@/lib/utils'

function Input({ className, type, onKeyDown, onChange, ...props }: React.ComponentProps<'input'>) {
  const isDate = type === 'date'
  const hasValue = props.value !== undefined ? !!props.value : !!props.defaultValue
  const [filled, setFilled] = React.useState(hasValue)

  const handleKeyDown =
    type === 'number'
      ? (e: React.KeyboardEvent<HTMLInputElement>) => {
          if ('eE+-'.includes(e.key)) e.preventDefault()
          onKeyDown?.(e)
        }
      : onKeyDown

  const handleChange = isDate
    ? (e: React.ChangeEvent<HTMLInputElement>) => {
        setFilled(!!e.target.value)
        onChange?.(e)
      }
    : onChange

  return (
    <input
      type={type}
      data-slot="input"
      onKeyDown={handleKeyDown}
      onChange={handleChange}
      className={cn(
        'h-9 w-full min-w-0 rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none selection:bg-primary selection:text-primary-foreground file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm dark:bg-input/30',
        isDate && !filled && 'text-muted-foreground/50',
        'focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50',
        'aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40',
        className,
      )}
      {...props}
    />
  )
}

export { Input }
