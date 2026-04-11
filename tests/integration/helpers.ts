import { basePrisma } from '@/lib/db/base'
import { runWithContext, type RequestContext, type UserRole } from '@/lib/context'

export async function resetDb() {
  await basePrisma.paiement.deleteMany({})
  await basePrisma.passager.deleteMany({})
  await basePrisma.billet.deleteMany({})
  await basePrisma.billetSequence.deleteMany({})
  await basePrisma.auditLog.deleteMany({})
  await basePrisma.session.deleteMany({})
  await basePrisma.account.deleteMany({})
  await basePrisma.verificationToken.deleteMany({})
  await basePrisma.pilote.deleteMany({})
  await basePrisma.ballon.deleteMany({})
  await basePrisma.user.deleteMany({})
  await basePrisma.exploitant.deleteMany({})
}

export type SeededTenant = {
  exploitantId: string
  userId: string
}

export async function seedTenant(label: string): Promise<SeededTenant> {
  const exploitant = await basePrisma.exploitant.create({
    data: {
      name: `Exploitant ${label}`,
      frDecNumber: `FR.DEC.${label}`,
    },
  })
  const user = await basePrisma.user.create({
    data: {
      email: `user-${label}@test.local`,
      name: `User ${label}`,
      role: 'GERANT',
      exploitantId: exploitant.id,
    },
  })
  return { exploitantId: exploitant.id, userId: user.id }
}

export async function asUser<T>(
  tenant: SeededTenant,
  role: UserRole,
  fn: () => Promise<T>,
  opts: { impersonatedBy?: string } = {},
): Promise<T> {
  const ctx: RequestContext = {
    userId: tenant.userId,
    exploitantId: tenant.exploitantId,
    role,
    impersonatedBy: opts.impersonatedBy,
  }
  return runWithContext(ctx, fn) as Promise<T>
}
