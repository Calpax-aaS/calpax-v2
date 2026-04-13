'use client'

import { Button } from '@/components/ui/button'

type Props = {
  id: string
  actif: boolean
  locale: string
  action: (id: string, locale: string) => Promise<{ error?: string }>
}

export function ToggleActifButton({ id, actif, locale, action }: Props) {
  async function handleClick() {
    await action(id, locale)
  }

  return (
    <form action={handleClick}>
      <Button type="submit" variant="ghost" size="sm">
        {actif ? 'Desactiver' : 'Activer'}
      </Button>
    </form>
  )
}
