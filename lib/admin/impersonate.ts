import { getContext, runWithContext } from '@/lib/context'

export async function impersonate<T>(targetExploitantId: string, fn: () => Promise<T>): Promise<T> {
  const admin = getContext()
  if (admin.role !== 'ADMIN_CALPAX') {
    throw new Error('impersonate() requires ADMIN_CALPAX role')
  }
  return runWithContext(
    {
      userId: admin.userId,
      exploitantId: targetExploitantId,
      role: admin.role,
      impersonatedBy: admin.userId,
    },
    fn,
  ) as Promise<T>
}
