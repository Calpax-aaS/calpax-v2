'use server'

import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { adminDb } from '@/lib/db'
import { basePrisma } from '@/lib/db/base'
import { revalidatePath } from 'next/cache'
import { requireAuth } from '@/lib/auth/requireAuth'
import { requireRole } from '@/lib/auth/requireRole'
import { sendInvitationEmail } from '@/lib/email/invitation'

export async function revokeSession(sessionId: string) {
  return requireAuth(async () => {
    requireRole('ADMIN_CALPAX')
    await adminDb.session.delete({ where: { id: sessionId } })
    revalidatePath('/admin/sessions')
  })
}

export async function fetchAdminAuditLogs(filters: {
  exploitantId?: string
  entityType?: string
  action?: string
  page?: number
}) {
  return requireAuth(async () => {
    requireRole('ADMIN_CALPAX')

    const page = filters.page ?? 1
    const take = 50
    const skip = (page - 1) * take

    const where: Record<string, unknown> = {}
    if (filters.exploitantId) where.exploitantId = filters.exploitantId
    if (filters.entityType) where.entityType = filters.entityType
    if (filters.action) where.action = filters.action

    const [logs, total] = await Promise.all([
      basePrisma.auditLog.findMany({ where, orderBy: { createdAt: 'desc' }, take, skip }),
      basePrisma.auditLog.count({ where }),
    ])

    return { logs, total, page, pageCount: Math.ceil(total / take) }
  })
}

export async function createUserForExploitant(data: {
  email: string
  name: string
  exploitantId: string
  role: string
}) {
  return requireAuth(async () => {
    requireRole('ADMIN_CALPAX')

    // Generate a random password the user will never see.
    // The user will receive a password reset email and set their own password.
    const { hashPassword } = await import('better-auth/crypto')
    const randomPassword = crypto.randomUUID() + crypto.randomUUID()
    const hashedPassword = await hashPassword(randomPassword)

    // emailVerified is set to true intentionally: admin-created users are vouched
    // for by the admin. The user will still receive a password reset email (below)
    // and must set their own password before they can sign in.
    // Self-signup (public) goes through Better Auth directly, which enforces
    // email verification via `emailAndPassword.requireEmailVerification` in lib/auth.ts.
    const user = await adminDb.user.create({
      data: {
        email: data.email,
        name: data.name,
        exploitantId: data.exploitantId,
        role: data.role as 'GERANT' | 'PILOTE' | 'EQUIPIER',
        emailVerified: true,
        accounts: {
          create: {
            accountId: data.email,
            providerId: 'credential',
            password: hashedPassword,
          },
        },
      },
      include: {
        exploitant: { select: { name: true } },
      },
    })

    // Send a "welcome to Calpax" invitation email (distinct from a password reset).
    // This generates a reset-password verification token under the hood so the user
    // can set their own password, but the email copy is written for a brand-new user.
    const invitationResult = await sendInvitationEmail({
      userId: user.id,
      email: user.email,
      name: user.name,
      exploitantName: user.exploitant?.name ?? '',
    })

    revalidatePath('/admin/invitations')
    return { user, emailSent: invitationResult.sent }
  })
}

/**
 * Ban/unban a user (TD-034). Uses Better Auth's admin plugin which also
 * deletes all active sessions for the target user on ban. Banned users cannot
 * create new sessions (enforced in session.create.before hook).
 *
 * Self-banning is rejected at the Better Auth endpoint level.
 */
export async function toggleUserBan(args: {
  userId: string
  banned: boolean
  reason?: string
}): Promise<{ error?: string }> {
  return requireAuth(async () => {
    requireRole('ADMIN_CALPAX')

    try {
      if (args.banned) {
        await auth.api.banUser({
          headers: await headers(),
          body: { userId: args.userId, banReason: args.reason ?? 'Désactivé par un administrateur' },
        })
      } else {
        await auth.api.unbanUser({
          headers: await headers(),
          body: { userId: args.userId },
        })
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Opération refusée'
      return { error: msg }
    }

    revalidatePath('/admin/users')
    return {}
  })
}
