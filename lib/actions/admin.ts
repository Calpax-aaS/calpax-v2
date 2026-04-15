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

  // Create the user via Better Auth's admin API
  // Since Better Auth uses its own user management, we create directly via Prisma
  // and create an account with a generated password hash
  const { hashPassword } = await import('better-auth/crypto')
  const tempPassword = crypto.randomUUID().slice(0, 16)
  const hashedPassword = await hashPassword(tempPassword)

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

  revalidatePath('/admin/invitations')
  return { user, tempPassword }
}
