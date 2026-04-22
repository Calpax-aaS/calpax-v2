'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { requireAuth } from '@/lib/auth/requireAuth'
import { requireRole } from '@/lib/auth/requireRole'
import { getContext } from '@/lib/context'
import { db } from '@/lib/db'
import { basePrisma } from '@/lib/db/base'
import { billetCreateSchema, type BilletFormData } from '@/lib/schemas/billet'
import { encrypt } from '@/lib/crypto'
import { formatReference, computeLuhnChecksum } from '@/lib/billet/reference'
import { formatZodError } from '@/lib/zod-error'

function mapPassagerForCreate(p: BilletFormData['passagers'][number], exploitantId: string) {
  return {
    exploitantId,
    prenom: p.prenom,
    nom: p.nom,
    // Dual-write: keep plaintext (legacy) alongside encrypted until a follow-up
    // migration drops the plaintext columns (cf. issue #4).
    email: p.email || null,
    telephone: p.telephone || null,
    emailEncrypted: p.email ? encrypt(p.email) : null,
    telephoneEncrypted: p.telephone ? encrypt(p.telephone) : null,
    age: p.age ?? null,
    poidsEncrypted: p.poids != null ? encrypt(p.poids.toString()) : null,
    pmr: p.pmr,
  }
}

async function nextSequence(exploitantId: string, year: number): Promise<number> {
  const row = await basePrisma.$queryRaw<{ lastSeq: number }[]>`
    INSERT INTO billet_sequence ("exploitantId", year, "lastSeq")
    VALUES (${exploitantId}, ${year}, 1)
    ON CONFLICT ("exploitantId", year)
    DO UPDATE SET "lastSeq" = billet_sequence."lastSeq" + 1
    RETURNING "lastSeq"
  `
  const first = row[0]
  if (!first) throw new Error('nextSequence: no row returned')
  return first.lastSeq
}

function extractBilletData(formData: FormData) {
  const passagersJson = formData.get('passagers')
  let passagers: unknown[] = []
  if (typeof passagersJson === 'string') {
    try {
      passagers = JSON.parse(passagersJson)
    } catch {
      passagers = []
    }
  }

  return {
    typePlannif: formData.get('typePlannif'),
    dateVolDeb: formData.get('dateVolDeb') || undefined,
    dateVolFin: formData.get('dateVolFin') || undefined,
    dateValidite: formData.get('dateValidite') || undefined,
    payeurCiv: formData.get('payeurCiv') || undefined,
    payeurPrenom: formData.get('payeurPrenom'),
    payeurNom: formData.get('payeurNom'),
    payeurEmail: formData.get('payeurEmail') || undefined,
    payeurTelephone: formData.get('payeurTelephone') || undefined,
    payeurAdresse: formData.get('payeurAdresse') || undefined,
    payeurCp: formData.get('payeurCp') || undefined,
    payeurVille: formData.get('payeurVille') || undefined,
    montantTtc: formData.get('montantTtc'),
    categorie: formData.get('categorie') || undefined,
    provenance: formData.get('provenance') || undefined,
    lieuDecollage: formData.get('lieuDecollage') || undefined,
    survol: formData.get('survol') || undefined,
    commentaire: formData.get('commentaire') || undefined,
    dateRappel: formData.get('dateRappel') || undefined,
    estBonCadeau: formData.get('estBonCadeau') === 'true',
    dateCadeau: formData.get('dateCadeau') || undefined,
    destinataireNom: formData.get('destinataireNom') || undefined,
    destinataireEmail: formData.get('destinataireEmail') || undefined,
    organisateurNom: formData.get('organisateurNom') || undefined,
    organisateurEmail: formData.get('organisateurEmail') || undefined,
    organisateurTelephone: formData.get('organisateurTelephone') || undefined,
    passagers,
  }
}

export async function createBillet(
  locale: string,
  formData: FormData,
): Promise<{ error?: string }> {
  return requireAuth(async () => {
    requireRole('ADMIN_CALPAX', 'GERANT')
    const ctx = getContext()

    const raw = extractBilletData(formData)
    const result = billetCreateSchema.safeParse(raw)
    if (!result.success) {
      return { error: formatZodError(result.error) }
    }

    const { passagers, ...billetData } = result.data
    const year = new Date().getFullYear()
    const exploitant = await db.exploitant.findUniqueOrThrow({
      where: { id: ctx.exploitantId },
      select: { billetPrefix: true, name: true },
    })
    const prefix = exploitant.billetPrefix ?? exploitant.name.slice(0, 3).toUpperCase()
    const seq = await nextSequence(ctx.exploitantId, year)
    const reference = formatReference(prefix, year, seq)
    const checksum = computeLuhnChecksum(reference)

    const billet = await db.billet.create({
      data: {
        ...billetData,
        exploitantId: ctx.exploitantId,
        reference,
        checksum,
        passagers: {
          create: passagers.map((p) => mapPassagerForCreate(p, ctx.exploitantId)),
        },
      },
    })

    redirect(`/${locale}/billets/${billet.id}`)
  })
}

export async function updateBillet(
  id: string,
  locale: string,
  formData: FormData,
): Promise<{ error?: string }> {
  return requireAuth(async () => {
    requireRole('ADMIN_CALPAX', 'GERANT')
    const ctx = getContext()

    const raw = extractBilletData(formData)
    const result = billetCreateSchema.safeParse(raw)
    if (!result.success) {
      return { error: formatZodError(result.error) }
    }

    const { passagers, ...billetData } = result.data

    await db.$transaction([
      db.passager.deleteMany({ where: { billetId: id } }),
      db.billet.update({
        where: { id },
        data: {
          ...billetData,
          passagers: {
            create: passagers.map((p) => mapPassagerForCreate(p, ctx.exploitantId)),
          },
        },
      }),
    ])

    revalidatePath(`/${locale}/billets/${id}`)
    return {}
  })
}
