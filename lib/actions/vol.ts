'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { requireAuth } from '@/lib/auth/requireAuth'
import { requireRole } from '@/lib/auth/requireRole'
import { getContext } from '@/lib/context'
import { StatutBillet, StatutVol } from '@prisma/client'
import { db } from '@/lib/db'
import { volCreateSchema, volPostFlightSchema } from '@/lib/schemas/vol'
import { generateFicheVolBuffer } from '@/lib/pdf/generate'
import { buildFicheVolData } from '@/lib/pdf/build-data'
import { uploadPve } from '@/lib/storage/pve'
import { validateVolCreation } from '@/lib/vol/validation'
import { sendCancellationEmails } from '@/lib/email/cancellation'
import { formatZodError } from '@/lib/zod-error'

function parseVolFormData(formData: FormData) {
  return {
    date: formData.get('date'),
    creneau: formData.get('creneau'),
    ballonId: formData.get('ballonId'),
    piloteId: formData.get('piloteId'),
    equipierId: formData.get('equipierId') || undefined,
    equipierAutre: formData.get('equipierAutre') || undefined,
    vehiculeId: formData.get('vehiculeId') || undefined,
    vehiculeAutre: formData.get('vehiculeAutre') || undefined,
    siteDecollageId: formData.get('siteDecollageId') || undefined,
    lieuDecollageAutre: formData.get('lieuDecollageAutre') || undefined,
    configGaz: formData.get('configGaz') || undefined,
    qteGaz: formData.get('qteGaz') || undefined,
  }
}

function resolveAutre(
  id: string | undefined,
  autre: string | undefined,
): { id: string | null; autre: string | null } {
  if (id === 'AUTRE') return { id: null, autre: autre || null }
  return { id: id || null, autre: null }
}

function resolveAutreEntities(rest: {
  equipierId?: string
  equipierAutre?: string
  vehiculeId?: string
  vehiculeAutre?: string
  siteDecollageId?: string
  lieuDecollageAutre?: string
}) {
  const equipier = resolveAutre(rest.equipierId, rest.equipierAutre)
  const vehicule = resolveAutre(rest.vehiculeId, rest.vehiculeAutre)
  const site = resolveAutre(rest.siteDecollageId, rest.lieuDecollageAutre)
  return {
    equipierId: equipier.id,
    equipierAutre: equipier.autre,
    vehiculeId: vehicule.id,
    vehiculeAutre: vehicule.autre,
    siteDecollageId: site.id,
    lieuDecollageAutre: site.autre,
  }
}

export async function createVol(locale: string, formData: FormData): Promise<{ error?: string }> {
  return requireAuth(async () => {
    requireRole('ADMIN_CALPAX', 'GERANT')
    const ctx = getContext()

    const raw = parseVolFormData(formData)

    const result = volCreateSchema.safeParse(raw)
    if (!result.success) {
      return { error: formatZodError(result.error) }
    }

    const { ballonId, piloteId, date, creneau, ...rest } = result.data

    const [ballon, pilote, existingVols] = await Promise.all([
      db.ballon.findUniqueOrThrow({ where: { id: ballonId } }),
      db.pilote.findUniqueOrThrow({ where: { id: piloteId } }),
      db.vol.findMany({
        where: { date, statut: { not: StatutVol.ANNULE } },
        select: { ballonId: true, piloteId: true, creneau: true },
      }),
    ])

    const validation = validateVolCreation({
      ballon,
      pilote,
      date,
      creneau,
      existingVols: existingVols.map((v) => ({
        ballonId: v.ballonId,
        piloteId: v.piloteId,
        creneau: v.creneau,
      })),
    })

    if (!validation.valid) {
      return { error: validation.errors.join('. ') }
    }

    const volData = {
      date,
      creneau,
      ballonId,
      piloteId,
      exploitantId: ctx.exploitantId,
      configGaz: rest.configGaz || ballon.configGaz,
      qteGaz: rest.qteGaz,
      ...resolveAutreEntities(rest),
    }

    const vol = await db.vol.create({ data: volData })

    redirect(`/${locale}/vols/${vol.id}`)
  })
}

export async function updateVol(
  volId: string,
  locale: string,
  formData: FormData,
): Promise<{ error?: string }> {
  return requireAuth(async () => {
    requireRole('ADMIN_CALPAX', 'GERANT')
    const vol = await db.vol.findUniqueOrThrow({ where: { id: volId } })
    if (vol.statut !== StatutVol.PLANIFIE && vol.statut !== StatutVol.CONFIRME) {
      return { error: 'Impossible de modifier un vol termine ou archive' }
    }

    const raw = parseVolFormData(formData)

    const result = volCreateSchema.safeParse(raw)
    if (!result.success) {
      return { error: formatZodError(result.error) }
    }

    const { ballonId, piloteId, date, creneau, ...rest } = result.data

    const [ballon, pilote, existingVols] = await Promise.all([
      db.ballon.findUniqueOrThrow({ where: { id: ballonId } }),
      db.pilote.findUniqueOrThrow({ where: { id: piloteId } }),
      db.vol.findMany({
        where: { date, statut: { not: StatutVol.ANNULE }, id: { not: volId } },
        select: { ballonId: true, piloteId: true, creneau: true },
      }),
    ])

    const validation = validateVolCreation({
      ballon,
      pilote,
      date,
      creneau,
      existingVols: existingVols.map((v) => ({
        ballonId: v.ballonId,
        piloteId: v.piloteId,
        creneau: v.creneau,
      })),
    })

    if (!validation.valid) {
      return { error: validation.errors.join('. ') }
    }

    await db.vol.update({
      where: { id: volId },
      data: {
        date,
        creneau,
        ballonId,
        piloteId,
        configGaz: rest.configGaz || ballon.configGaz,
        qteGaz: rest.qteGaz,
        ...resolveAutreEntities(rest),
      },
    })

    revalidatePath(`/${locale}/vols/${volId}`)
    return {}
  })
}

