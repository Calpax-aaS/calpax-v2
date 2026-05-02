'use server'

import { Prisma } from '@prisma/client'
import { revalidatePath } from 'next/cache'
import { requireAuth } from '@/lib/auth/requireAuth'
import { requireRole } from '@/lib/auth/requireRole'
import { getContext } from '@/lib/context'
import { db } from '@/lib/db'
import { logger } from '@/lib/logger'

// Prisma unique-constraint violation — used to distinguish "duplicate" from
// real failures so we don't show the user a misleading message.
const UNIQUE_VIOLATION = 'P2002'

function isUniqueViolation(err: unknown): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === UNIQUE_VIOLATION
}

export async function createTag(formData: FormData): Promise<{ error?: string }> {
  return requireAuth(async () => {
    requireRole('ADMIN_CALPAX', 'GERANT')
    const ctx = getContext()
    const nom = formData.get('nom') as string
    const couleur = (formData.get('couleur') as string) || null
    if (!nom?.trim()) return { error: 'Nom requis' }

    try {
      await db.tag.create({ data: { nom: nom.trim(), couleur, exploitantId: ctx.exploitantId } })
    } catch (err) {
      if (isUniqueViolation(err)) {
        return { error: 'Un tag avec ce nom existe déjà' }
      }
      logger.error({ err, exploitantId: ctx.exploitantId }, 'createTag: unexpected failure')
      return { error: 'Erreur lors de la création du tag' }
    }
    revalidatePath('/settings')
    return {}
  })
}

export async function deleteTag(tagId: string): Promise<{ error?: string }> {
  return requireAuth(async () => {
    requireRole('ADMIN_CALPAX', 'GERANT')
    await db.tag.delete({ where: { id: tagId } })
    revalidatePath('/settings')
    return {}
  })
}

// BilletTag is UNTENANTED (join table without exploitantId column), so the
// tenant extension cannot auto-scope it. Validate that both ids belong to the
// caller's tenant via tenant-scoped reads before touching the join row.
async function assertBothInTenant(billetId: string, tagId: string): Promise<boolean> {
  const [billet, tag] = await Promise.all([
    db.billet.findUnique({ where: { id: billetId }, select: { id: true } }),
    db.tag.findUnique({ where: { id: tagId }, select: { id: true } }),
  ])
  return billet !== null && tag !== null
}

export async function addTagToBillet(billetId: string, tagId: string): Promise<{ error?: string }> {
  return requireAuth(async () => {
    requireRole('ADMIN_CALPAX', 'GERANT')
    if (!(await assertBothInTenant(billetId, tagId))) {
      return { error: 'Billet ou tag introuvable' }
    }
    const { basePrisma } = await import('@/lib/db/base')
    try {
      await basePrisma.billetTag.create({ data: { billetId, tagId } })
    } catch (err) {
      if (isUniqueViolation(err)) {
        return { error: 'Tag déjà assigné' }
      }
      logger.error({ err, billetId, tagId }, 'addTagToBillet: unexpected failure')
      return { error: "Erreur lors de l'ajout du tag" }
    }
    revalidatePath(`/billets/${billetId}`)
    return {}
  })
}

export async function removeTagFromBillet(
  billetId: string,
  tagId: string,
): Promise<{ error?: string }> {
  return requireAuth(async () => {
    requireRole('ADMIN_CALPAX', 'GERANT')
    if (!(await assertBothInTenant(billetId, tagId))) {
      return { error: 'Billet ou tag introuvable' }
    }
    const { basePrisma } = await import('@/lib/db/base')
    await basePrisma.billetTag.delete({
      where: { billetId_tagId: { billetId, tagId } },
    })
    revalidatePath(`/billets/${billetId}`)
    return {}
  })
}
