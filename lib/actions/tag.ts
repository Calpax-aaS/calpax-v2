'use server'

import { revalidatePath } from 'next/cache'
import { requireAuth } from '@/lib/auth/requireAuth'
import { requireRole } from '@/lib/auth/requireRole'
import { getContext } from '@/lib/context'
import { db } from '@/lib/db'

export async function createTag(formData: FormData): Promise<{ error?: string }> {
  return requireAuth(async () => {
    requireRole('ADMIN_CALPAX', 'GERANT')
    const ctx = getContext()
    const nom = formData.get('nom') as string
    const couleur = (formData.get('couleur') as string) || null
    if (!nom?.trim()) return { error: 'Nom requis' }

    try {
      await db.tag.create({ data: { nom: nom.trim(), couleur, exploitantId: ctx.exploitantId } })
    } catch {
      return { error: 'Un tag avec ce nom existe déjà' }
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

export async function addTagToBillet(billetId: string, tagId: string): Promise<{ error?: string }> {
  return requireAuth(async () => {
    requireRole('ADMIN_CALPAX', 'GERANT')
    const { basePrisma } = await import('@/lib/db/base')
    try {
      await basePrisma.billetTag.create({ data: { billetId, tagId } })
    } catch {
      return { error: 'Tag déjà assigné' }
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
    const { basePrisma } = await import('@/lib/db/base')
    await basePrisma.billetTag.delete({
      where: { billetId_tagId: { billetId, tagId } },
    })
    revalidatePath(`/billets/${billetId}`)
    return {}
  })
}
