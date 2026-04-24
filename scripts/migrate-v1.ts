/**
 * V1 → V2 data migration script.
 *
 * Reads the MySQL dump from v1-reference/bdd/extract_bdd.sql and inserts data
 * into the v2 PostgreSQL database via basePrisma (no tenant context needed).
 *
 * Usage:
 *   DATABASE_URL="..." npx tsx scripts/migrate-v1.ts
 *   # or with .env file:
 *   npx tsx scripts/migrate-v1.ts
 *
 * IMPORTANT: Run against a development/staging DB, not production!
 */
import 'dotenv/config'
import * as path from 'node:path'
import {
  type TypePlannif,
  type StatutBillet,
  type StatutPaiement,
  type ModePaiement,
  type StatutVol,
  type Creneau,
} from '@prisma/client'
import { basePrisma as prisma } from '../lib/db/base'
import { encrypt } from '../lib/crypto'
import { computeLuhnChecksum } from '../lib/billet/reference'
import { parseSqlDump } from './parse-sql'
import type { SqlRow } from './parse-sql'

// ---------------------------------------------------------------------------
// ID mapping tables: v1 INT id (string key) → v2 CUID
// ---------------------------------------------------------------------------
const ballonMap = new Map<string, string>()
const piloteMap = new Map<string, string>()
const equipierMap = new Map<string, string>()
const vehiculeMap = new Map<string, string>()
const billetMap = new Map<string, string>()
const passagerMap = new Map<string, string>()
const volMap = new Map<string, string>()

// Lookup: v1 id → display name
const categorieNames = new Map<string, string>()
const provenanceNames = new Map<string, string>()
const statutBilletNames = new Map<string, string>()
const statutPaiementNames = new Map<string, string>()
const modePaiementNames = new Map<string, string>()
const volParticulariteNames = new Map<string, string>()

