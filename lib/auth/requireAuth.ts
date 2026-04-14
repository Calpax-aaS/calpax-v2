import { auth } from '@/lib/auth'
import { runWithContext } from '@/lib/context'
import { UnauthorizedError } from '@/lib/errors'
import type { UserRole } from '@/lib/context'

export async function requireAuth<T>(fn: () => Promise<T>): Promise<T> {
  const session = await auth()
  if (!session?.user) throw new UnauthorizedError()
  if (!session.user.exploitantId) throw new UnauthorizedError()

  return runWithContext(
    {
      userId: session.user.id,
      exploitantId: session.user.exploitantId,
      role: session.user.role as UserRole,
    },
    fn,
  ) as Promise<T>
}
