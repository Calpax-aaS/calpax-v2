'use server'

import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { basePrisma } from '@/lib/db/base'
import { revalidatePath } from 'next/cache'
import { ForbiddenError } from '@/lib/errors'

async function requireAdminCalpax() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) throw new ForbiddenError()
  const user = session.user as Record<string, unknown>
  if (user.role !== 'ADMIN_CALPAX') throw new ForbiddenError()
  return session.user
}

export async function revokeSession(sessionId: string) {
  await requireAdminCalpax()
  await basePrisma.session.delete({ where: { id: sessionId } })
  revalidatePath('/admin/sessions')
}

export async function fetchAdminAuditLogs(filters: {
  exploitantId?: string
  entityType?: string
  action?: string
  page?: number
}) {
  await requireAdminCalpax()

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
}

export async function createUserForExploitant(data: {
  email: string
  name: string
  exploitantId: string
  role: string
}) {
  await requireAdminCalpax()

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
  const user = await basePrisma.user.create({
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

  // Immediately send a password reset email so the user can set their own password
  let emailSent = false
  try {
    await auth.api.requestPasswordReset({
      body: {
        email: data.email,
        redirectTo: '/auth/reset-password',
      },
    })
    emailSent = true
  } catch (err) {
    console.warn('[admin] Failed to send invitation email', err)
  }

  revalidatePath('/admin/invitations')
  return { user, emailSent }
}
