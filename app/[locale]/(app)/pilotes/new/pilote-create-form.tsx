'use client'

import { useActionState } from 'react'

type FormState = { error?: string } | null

type Props = {
  action: (prev: FormState, formData: FormData) => Promise<FormState>
  children: React.ReactNode
}

export function PiloteCreateForm({ action, children }: Props) {
  const [state, formAction, pending] = useActionState(action, null)

  return (
    <form action={formAction} className="space-y-6">
      {state?.error && (
        <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {state.error}
        </div>
      )}
      <fieldset disabled={pending} className="space-y-6">
        {children}
      </fieldset>
    </form>
  )
}
