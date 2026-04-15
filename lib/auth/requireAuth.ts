import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { runWithContext } from '@/lib/context'
import { UnauthorizedError } from '@/lib/errors'
import type { UserRole } from '@/lib/context'

export async function requireAuth<T>(fn: () => Promise<T>): Promise<T> {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session?.user) throw new UnauthorizedError()

  const user = session.user as Record<string, unknown>
  const exploitantId = user.exploitantId as string
  const role = (user.role as string) ?? 'GERANT'

  if (!exploitantId) throw new UnauthorizedError('User has no exploitant')

  return runWithContext(
    {
      userId: session.user.id,
      exploitantId,
      role: role as UserRole,
    },
    fn,
  ) as Promise<T>
}
