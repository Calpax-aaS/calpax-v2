'use server'

import { revalidatePath } from 'next/cache'
import { Prisma } from '@prisma/client'
import { requireAuth } from '@/lib/auth/requireAuth'
import { requireRole } from '@/lib/auth/requireRole'
import { getContext } from '@/lib/context'
import { db } from '@/lib/db'

function isUniqueConstraintError(err: unknown): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002'
}

export async function createTag(formData: FormData): Promise<{ error?: string }> {
  return requireAuth(async () => {
    requireRole('ADMIN_CALPAX', 'GERANT')
    const ctx = getContext()
    const nomRaw = formData.get('nom')
    const couleurRaw = formData.get('couleur')
    const nom = typeof nomRaw === 'string' ? nomRaw.trim() : ''
    if (!nom) return { error: 'Nom requis' }
    const couleur = typeof couleurRaw === 'string' && couleurRaw ? couleurRaw : null

    try {
      await db.tag.create({ data: { nom, couleur, exploitantId: ctx.exploitantId } })
    } catch (err) {
      if (isUniqueConstraintError(err)) {
        return { error: 'Un tag avec ce nom existe déjà' }
      }
      throw err
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
      if (isUniqueConstraintError(err)) {
        return { error: 'Tag déjà assigné' }
      }
      throw err
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
