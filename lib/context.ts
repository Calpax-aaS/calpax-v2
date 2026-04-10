import { AsyncLocalStorage } from 'node:async_hooks'

/**
 * Mirrors the UserRole enum from prisma/schema.prisma.
 * Kept in sync manually until the Prisma client is generated and exported.
 */
export type UserRole = 'ADMIN_CALPAX' | 'GERANT' | 'PILOTE' | 'EQUIPIER'

export type RequestContext = {
  userId: string
  exploitantId: string
  role: UserRole
  impersonatedBy?: string
}

const als = new AsyncLocalStorage<RequestContext>()

export function runWithContext<T>(ctx: RequestContext, fn: () => Promise<T> | T): Promise<T> | T {
  return als.run(ctx, fn)
}

export function getContext(): RequestContext {
  const c = als.getStore()
  if (!c) {
    throw new Error(
      'getContext() called outside request scope. Wrap your handler in requireAuth() or runWithContext().',
    )
  }
  return c
}

export function tryGetContext(): RequestContext | null {
  return als.getStore() ?? null
}