export async function savePostFlight(
  volId: string,
  locale: string,
  formData: FormData,
): Promise<{ error?: string }> {
  return requireAuth(async () => {
    requireRole('ADMIN_CALPAX', 'GERANT', 'PILOTE')
    const vol = await db.vol.findUniqueOrThrow({
      where: { id: volId },
      select: { statut: true, exploitantId: true },
    })
    if (vol.statut === StatutVol.ARCHIVE || vol.statut === StatutVol.ANNULE) {
      return { error: 'Ce vol ne peut pas être modifié' }
    }

    const raw = {
      decoLieu: formData.get('decoLieu'),
      decoHeure: formData.get('decoHeure'),
      atterLieu: formData.get('atterLieu'),
      atterHeure: formData.get('atterHeure'),
      gasConso: formData.get('gasConso') || undefined,
      distance: formData.get('distance') || undefined,
      anomalies: formData.get('anomalies') || undefined,
      noteDansCarnet: formData.get('noteDansCarnet') === 'true',
    }

    const result = volPostFlightSchema.safeParse(raw)
    if (!result.success) {
      return { error: formatZodError(result.error) }
    }

    await db.vol.update({
      where: { id: volId },
      data: { ...result.data, statut: StatutVol.TERMINE },
    })

    redirect(`/${locale}/vols/${volId}`)
  })
}

export async function archivePve(volId: string, locale: string): Promise<{ error?: string }> {
  return requireAuth(async () => {
    requireRole('ADMIN_CALPAX', 'GERANT')
    const ctx = getContext()

    const volCheck = await db.vol.findUniqueOrThrow({
      where: { id: volId },
      select: { statut: true, exploitantId: true },
    })

    if (volCheck.statut !== StatutVol.TERMINE) {
      return { error: 'Le vol doit être en statut TERMINÉ pour archiver le PVE' }
    }

    const now = new Date()
    const { data } = await buildFicheVolData(volId, { isPve: true, archivedAt: now })
    const buffer = await generateFicheVolBuffer(data)

    const pvePath = await uploadPve(ctx.exploitantId, volId, buffer)

    await db.vol.update({
      where: { id: volId },
      data: { statut: StatutVol.ARCHIVE, pvePdfUrl: pvePath, pveArchivedAt: now },
    })

    const passagersWithBillet = await db.passager.findMany({
      where: { volId },
      select: { billetId: true },
    })
    const billetIds = [...new Set(passagersWithBillet.map((p) => p.billetId))]
    await db.billet.updateMany({
      where: { id: { in: billetIds } },
      data: { statut: StatutBillet.VOLE },
    })

    redirect(`/${locale}/vols/${volId}`)
  })
}

export async function cancelVol(
  volId: string,
  locale: string,
  reason?: string,
): Promise<{ error?: string }> {
  return requireAuth(async () => {
    requireRole('ADMIN_CALPAX', 'GERANT')
    const ctx = getContext()

    const vol = await db.vol.findUniqueOrThrow({
      where: { id: volId },
      include: {
        ballon: { select: { nom: true } },
        pilote: { select: { email: true, userId: true } },
        exploitant: { select: { name: true } },
        passagers: {
          select: {
            billetId: true,
            billet: { select: { payeurEmail: true } },
          },
        },
      },
    })

    if (vol.statut === StatutVol.ARCHIVE) {
      return { error: "Impossible d'annuler un vol archive" }
    }

    const billetIds = [...new Set(vol.passagers.map((p) => p.billetId))]

    await db.passager.updateMany({ where: { volId }, data: { volId: null } })
    await db.billet.updateMany({
      where: { id: { in: billetIds } },
      data: { statut: StatutBillet.EN_ATTENTE },
    })

    await db.vol.update({
      where: { id: volId },
      data: { statut: StatutVol.ANNULE, cancelReason: reason ?? null },
    })

    const payeurEmails = [
      ...new Set(vol.passagers.map((p) => p.billet?.payeurEmail).filter((e): e is string => !!e)),
    ]

    await sendCancellationEmails({
      payeurEmails,
      piloteEmail: vol.pilote.email ?? null,
      equipierEmail: null,
      cancellingUserId: ctx.userId,
      piloteUserId: vol.pilote.userId ?? null,
      data: {
        ballonNom: vol.ballon.nom,
        date: vol.date,
        creneau: vol.creneau,
        exploitantName: vol.exploitant.name,
        reason: reason ?? 'Non precisee',
      },
    })

    redirect(`/${locale}/vols`)
  })
}
