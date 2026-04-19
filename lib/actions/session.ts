'use server'

import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { basePrisma } from '@/lib/db/base'
import { requireAuth } from '@/lib/auth/requireAuth'
import { getContext } from '@/lib/context'
import { revalidatePath } from 'next/cache'

export type MySession = {
  id: string
  ipAddress: string | null
  userAgent: string | null
  createdAt: Date
  expiresAt: Date
  isCurrent: boolean
}

export async function getMySessions(): Promise<MySession[]> {
  return requireAuth(async () => {
    const ctx = getContext()
    const currentSession = await auth.api.getSession({ headers: await headers() })
    const currentId = currentSession?.session?.id ?? null

    const sessions = await basePrisma.session.findMany({
      where: { userId: ctx.userId, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        ipAddress: true,
        userAgent: true,
        createdAt: true,
        expiresAt: true,
      },
    })

    return sessions.map((s) => ({ ...s, isCurrent: s.id === currentId }))
  }) as Promise<MySession[]>
}

export async function revokeMySession(sessionId: string): Promise<{ error?: string }> {
  return requireAuth(async () => {
    const ctx = getContext()
    // Scope the delete to ctx.userId so a user can never revoke another user's
    // session by guessing an id.
    const result = await basePrisma.session.deleteMany({
      where: { id: sessionId, userId: ctx.userId },
    })
    if (result.count === 0) {
      return { error: 'Session introuvable' }
    }
    revalidatePath('/profil')
    return {}
  })
}