// Tag id → v2 tag id
const tagIdByName = new Map<string, string>()

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------
const report = {
  ballons: { created: 0, updated: 0, skipped: 0 },
  pilotes: { created: 0, updated: 0, skipped: 0 },
  equipiers: { created: 0, skipped: 0 },
  vehicules: { created: 0, skipped: 0 },
  billets: { created: 0, errors: 0 },
  passagers: { created: 0, errors: 0, noWeight: 0 },
  paiements: { created: 0, errors: 0 },
  vols: { created: 0, errors: 0, duplicates: 0 },
  passagerVols: { assigned: 0, multiVol: 0, errors: 0 },
  tags: { created: 0 },
  warnings: [] as string[],
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Parse a v1 date string into a JS Date, returning null for invalid / zero dates.
 */
function parseDate(raw: string | null | undefined): Date | null {
  if (!raw) return null
  if (raw === '0000-00-00' || raw === '0000-00-00 00:00:00') return null
  const d = new Date(raw)
  if (isNaN(d.getTime())) return null
  // MySQL '0000-...' dates parsed by JS are way in the past — reject
  if (d.getFullYear() < 1900) return null
  return d
}

function str(val: string | null | undefined): string {
  return val ?? ''
}

function nullIfEmpty(val: string | null | undefined): string | null {
  if (val === null || val === undefined || val.trim() === '') return null
  return val.trim()
}

// ---------------------------------------------------------------------------
// Step 2: lookup maps
// ---------------------------------------------------------------------------
function buildLookupMaps(tables: Map<string, SqlRow[]>): void {
  for (const row of tables.get('categorie') ?? []) {
    if (row['id_categorie'] && row['nom']) {
      categorieNames.set(row['id_categorie'], row['nom'])
    }
  }
  for (const row of tables.get('provenance') ?? []) {
    if (row['id_provenance'] && row['nom']) {
      provenanceNames.set(row['id_provenance'], row['nom'])
    }
  }
  for (const row of tables.get('statutbilletvol') ?? []) {
    if (row['id_statutBilletVol'] && row['nom']) {
      statutBilletNames.set(row['id_statutBilletVol'], row['nom'])
    }
  }
  for (const row of tables.get('statutpaiement') ?? []) {
    if (row['id_statutPaiement'] && row['nom']) {
      statutPaiementNames.set(row['id_statutPaiement'], row['nom'])
    }
  }
  for (const row of tables.get('modepaiement') ?? []) {
    if (row['id_modePaiement'] && row['nom']) {
      modePaiementNames.set(row['id_modePaiement'], row['nom'])
    }
  }
  for (const row of tables.get('volparticularite') ?? []) {
    if (row['id_volParticularite'] && row['nom']) {
      volParticulariteNames.set(row['id_volParticularite'], row['nom'])
    }
  }
}

// ---------------------------------------------------------------------------
// Step 3: tags
// ---------------------------------------------------------------------------
async function migrateTags(tables: Map<string, SqlRow[]>, exploitantId: string): Promise<void> {
  console.log('\n[Step 3] Creating tags from volparticularite and categorie...')

  const tagNames = new Set<string>()

  for (const [, name] of Array.from(volParticulariteNames)) {
    tagNames.add(name)
  }
  for (const [, name] of Array.from(categorieNames)) {
    tagNames.add(name)
  }

  for (const nom of Array.from(tagNames)) {
    try {
      const tag = await prisma.tag.upsert({
        where: { exploitantId_nom: { exploitantId, nom } },
        update: {},
        create: { exploitantId, nom },
      })
      tagIdByName.set(nom, tag.id)
      report.tags.created++
    } catch (err) {
      report.warnings.push(`Tag upsert failed for "${nom}": ${err}`)
    }
  }

  console.log(`  ${report.tags.created} tags upserted.`)
}

// ---------------------------------------------------------------------------
// Step 4: montgolfieres → ballons
// ---------------------------------------------------------------------------
async function migrateBallons(tables: Map<string, SqlRow[]>, exploitantId: string): Promise<void> {
  console.log('\n[Step 4] Migrating montgolfieres → ballons...')

  const rows = tables.get('montgolfiere') ?? []

  for (const row of rows) {
    const v1Id = row['id_montgolfiere']
    if (!v1Id) continue

    const nom = str(row['nom']).trim()
    const immat = str(row['immat']).trim().toUpperCase()
    const nbPassagerMax = parseInt(str(row['nbPassager']) || '0', 10)
    const actif = row['afficher'] === '1'

    if (!immat || immat === 'F-') {
      report.ballons.skipped++
      report.warnings.push(`Ballon v1#${v1Id} "${nom}" skipped: invalid immatriculation "${immat}"`)
      continue
    }

    try {
      const existing = await prisma.ballon.findUnique({
        where: { exploitantId_immatriculation: { exploitantId, immatriculation: immat } },
      })

      if (existing) {
        // Update actif and nom from v1 data
        await prisma.ballon.update({
          where: { id: existing.id },
          data: { nom, actif, nbPassagerMax },
        })
        ballonMap.set(v1Id, existing.id)
        report.ballons.updated++
      } else {
        const created = await prisma.ballon.create({
          data: {
            exploitantId,
            nom,
            immatriculation: immat,
            nbPassagerMax,
            volumeM3: 0,
            peseeAVide: 0,
            configGaz: 'inconnu',
            manexAnnexRef: 'N/A',
            performanceChart: {},
            actif,
          },
        })
        ballonMap.set(v1Id, created.id)
        report.ballons.created++
      }
    } catch (err) {
      report.warnings.push(`Ballon v1#${v1Id} "${nom}" error: ${err}`)
      report.ballons.skipped++
    }
  }

  console.log(
    `  ${report.ballons.created} created, ${report.ballons.updated} updated, ${report.ballons.skipped} skipped.`,
  )
}

// ---------------------------------------------------------------------------
// Step 5: personnes → pilotes + equipiers
// ---------------------------------------------------------------------------

const SKIP_PERSONNE_NAMES = new Set(['AUTRE', 'VDF', 'VDF bis', 'SOAP', 'VerifBV'])

async function migratePersonnes(
  tables: Map<string, SqlRow[]>,
  exploitantId: string,
): Promise<void> {
  console.log('\n[Step 5] Migrating personnes → pilotes + equipiers...')

  const rows = tables.get('personne') ?? []

  // Known seed pilots to avoid overwriting: match by normalized first name fragment
  const seedPilotNames = ['Olivier', 'Eric', 'Max', 'Hervé', 'Herve']

  for (const row of rows) {
    const v1Id = row['id_personne']
    if (!v1Id) continue

    const prenom = str(row['prenom']).trim()
    const nom = str(row['nom']).trim()
    const fullName = `${prenom} ${nom}`.trim()

    // Skip entries with no meaningful name
    if (!prenom && !nom) {
      report.pilotes.skipped++
      report.equipiers.skipped++
      continue
    }
    if (SKIP_PERSONNE_NAMES.has(prenom) || SKIP_PERSONNE_NAMES.has(nom)) {
      report.pilotes.skipped++
      continue
    }

    const isPilote = row['pilote'] === '1'
    const isEquipier = row['equipier'] === '1'

    // Pilote migration
    if (isPilote) {
      try {
        // Check if this is a known seed pilot
        const isSeedPilot = seedPilotNames.some((n) =>
          prenom.toLowerCase().includes(n.toLowerCase()),
        )

        if (isSeedPilot) {
          // Just find the existing record and map it
          const existing = await prisma.pilote.findFirst({
            where: {
              exploitantId,
              prenom: { contains: prenom.split(' ')[0] ?? prenom, mode: 'insensitive' },
            },
          })
          if (existing) {
            piloteMap.set(v1Id, existing.id)
            report.pilotes.updated++
          } else {
            // Create anyway with import defaults
            const created = await prisma.pilote.create({
              data: {
                exploitantId,
                prenom: prenom || 'Inconnu',
                nom: nom || `v1#${v1Id}`,
                licenceBfcl: `IMPORT-${v1Id}`,
                dateExpirationLicence: new Date('2025-01-01'),
                actif: row['afficher'] === '1',
              },
            })
            piloteMap.set(v1Id, created.id)
            report.pilotes.created++
          }
        } else {
          // Upsert by prenom+nom (case-insensitive search, then create)
          const existing = await prisma.pilote.findFirst({
            where: {
              exploitantId,
              prenom: { equals: prenom || 'Inconnu', mode: 'insensitive' },
              nom: { equals: nom || `v1#${v1Id}`, mode: 'insensitive' },
            },
          })

          if (existing) {
            piloteMap.set(v1Id, existing.id)
            report.pilotes.updated++
          } else {
            const created = await prisma.pilote.create({
              data: {
                exploitantId,
                prenom: prenom || 'Inconnu',
                nom: nom || `v1#${v1Id}`,
                email: nullIfEmpty(row['email']),
                telephone: nullIfEmpty(row['telephone']),
                licenceBfcl: `IMPORT-${v1Id}`,
                dateExpirationLicence: new Date('2025-01-01'),
                actif: row['afficher'] === '1',
              },
            })
            piloteMap.set(v1Id, created.id)
            report.pilotes.created++
          }
        }
      } catch (err) {
        report.warnings.push(`Pilote v1#${v1Id} "${fullName}" error: ${err}`)
        report.pilotes.skipped++
      }
    }

    // Equipier migration (a person can be both pilote and equipier)
    if (isEquipier && !isPilote) {
      try {
        const existing = await prisma.equipier.findFirst({
          where: {
            exploitantId,
            prenom: { equals: prenom || 'Inconnu', mode: 'insensitive' },
            nom: { equals: nom || `v1#${v1Id}`, mode: 'insensitive' },
          },
        })

        if (existing) {
          equipierMap.set(v1Id, existing.id)
          report.equipiers.skipped++
        } else {
          const created = await prisma.equipier.create({
            data: {
              exploitantId,
              prenom: prenom || 'Inconnu',
              nom: nom || `v1#${v1Id}`,
              telephone: nullIfEmpty(row['telephone']),
              actif: row['afficher'] === '1',
            },
          })
          equipierMap.set(v1Id, created.id)
          report.equipiers.created++
        }
      } catch (err) {
        report.warnings.push(`Equipier v1#${v1Id} "${fullName}" error: ${err}`)
        report.equipiers.skipped++
      }
    }

    // If person is both pilote and equipier, also add them to the equipier map
    // pointing to their pilote record won't work — only add a separate equipier if needed
  }

  console.log(
    `  Pilotes: ${report.pilotes.created} created, ${report.pilotes.updated} found/updated, ${report.pilotes.skipped} skipped.`,
  )
  console.log(
    `  Equipiers: ${report.equipiers.created} created, ${report.equipiers.skipped} skipped.`,
  )
}

// ---------------------------------------------------------------------------
// Step 6: vehicules
// ---------------------------------------------------------------------------
async function migrateVehicules(
  tables: Map<string, SqlRow[]>,
  exploitantId: string,
): Promise<void> {
  console.log('\n[Step 6] Migrating vehicules...')

  const rows = tables.get('vehicule') ?? []

  for (const row of rows) {
    const v1Id = row['id_vehicule']
    if (!v1Id) continue

    const nom = str(row['nom']).trim()
    if (!nom) {
      report.vehicules.skipped++
      continue
    }

    try {
      const existing = await prisma.vehicule.findFirst({
        where: { exploitantId, nom: { equals: nom, mode: 'insensitive' } },
      })

      if (existing) {
        vehiculeMap.set(v1Id, existing.id)
        report.vehicules.skipped++
      } else {
        const created = await prisma.vehicule.create({
          data: {
            exploitantId,
            nom,
            actif: row['afficher'] === '1',
          },
        })
        vehiculeMap.set(v1Id, created.id)
        report.vehicules.created++
      }
    } catch (err) {
      report.warnings.push(`Vehicule v1#${v1Id} "${nom}" error: ${err}`)
      report.vehicules.skipped++
    }
  }

  console.log(
    `  ${report.vehicules.created} created, ${report.vehicules.skipped} already existed/skipped.`,
  )
}

// ---------------------------------------------------------------------------
// Step 7: billets
// ---------------------------------------------------------------------------

function mapTypePlannif(v1Type: string | null): TypePlannif {
  switch (v1Type) {
    case 'Indetermine':
      return 'A_DEFINIR'
    case 'auPlusVite':
      return 'AU_PLUS_VITE'
    case 'touteLaJournee':
      return 'TOUTE_LA_JOURNEE'
    case 'matin':
      return 'MATIN'
    case 'soir':
      return 'SOIR'
    case 'autre':
      return 'AUTRE'
    default:
      return 'A_DEFINIR'
  }
}

function mapStatutBillet(
  v1StatutId: string | null,
  statutBilletNames: Map<string, string>,
): StatutBillet {
  const nom = statutBilletNames.get(str(v1StatutId)) ?? ''
  switch (nom) {
    case 'Non planifié':
      return 'EN_ATTENTE'
    case 'Planifié':
    case 'Partiellement organisé':
    case 'Organisé':
      return 'PLANIFIE'
    case 'Partiellement effectué':
    case 'Effectué':
      return 'VOLE'
    case 'Partiellement annulé':
    case 'Annulé':
      return 'ANNULE'
    default:
      return 'EN_ATTENTE'
  }
}

function mapStatutPaiement(
  v1StatutId: string | null,
  statutPaiementNames: Map<string, string>,
): StatutPaiement {
  const nom = statutPaiementNames.get(str(v1StatutId)) ?? ''
  switch (nom) {
    case 'Non payé':
      return 'EN_ATTENTE'
    case 'Offert':
    case 'Paiement reçu':
    case 'Encaissé':
      return 'SOLDE'
    case 'Paiement partiel':
      return 'PARTIEL'
    default:
      return 'EN_ATTENTE'
  }
}

async function migrateBillets(tables: Map<string, SqlRow[]>, exploitantId: string): Promise<void> {
  console.log('\n[Step 7] Migrating billets...')

  const billetRows = tables.get('billetvol') ?? []
  const passagerRows = tables.get('passager') ?? []

  // Build a lookup: billetVol id → passager rows
  const passagersByBillet = new Map<string, SqlRow[]>()
  for (const p of passagerRows) {
    const bid = p['id_billetVol']
    if (!bid) continue
    const existing = passagersByBillet.get(bid) ?? []
    existing.push(p)
    passagersByBillet.set(bid, existing)
  }

  for (const row of billetRows) {
    const v1Id = row['id_billetVol']
    if (!v1Id) continue

    const reference = str(row['reference']).trim()
    const checksum = reference ? computeLuhnChecksum(reference) : '0'

    // Find payeur among passagers of this billet
    const bPassagers = passagersByBillet.get(v1Id) ?? []
    const payeur = bPassagers.find((p) => p['payeur'] === '1')
    const beneficiaire = bPassagers.find((p) => p['beneficiaire'] === '1')

    // Detect bon cadeau: payeur exists AND a different passager is beneficiaire
    const estBonCadeau = !!(
      payeur &&
      beneficiaire &&
      payeur['id_passager'] !== beneficiaire['id_passager']
    )

    const typePlannif = mapTypePlannif(row['typePlannif'] ?? null)
    const statut = mapStatutBillet(row['id_statutBilletVol'] ?? null, statutBilletNames)
    const statutPaiement = mapStatutPaiement(row['id_statutPaiement'] ?? null, statutPaiementNames)

    const montantRaw = parseFloat(str(row['montantTtc']) || '0')

    const categorieId = row['id_categorie']
    const categorieNom = categorieId ? (categorieNames.get(categorieId) ?? null) : null
    const provenanceId = row['id_provenance']
    const provenanceNom = provenanceId ? (provenanceNames.get(provenanceId) ?? null) : null
    const particulariteId = row['id_volParticularite']
    const particulariteNom = particulariteId
      ? (volParticulariteNames.get(particulariteId) ?? null)
      : null

    try {
      const created = await prisma.billet.create({
        data: {
          exploitantId,
          reference,
          checksum,
          typePlannif,
          statut,
          statutPaiement,
          montantTtc: montantRaw,
          enAttente: row['enAttente'] === '1',

          // Payeur info from passager table
          payeurCiv: payeur ? nullIfEmpty(payeur['civ']) : null,
          payeurPrenom: payeur ? str(payeur['prenom']).trim() : '',
          payeurNom: payeur ? str(payeur['nom']).trim() : '',
          payeurEmail: payeur ? nullIfEmpty(payeur['email']) : null,
          payeurTelephone: payeur ? nullIfEmpty(payeur['telephone']) : null,
          payeurAdresse: payeur ? nullIfEmpty(payeur['rue']) : null,
          payeurCp: payeur ? nullIfEmpty(payeur['codePostal']) : null,
          payeurVille: payeur ? nullIfEmpty(payeur['ville']) : null,

          categorie: categorieNom,
          provenance: provenanceNom,
          lieuDecollage: nullIfEmpty(row['lieuDecollage']),
          survol: nullIfEmpty(row['survol']),
          commentaire: nullIfEmpty(row['commentaire']),

          dateVolDeb: parseDate(row['dateVolDeb']),
          dateVolFin: parseDate(row['dateVolFin']),
          dateValidite: parseDate(row['dateValidite']),
          dateRappel: parseDate(row['dateRappel']),
          dateCadeau: parseDate(row['dateCadeau']),

          estBonCadeau,
        },
      })

      billetMap.set(v1Id, created.id)
      report.billets.created++

      // Create billet tags
      const tagsToAttach: string[] = []
      if (particulariteNom) {
        const tagId = tagIdByName.get(particulariteNom)
        if (tagId) tagsToAttach.push(tagId)
      }
      if (categorieNom && categorieNom !== particulariteNom) {
        const tagId = tagIdByName.get(categorieNom)
        if (tagId) tagsToAttach.push(tagId)
      }

      for (const tagId of tagsToAttach) {
        try {
          await prisma.billetTag.create({
            data: { billetId: created.id, tagId },
          })
        } catch {
          // Ignore duplicate tag links
        }
      }
    } catch (err) {
      report.billets.errors++
      report.warnings.push(`Billet v1#${v1Id} ref="${reference}" error: ${err}`)
    }
  }

  console.log(`  ${report.billets.created} created, ${report.billets.errors} errors.`)
}

// ---------------------------------------------------------------------------
// Step 8: passagers
// ---------------------------------------------------------------------------
async function migratePassagers(
  tables: Map<string, SqlRow[]>,
  exploitantId: string,
): Promise<void> {
  console.log('\n[Step 8] Migrating passagers...')

  const rows = tables.get('passager') ?? []

  for (const row of rows) {
    const v1Id = row['id_passager']
    if (!v1Id) continue

    const billetV1Id = row['id_billetVol']
    if (!billetV1Id) {
      report.passagers.errors++
      report.warnings.push(`Passager v1#${v1Id}: no billetVol id`)
      continue
    }

    const billetId = billetMap.get(billetV1Id)
    if (!billetId) {
      // Billet may have been skipped due to error
      report.passagers.errors++
      continue
    }

    const poidsRaw = str(row['poids'] ?? '0')
    const poids = parseInt(poidsRaw, 10)
    const poidsEncrypted = poids > 0 ? encrypt(String(poids)) : null
    if (!poidsEncrypted) report.passagers.noWeight++

    try {
      const created = await prisma.passager.create({
        data: {
          exploitantId,
          billetId,
          prenom: str(row['prenom']).trim() || 'Passager',
          nom: str(row['nom']).trim() || `v1#${v1Id}`,
          emailEncrypted: (() => {
            const v = nullIfEmpty(row['email'])
            return v ? encrypt(v) : null
          })(),
          telephoneEncrypted: (() => {
            const v = nullIfEmpty(row['telephone'])
            return v ? encrypt(v) : null
          })(),
          age: row['age'] ? parseInt(str(row['age']), 10) || null : null,
          poidsEncrypted,
          pmr: row['pmr'] === '1',
        },
      })
      passagerMap.set(v1Id, created.id)
      report.passagers.created++
    } catch (err) {
      report.passagers.errors++
      report.warnings.push(`Passager v1#${v1Id} error: ${err}`)
    }
  }

  console.log(
    `  ${report.passagers.created} created, ${report.passagers.errors} errors, ${report.passagers.noWeight} without weight.`,
  )
}

// ---------------------------------------------------------------------------
// Step 9: paiements
// ---------------------------------------------------------------------------

function mapModePaiement(
  v1ModeId: string | null,
  modePaiementNames: Map<string, string>,
): ModePaiement {
  const nom = modePaiementNames.get(str(v1ModeId)) ?? ''
  // Normalize accented characters
  const normalized = nom
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()

  if (normalized.includes('espece') || normalized.includes('espece')) return 'ESPECES'
  if (normalized.includes('cheque vacs') || normalized.includes('cheque vac'))
    return 'CHEQUE_VACANCES'
  if (normalized.includes('cheque') || normalized.includes('cheque')) return 'CHEQUE'
  if (normalized.includes('virement')) return 'VIREMENT'
  if (normalized.includes('bon') || normalized.includes('reduction')) return 'AVOIR'
  return 'ESPECES'
}

async function migratePaiements(
  tables: Map<string, SqlRow[]>,
  exploitantId: string,
): Promise<void> {
  console.log('\n[Step 9] Migrating paiements...')

  const rows = tables.get('paiement') ?? []

  for (const row of rows) {
    const v1Id = row['id_paiement']
    if (!v1Id) continue

    const billetV1Id = row['id_billetVol']
    const billetId = billetV1Id ? billetMap.get(billetV1Id) : undefined
    if (!billetId) {
      report.paiements.errors++
      continue
    }

    const modePaiement = mapModePaiement(row['id_modePaiement'] ?? null, modePaiementNames)
    const montant = parseFloat(str(row['montantTtc']) || '0')
    const datePaiement = parseDate(row['datePaiement'])
    const dateEncaissement = parseDate(row['dateEncaissement'])

    try {
      await prisma.paiement.create({
        data: {
          exploitantId,
          billetId,
          modePaiement,
          montantTtc: montant,
          datePaiement: datePaiement ?? new Date('2000-01-01'),
          dateEncaissement,
          commentaire: nullIfEmpty(row['commentaire']),
        },
      })
      report.paiements.created++
    } catch (err) {
      report.paiements.errors++
      report.warnings.push(`Paiement v1#${v1Id} error: ${err}`)
    }
  }

  console.log(`  ${report.paiements.created} created, ${report.paiements.errors} errors.`)
}

// ---------------------------------------------------------------------------
// Step 10: vols
// ---------------------------------------------------------------------------
async function migrateVols(tables: Map<string, SqlRow[]>, exploitantId: string): Promise<void> {
  console.log('\n[Step 10] Migrating vols...')

  const rows = tables.get('vol') ?? []

  for (const row of rows) {
    const v1Id = row['id_vol']
    if (!v1Id) continue

    const dateRaw = row['date']
    const date = parseDate(dateRaw)
    if (!date) {
      report.vols.errors++
      report.warnings.push(`Vol v1#${v1Id}: invalid date "${dateRaw}"`)
      continue
    }

    // Creneau: matin=1 → MATIN, soir=1 → SOIR, else MATIN
    const creneau: Creneau = row['matin'] === '1' ? 'MATIN' : row['soir'] === '1' ? 'SOIR' : 'MATIN'

    // Statut
    let statut: StatutVol = 'PLANIFIE'
    if (row['volFait'] === '1') statut = 'ARCHIVE'
    else if (row['volAnnule'] === '1') statut = 'ANNULE'

    // Ballon
    const ballonV1Id = row['id_montgolfiere']
    const ballonId = ballonV1Id ? ballonMap.get(ballonV1Id) : undefined
    if (!ballonId) {
      report.vols.errors++
      report.warnings.push(`Vol v1#${v1Id}: ballon v1#${ballonV1Id} not mapped`)
      continue
    }

    // Pilote
    const piloteV1Id = row['id_pilote']
    let piloteId = piloteV1Id ? piloteMap.get(piloteV1Id) : undefined
    if (!piloteId) {
      // Create a placeholder pilote for unmapped
      try {
        const placeholder = await prisma.pilote.create({
          data: {
            exploitantId,
            prenom: 'Pilote',
            nom: `Inconnu v1#${piloteV1Id ?? 'N/A'}`,
            licenceBfcl: `IMPORT-UNKNOWN-${piloteV1Id ?? v1Id}`,
            dateExpirationLicence: new Date('2025-01-01'),
            actif: false,
          },
        })
        piloteId = placeholder.id
        if (piloteV1Id) piloteMap.set(piloteV1Id, placeholder.id)
      } catch {
        report.vols.errors++
        report.warnings.push(`Vol v1#${v1Id}: could not create placeholder pilote`)
        continue
      }
    }

    // Optional: equipier, vehicule
    const equipierV1Id = row['id_equipier']
    const equipierId = equipierV1Id ? equipierMap.get(equipierV1Id) : undefined

    const vehiculeV1Id = row['id_vehicule']
    const vehiculeId = vehiculeV1Id ? vehiculeMap.get(vehiculeV1Id) : undefined

    // Depart/arrivée (v1 col names: decoLieu, atterLieu)
    const decoLieu = nullIfEmpty(row['decoLieu'])
    const atterLieu = nullIfEmpty(row['atterLieu'])

    // Attempt creation; skip duplicates (unique constraint: exploitantId, date, creneau, ballonId)
    try {
      const created = await prisma.vol.create({
        data: {
          exploitantId,
          date,
          creneau,
          statut,
          ballonId,
          piloteId,
          equipierId,
          vehiculeId,
          decoLieu,
          atterLieu,
        },
      })
      volMap.set(v1Id, created.id)
      report.vols.created++
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      if (msg.includes('Unique constraint')) {
        report.vols.duplicates++
        report.warnings.push(`Vol v1#${v1Id} ${dateRaw} ${creneau} dup skipped`)
      } else {
        report.vols.errors++
        report.warnings.push(`Vol v1#${v1Id} error: ${msg}`)
      }
    }
  }

  console.log(
    `  ${report.vols.created} created, ${report.vols.duplicates} duplicates skipped, ${report.vols.errors} errors.`,
  )
}

// ---------------------------------------------------------------------------
// Step 11: passager_vol assignments
// ---------------------------------------------------------------------------
async function migratePassagerVols(tables: Map<string, SqlRow[]>): Promise<void> {
  console.log('\n[Step 11] Assigning passagers to vols...')

  const rows = tables.get('passager_vol') ?? []

  // Track current vol assignment per passager
  const passagerVolDate = new Map<string, { volId: string; date: string }>()

  for (const row of rows) {
    const passagerV1Id = row['id_passager']
    const volV1Id = row['id_vol']
    if (!passagerV1Id || !volV1Id) continue

    const passagerId = passagerMap.get(passagerV1Id)
    const volId = volMap.get(volV1Id)

    if (!passagerId || !volId) {
      report.passagerVols.errors++
      continue
    }

    try {
      const dateModif = str(row['date_modification'])

      const existing = passagerVolDate.get(passagerV1Id)
      if (existing) {
        // Take the most recent vol assignment
        if (dateModif > existing.date) {
          await prisma.passager.update({
            where: { id: passagerId },
            data: { volId },
          })
          passagerVolDate.set(passagerV1Id, { volId, date: dateModif })
          report.passagerVols.multiVol++
          report.warnings.push(
            `Passager v1#${passagerV1Id} has multiple vols — kept most recent (vol v1#${volV1Id})`,
          )
        }
        // else keep the existing assignment
      } else {
        await prisma.passager.update({
          where: { id: passagerId },
          data: { volId },
        })
        passagerVolDate.set(passagerV1Id, { volId, date: dateModif })
        report.passagerVols.assigned++
      }
    } catch (err) {
      report.passagerVols.errors++
      report.warnings.push(
        `PassagerVol passager v1#${passagerV1Id} vol v1#${volV1Id} error: ${err}`,
      )
    }
  }

  console.log(
    `  ${report.passagerVols.assigned} assigned, ${report.passagerVols.multiVol} multi-vol resolved, ${report.passagerVols.errors} errors.`,
  )
}

// ---------------------------------------------------------------------------
// Step 12: BilletSequence
// ---------------------------------------------------------------------------
async function updateBilletSequences(exploitantId: string): Promise<void> {
  console.log('\n[Step 12] Updating BilletSequence...')

  const billets = await prisma.billet.findMany({
    where: { exploitantId },
    select: { reference: true },
  })

  // Parse references like CBF-2023-0042 or BV0001 or ref96
  const yearSeqMap = new Map<number, number>()

  for (const { reference } of billets) {
    // Try format PREFIX-YYYY-NNNN
    const match = reference.match(/(\d{4})-(\d{4})$/)
    if (match) {
      const year = parseInt(match[1] ?? '', 10)
      const seq = parseInt(match[2] ?? '', 10)
      if (year > 2000 && year < 2100 && seq > 0) {
        const current = yearSeqMap.get(year) ?? 0
        if (seq > current) yearSeqMap.set(year, seq)
      }
    }
  }

  for (const [year, lastSeq] of Array.from(yearSeqMap)) {
    await prisma.billetSequence.upsert({
      where: { exploitantId_year: { exploitantId, year } },
      update: { lastSeq },
      create: { exploitantId, year, lastSeq },
    })
    console.log(`  Year ${year}: lastSeq = ${lastSeq}`)
  }

  if (yearSeqMap.size === 0) {
    console.log('  No structured references found (CBF-YYYY-NNNN format) — no sequences updated.')
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main(): Promise<void> {
  const sqlPath = path.resolve(__dirname, '../v1-reference/bdd/extract_bdd.sql')
  console.log(`Loading SQL dump from: ${sqlPath}`)
  console.log('Parsing... (this may take a few seconds for a 15MB file)')

  const tables = parseSqlDump(sqlPath)

  const tableNames = Array.from(tables.keys())
  console.log(`Parsed ${tableNames.length} tables: ${tableNames.join(', ')}`)

  // ---------------------------------------------------------------------------
  // Step 0: Find Cameron Balloons exploitant
  // ---------------------------------------------------------------------------
  console.log('\n[Step 0] Locating Cameron Balloons France exploitant (FR.DEC.059)...')
  const exploitant = await prisma.exploitant.findUniqueOrThrow({
    where: { frDecNumber: 'FR.DEC.059' },
  })
  const exploitantId = exploitant.id
  console.log(`  Found exploitant: ${exploitant.name} (id=${exploitantId})`)

  // ---------------------------------------------------------------------------
  // Step 1: Clean existing migration data
  // ---------------------------------------------------------------------------
  console.log('\n[Step 1] Cleaning existing migration data...')

  await prisma.vol.deleteMany({ where: { exploitantId } })
  await prisma.paiement.deleteMany({ where: { exploitantId } })
  await prisma.passager.deleteMany({ where: { exploitantId } })

  // Delete billet_tag join records for this exploitant's billets
  const existingBilletIds = await prisma.billet.findMany({
    where: { exploitantId },
    select: { id: true },
  })
  if (existingBilletIds.length > 0) {
    const ids = existingBilletIds.map((b) => `'${b.id}'`).join(',')
    await prisma.$executeRawUnsafe(`DELETE FROM billet_tag WHERE "billetId" IN (${ids})`)
  }

  await prisma.billet.deleteMany({ where: { exploitantId } })
  await prisma.billetSequence.deleteMany({ where: { exploitantId } })

  // Note: ballons, pilotes, equipiers, vehicules are upserted (not deleted)
  // so existing seed data is preserved.

  console.log('  Cleaned vols, paiements, passagers, billets, billetSequences.')

  // ---------------------------------------------------------------------------
  // Steps 2-12
  // ---------------------------------------------------------------------------
  buildLookupMaps(tables)
  console.log('  Lookup maps built.')

  await migrateTags(tables, exploitantId)
  await migrateBallons(tables, exploitantId)
  await migratePersonnes(tables, exploitantId)
  await migrateVehicules(tables, exploitantId)
  await migrateBillets(tables, exploitantId)
  await migratePassagers(tables, exploitantId)
  await migratePaiements(tables, exploitantId)
  await migrateVols(tables, exploitantId)
  await migratePassagerVols(tables)
  await updateBilletSequences(exploitantId)

  // ---------------------------------------------------------------------------
  // Step 13: Report
  // ---------------------------------------------------------------------------
  console.log('\n=== MIGRATION REPORT ===')
  console.log(
    `Ballons:     ${report.ballons.created} created, ${report.ballons.updated} updated, ${report.ballons.skipped} skipped`,
  )
  console.log(
    `Pilotes:     ${report.pilotes.created} created, ${report.pilotes.updated} found, ${report.pilotes.skipped} skipped`,
  )
  console.log(
    `Equipiers:   ${report.equipiers.created} created, ${report.equipiers.skipped} skipped`,
  )
  console.log(
    `Vehicules:   ${report.vehicules.created} created, ${report.vehicules.skipped} skipped`,
  )
  console.log(`Tags:        ${report.tags.created} upserted`)
  console.log(`Billets:     ${report.billets.created} created, ${report.billets.errors} errors`)
  console.log(
    `Passagers:   ${report.passagers.created} created, ${report.passagers.errors} errors, ${report.passagers.noWeight} without weight`,
  )
  console.log(`Paiements:   ${report.paiements.created} created, ${report.paiements.errors} errors`)
  console.log(
    `Vols:        ${report.vols.created} created, ${report.vols.duplicates} duplicates skipped, ${report.vols.errors} errors`,
  )
  console.log(
    `PassagerVols: ${report.passagerVols.assigned} assigned, ${report.passagerVols.multiVol} multi-vol resolved, ${report.passagerVols.errors} errors`,
  )

  if (report.warnings.length > 0) {
    console.log(`\nWarnings (${report.warnings.length}):`)
    report.warnings.forEach((w) => console.log(`  - ${w}`))
  }

  console.log('\nMigration complete.')
}

main()
  .catch((err) => {
    console.error('Fatal error:', err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
