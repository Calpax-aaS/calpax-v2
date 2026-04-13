'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { requireAuth } from '@/lib/auth/requireAuth'
import { getContext } from '@/lib/context'
import { db } from '@/lib/db'
import { volCreateSchema, volPostFlightSchema } from '@/lib/schemas/vol'
import { decrypt } from '@/lib/crypto'
import { generateFicheVolBuffer } from '@/lib/pdf/generate'
import { uploadPve } from '@/lib/storage/pve'
import { validateVolCreation } from '@/lib/vol/validation'
import { getWeather } from '@/lib/weather/cache'
import { extractCreneauHours } from '@/lib/weather/extract'
import { summarizeWeather } from '@/lib/weather/classify'

export async function createVol(locale: string, formData: FormData): Promise<{ error?: string }> {
  return requireAuth(async () => {
    const ctx = getContext()

    const raw = {
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

    const result = volCreateSchema.safeParse(raw)
    if (!result.success) {
      const firstError = result.error.issues[0]
      return { error: firstError?.message ?? 'Donnees invalides' }
    }

    const { ballonId, piloteId, date, creneau, ...rest } = result.data

    const [ballon, pilote, existingVols] = await Promise.all([
      db.ballon.findUniqueOrThrow({ where: { id: ballonId } }),
      db.pilote.findUniqueOrThrow({ where: { id: piloteId } }),
      db.vol.findMany({
        where: { date, statut: { not: 'ANNULE' } },
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
      equipierId: rest.equipierId && rest.equipierId !== 'AUTRE' ? rest.equipierId : null,
      equipierAutre: rest.equipierId === 'AUTRE' ? rest.equipierAutre || null : null,
      vehiculeId: rest.vehiculeId && rest.vehiculeId !== 'AUTRE' ? rest.vehiculeId : null,
      vehiculeAutre: rest.vehiculeId === 'AUTRE' ? rest.vehiculeAutre || null : null,
      siteDecollageId:
        rest.siteDecollageId && rest.siteDecollageId !== 'AUTRE' ? rest.siteDecollageId : null,
      lieuDecollageAutre: rest.siteDecollageId === 'AUTRE' ? rest.lieuDecollageAutre || null : null,
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
    const vol = await db.vol.findUniqueOrThrow({ where: { id: volId } })
    if (vol.statut !== 'PLANIFIE' && vol.statut !== 'CONFIRME') {
      return { error: 'Impossible de modifier un vol termine ou archive' }
    }

    const raw = {
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

    const result = volCreateSchema.safeParse(raw)
    if (!result.success) {
      const firstError = result.error.issues[0]
      return { error: firstError?.message ?? 'Donnees invalides' }
    }

    const { ballonId, piloteId, date, creneau, ...rest } = result.data

    const [ballon, pilote, existingVols] = await Promise.all([
      db.ballon.findUniqueOrThrow({ where: { id: ballonId } }),
      db.pilote.findUniqueOrThrow({ where: { id: piloteId } }),
      db.vol.findMany({
        where: { date, statut: { not: 'ANNULE' }, id: { not: volId } },
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
        equipierId: rest.equipierId && rest.equipierId !== 'AUTRE' ? rest.equipierId : null,
        equipierAutre: rest.equipierId === 'AUTRE' ? rest.equipierAutre || null : null,
        vehiculeId: rest.vehiculeId && rest.vehiculeId !== 'AUTRE' ? rest.vehiculeId : null,
        vehiculeAutre: rest.vehiculeId === 'AUTRE' ? rest.vehiculeAutre || null : null,
        siteDecollageId:
          rest.siteDecollageId && rest.siteDecollageId !== 'AUTRE' ? rest.siteDecollageId : null,
        lieuDecollageAutre:
          rest.siteDecollageId === 'AUTRE' ? rest.lieuDecollageAutre || null : null,
      },
    })

    revalidatePath(`/${locale}/vols/${volId}`)
    redirect(`/${locale}/vols/${volId}`)
  })
}

export async function savePostFlight(
  volId: string,
  locale: string,
  formData: FormData,
): Promise<{ error?: string }> {
  return requireAuth(async () => {
    const raw = {
      decoLieu: formData.get('decoLieu'),
      decoHeure: formData.get('decoHeure'),
      atterLieu: formData.get('atterLieu'),
      atterHeure: formData.get('atterHeure'),
      gasConso: formData.get('gasConso') || undefined,
      distance: formData.get('distance') || undefined,
      anomalies: formData.get('anomalies') || undefined,
      noteDansCarnet: formData.get('noteDansCarnet') ?? true,
    }

    const result = volPostFlightSchema.safeParse(raw)
    if (!result.success) {
      const firstError = result.error.issues[0]
      return { error: firstError?.message ?? 'Donnees invalides' }
    }

    await db.vol.update({
      where: { id: volId },
      data: { ...result.data, statut: 'TERMINE' },
    })

    redirect(`/${locale}/vols/${volId}`)
  })
}

export async function archivePve(volId: string, locale: string): Promise<{ error?: string }> {
  return requireAuth(async () => {
    const ctx = getContext()

    const vol = await db.vol.findUniqueOrThrow({
      where: { id: volId },
      include: {
        exploitant: {
          select: {
            name: true,
            frDecNumber: true,
            logoUrl: true,
            meteoLatitude: true,
            meteoLongitude: true,
            meteoSeuilVent: true,
          },
        },
        ballon: true,
        pilote: true,
        equipierEntity: { select: { prenom: true, nom: true } },
        vehiculeEntity: { select: { nom: true } },
        siteDecollageEntity: { select: { nom: true } },
        passagers: { include: { billet: { select: { id: true, reference: true } } } },
      },
    })

    if (vol.statut !== 'TERMINE') {
      return { error: 'Le vol doit etre en statut TERMINE pour archiver le PVE' }
    }

    const pilotePoids = vol.pilote.poidsEncrypted
      ? parseInt(decrypt(vol.pilote.poidsEncrypted))
      : 80

    const passagers = vol.passagers.map((p) => ({
      prenom: p.prenom,
      nom: p.nom,
      age: p.age ?? 0,
      poids: p.poidsEncrypted ? parseInt(decrypt(p.poidsEncrypted)) : 0,
      pmr: p.pmr,
      billetReference: p.billet.reference,
    }))

    const now = new Date()
    const seuilVent = vol.exploitant.meteoSeuilVent ?? 15
    let meteo = undefined

    if (vol.exploitant.meteoLatitude && vol.exploitant.meteoLongitude) {
      try {
        const dateStr = vol.date.toISOString().slice(0, 10)
        const forecast = await getWeather({
          exploitantId: vol.exploitantId,
          latitude: vol.exploitant.meteoLatitude,
          longitude: vol.exploitant.meteoLongitude,
          date: dateStr,
        })
        const hours = extractCreneauHours(forecast, vol.creneau as 'MATIN' | 'SOIR')
        const summary = summarizeWeather(hours, seuilVent)
        meteo = { hours, summary, seuilVent }
      } catch {
        // Weather not available
      }
    }

    const equipierDisplay = vol.equipierEntity
      ? `${vol.equipierEntity.prenom} ${vol.equipierEntity.nom}`
      : (vol.equipierAutre ?? null)
    const vehiculeDisplay = vol.vehiculeEntity?.nom ?? vol.vehiculeAutre ?? null
    const lieuDecollageDisplay = vol.siteDecollageEntity?.nom ?? vol.lieuDecollageAutre ?? null

    const buffer = await generateFicheVolBuffer({
      exploitant: vol.exploitant,
      vol: {
        date: vol.date,
        creneau: vol.creneau,
        lieuDecollage: lieuDecollageDisplay,
        equipier: equipierDisplay,
        vehicule: vehiculeDisplay,
        configGaz: vol.configGaz ?? vol.ballon.configGaz,
        qteGaz: vol.qteGaz,
        decoLieu: vol.decoLieu,
        decoHeure: vol.decoHeure,
        atterLieu: vol.atterLieu,
        atterHeure: vol.atterHeure,
        gasConso: vol.gasConso,
        anomalies: vol.anomalies,
      },
      ballon: {
        nom: vol.ballon.nom,
        immatriculation: vol.ballon.immatriculation,
        volumeM3: vol.ballon.volumeM3,
        peseeAVide: vol.ballon.peseeAVide,
        performanceChart: vol.ballon.performanceChart as Record<string, number>,
        configGaz: vol.ballon.configGaz,
      },
      pilote: {
        prenom: vol.pilote.prenom,
        nom: vol.pilote.nom,
        licenceBfcl: vol.pilote.licenceBfcl,
        poids: pilotePoids,
      },
      passagers,
      temperatureCelsius: meteo?.summary.avgTemperature ?? 20,
      isPve: true,
      archivedAt: now,
      meteo,
    })

    const pvePath = await uploadPve(ctx.exploitantId, volId, buffer)

    await db.vol.update({
      where: { id: volId },
      data: { statut: 'ARCHIVE', pvePdfUrl: pvePath, pveArchivedAt: now },
    })

    const billetIds = [...new Set(vol.passagers.map((p) => p.billet.id))]
    for (const billetId of billetIds) {
      await db.billet.update({ where: { id: billetId }, data: { statut: 'VOLE' } })
    }

    redirect(`/${locale}/vols/${volId}`)
  })
}

export async function cancelVol(volId: string, locale: string): Promise<{ error?: string }> {
  return requireAuth(async () => {
    const vol = await db.vol.findUniqueOrThrow({ where: { id: volId } })
    if (vol.statut === 'ARCHIVE') {
      return { error: "Impossible d'annuler un vol archive" }
    }

    const passagers = await db.passager.findMany({ where: { volId } })
    const billetIds = [...new Set(passagers.map((p) => p.billetId))]

    await db.passager.updateMany({ where: { volId }, data: { volId: null } })
    for (const billetId of billetIds) {
      await db.billet.update({ where: { id: billetId }, data: { statut: 'EN_ATTENTE' } })
    }

    await db.vol.update({ where: { id: volId }, data: { statut: 'ANNULE' } })

    redirect(`/${locale}/vols`)
  })
}
