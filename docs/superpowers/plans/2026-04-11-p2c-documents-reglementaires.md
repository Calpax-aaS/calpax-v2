# P2c — Documents Reglementaires Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Generate the fiche de vol PDF (regulatory flight document), post-flight data entry, PVE archival to Supabase Storage, balloon flight journal, and audit trail UI.

**Architecture:** @react-pdf/renderer for PDF generation (server-side only). Post-vol form persists data on the Vol model and transitions to TERMINE. PVE archival generates a final PDF, uploads to Supabase Storage, and transitions to ARCHIVE. Journal de bord is a filtered view of vols per balloon. Audit trail surfaces the existing audit_log table.

**Tech Stack:** @react-pdf/renderer, Supabase Storage (JS client), Prisma, Next.js server actions, shadcn/ui, next-intl.

**Spec:** `docs/superpowers/specs/2026-04-11-p2-flight-lifecycle-design.md` section 6.

---

## File Map

| File                                               | Responsibility                                                 |
| -------------------------------------------------- | -------------------------------------------------------------- |
| `lib/pdf/fiche-vol.tsx`                            | React-pdf document component for fiche de vol                  |
| `lib/pdf/generate.ts`                              | generateFicheVolPdf + generatePvePdf orchestration             |
| `app/api/vols/[id]/fiche-vol/route.ts`             | API route to download fiche de vol PDF                         |
| `app/api/vols/[id]/pve/route.ts`                   | API route to download archived PVE PDF                         |
| `lib/schemas/vol.ts`                               | Add volPostFlightSchema (extend existing file)                 |
| `lib/actions/vol.ts`                               | Add savePostFlight + archivePve actions (extend existing file) |
| `lib/storage/pve.ts`                               | Supabase Storage upload + signed URL for PVE                   |
| `app/[locale]/(app)/vols/[id]/post-vol/page.tsx`   | Post-flight data entry form                                    |
| `app/[locale]/(app)/vols/[id]/page.tsx`            | Add download + archive buttons (modify existing)               |
| `app/[locale]/(app)/vols/[id]/vol-actions.tsx`     | Add archive + download buttons (modify existing)               |
| `app/[locale]/(app)/ballons/[id]/journal/page.tsx` | Balloon flight journal                                         |
| `app/[locale]/(app)/audit/page.tsx`                | Audit trail page                                               |
| `app/[locale]/(app)/audit/audit-client.tsx`        | Client component for audit filters                             |
| `components/app-sidebar.tsx`                       | Add Audit nav item                                             |
| `messages/fr.json`                                 | French translations for PDF, post-vol, journal, audit          |
| `messages/en.json`                                 | English translations                                           |
| `tests/unit/pdf-fiche-vol.spec.ts`                 | PDF generation snapshot/structure tests                        |

---

### Task 1: Install @react-pdf/renderer

**Files:**

- Modify: `package.json`

- [ ] **Step 1: Install dependency**

```bash
pnpm add @react-pdf/renderer
```

- [ ] **Step 2: Verify install**

```bash
pnpm exec tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "chore: add @react-pdf/renderer for fiche de vol PDF generation"
```

---

### Task 2: Fiche de vol PDF component (TDD)

**Files:**

- Create: `lib/pdf/fiche-vol.tsx`
- Create: `lib/pdf/generate.ts`
- Create: `tests/unit/pdf-fiche-vol.spec.ts`

- [ ] **Step 1: Write failing tests**

Create `tests/unit/pdf-fiche-vol.spec.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { generateFicheVolBuffer } from '@/lib/pdf/generate'

const sampleData = {
  exploitant: {
    name: 'Cameron Balloons France',
    frDecNumber: 'FR.DEC.059',
    logoUrl: null,
  },
  vol: {
    date: new Date('2026-06-15'),
    creneau: 'MATIN' as const,
    lieuDecollage: 'Dole-Tavaux',
    equipier: 'Jean Dupont',
    vehicule: 'Renault Master',
    configGaz: '4xCB2990 : 4x23 kg',
    qteGaz: 92,
    // Post-vol fields (null = not yet filled)
    decoLieu: null as string | null,
    decoHeure: null as Date | null,
    atterLieu: null as string | null,
    atterHeure: null as Date | null,
    gasConso: null as number | null,
    anomalies: null as string | null,
  },
  ballon: {
    nom: 'F-HFCC (Z-105)',
    immatriculation: 'F-HFCC',
    volumeM3: 3000,
    peseeAVide: 376,
    performanceChart: { '10': 482, '20': 365, '30': 256, '34': 214 },
    configGaz: '4xCB2990 : 4x23 kg',
  },
  pilote: {
    prenom: 'Olivier',
    nom: 'Cuenot',
    licenceBfcl: 'BFCL-CBF-001',
    poids: 92,
  },
  passagers: [
    {
      prenom: 'Marie',
      nom: 'Martin',
      age: 35,
      poids: 65,
      pmr: false,
      billetReference: 'CBF-2026-0001',
    },
    {
      prenom: 'Pierre',
      nom: 'Durand',
      age: 42,
      poids: 80,
      pmr: false,
      billetReference: 'CBF-2026-0001',
    },
  ],
  temperatureCelsius: 20,
  isPve: false,
  archivedAt: null as Date | null,
}

describe('generateFicheVolBuffer', () => {
  it('generates a non-empty PDF buffer', async () => {
    const buffer = await generateFicheVolBuffer(sampleData)
    expect(buffer).toBeInstanceOf(Buffer)
    expect(buffer.length).toBeGreaterThan(100)
  })

  it('PDF starts with %PDF magic bytes', async () => {
    const buffer = await generateFicheVolBuffer(sampleData)
    const header = buffer.subarray(0, 5).toString('ascii')
    expect(header).toBe('%PDF-')
  })

  it('generates PVE variant with post-vol data', async () => {
    const pveData = {
      ...sampleData,
      vol: {
        ...sampleData.vol,
        decoLieu: 'Dole-Tavaux',
        decoHeure: new Date('2026-06-15T06:30:00'),
        atterLieu: 'Champs pres de Parcey',
        atterHeure: new Date('2026-06-15T07:45:00'),
        gasConso: 65,
        anomalies: null,
      },
      isPve: true,
      archivedAt: new Date('2026-06-15T10:00:00'),
    }
    const buffer = await generateFicheVolBuffer(pveData)
    expect(buffer.length).toBeGreaterThan(100)
  })

  it('handles missing optional fields', async () => {
    const minimalData = {
      ...sampleData,
      vol: { ...sampleData.vol, equipier: null, vehicule: null, lieuDecollage: null, qteGaz: null },
      passagers: [],
    }
    const buffer = await generateFicheVolBuffer(minimalData)
    expect(buffer.length).toBeGreaterThan(100)
  })
})
```

- [ ] **Step 2: Run tests — should fail**

```bash
npx vitest run tests/unit/pdf-fiche-vol.spec.ts --reporter=verbose
```

- [ ] **Step 3: Create fiche de vol React-PDF component**

Create `lib/pdf/fiche-vol.tsx`:

```tsx
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: 'Helvetica' },
  header: { marginBottom: 20 },
  title: { fontSize: 18, fontWeight: 'bold', textAlign: 'center', marginBottom: 4 },
  subtitle: { fontSize: 12, textAlign: 'center', marginBottom: 12 },
  section: { marginBottom: 12 },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    paddingBottom: 2,
  },
  row: { flexDirection: 'row', marginBottom: 2 },
  label: { width: 150, fontWeight: 'bold' },
  value: { flex: 1 },
  table: { marginTop: 4 },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#e5e7eb',
    paddingVertical: 4,
    paddingHorizontal: 6,
    fontWeight: 'bold',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 3,
    paddingHorizontal: 6,
    borderBottomWidth: 0.5,
    borderBottomColor: '#d1d5db',
  },
  tableRowHighlight: {
    flexDirection: 'row',
    paddingVertical: 3,
    paddingHorizontal: 6,
    backgroundColor: '#fef3c7',
    borderBottomWidth: 0.5,
    borderBottomColor: '#d1d5db',
  },
  col1: { width: 30 },
  col2: { flex: 1 },
  col3: { width: 40, textAlign: 'right' },
  col4: { width: 60, textAlign: 'right' },
  col5: { width: 40, textAlign: 'center' },
  devisCol1: { width: 80 },
  devisCol2: { width: 100, textAlign: 'right' },
  conforme: {
    color: '#16a34a',
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 8,
  },
  surcharge: {
    color: '#dc2626',
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 8,
  },
  visaSection: { marginTop: 20 },
  visaLine: {
    borderBottomWidth: 1,
    borderBottomColor: '#999',
    marginBottom: 16,
    marginTop: 4,
    width: 250,
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    fontSize: 8,
    color: '#6b7280',
    textAlign: 'center',
  },
  meteoPlaceholder: { textAlign: 'center', marginTop: 100, fontSize: 14, color: '#9ca3af' },
})

export type FicheVolData = {
  exploitant: { name: string; frDecNumber: string; logoUrl: string | null }
  vol: {
    date: Date
    creneau: string
    lieuDecollage: string | null
    equipier: string | null
    vehicule: string | null
    configGaz: string | null
    qteGaz: number | null
    decoLieu: string | null
    decoHeure: Date | null
    atterLieu: string | null
    atterHeure: Date | null
    gasConso: number | null
    anomalies: string | null
  }
  ballon: {
    nom: string
    immatriculation: string
    volumeM3: number
    peseeAVide: number
    performanceChart: Record<string, number>
    configGaz: string
  }
  pilote: { prenom: string; nom: string; licenceBfcl: string; poids: number }
  passagers: {
    prenom: string
    nom: string
    age: number | null
    poids: number | null
    pmr: boolean
    billetReference: string
  }[]
  temperatureCelsius: number
  isPve: boolean
  archivedAt: Date | null
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

export function FicheVolDocument({ data }: { data: FicheVolData }) {
  const { exploitant, vol, ballon, pilote, passagers, temperatureCelsius, isPve, archivedAt } = data

  const poidsPassagers = passagers.reduce((sum, p) => sum + (p.poids ?? 0), 0)
  const poidsTotal = ballon.peseeAVide + (vol.qteGaz ?? 0) + pilote.poids + poidsPassagers

  const temps = Object.keys(ballon.performanceChart)
    .map(Number)
    .sort((a, b) => a - b)
  const ceilTemp =
    temps.find((t) => t >= temperatureCelsius) ?? temps[temps.length - 1] ?? temperatureCelsius
  const chargeUtileMax = ballon.performanceChart[String(ceilTemp)] ?? 0
  const marge = chargeUtileMax - poidsTotal

  const docTitle = isPve ? "PROCES-VERBAL D'ENVOL" : 'FICHE DE VOL'
  const creneauLabel = vol.creneau === 'MATIN' ? 'Matin' : 'Soir'

  return (
    <Document>
      {/* Page 1: Header + Equipage + Passagers + Devis */}
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>{docTitle}</Text>
          <Text style={styles.subtitle}>
            {exploitant.name} — {exploitant.frDecNumber}
          </Text>
          <Text style={styles.subtitle}>
            {formatDate(vol.date)} — {creneauLabel}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ballon</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Nom</Text>
            <Text style={styles.value}>{ballon.nom}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Immatriculation</Text>
            <Text style={styles.value}>{ballon.immatriculation}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Volume</Text>
            <Text style={styles.value}>{ballon.volumeM3} m3</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Equipage</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Pilote</Text>
            <Text style={styles.value}>
              {pilote.prenom} {pilote.nom} — {pilote.licenceBfcl}
            </Text>
          </View>
          {vol.equipier && (
            <View style={styles.row}>
              <Text style={styles.label}>Equipier</Text>
              <Text style={styles.value}>{vol.equipier}</Text>
            </View>
          )}
          {vol.vehicule && (
            <View style={styles.row}>
              <Text style={styles.label}>Vehicule</Text>
              <Text style={styles.value}>{vol.vehicule}</Text>
            </View>
          )}
          {vol.lieuDecollage && (
            <View style={styles.row}>
              <Text style={styles.label}>Lieu decollage</Text>
              <Text style={styles.value}>{vol.lieuDecollage}</Text>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Passagers ({passagers.length})</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={styles.col1}>N</Text>
              <Text style={styles.col2}>Nom</Text>
              <Text style={styles.col3}>Age</Text>
              <Text style={styles.col4}>Poids</Text>
              <Text style={styles.col5}>PMR</Text>
            </View>
            {passagers.map((p, i) => (
              <View key={i} style={styles.tableRow}>
                <Text style={styles.col1}>{i + 1}</Text>
                <Text style={styles.col2}>
                  {p.prenom} {p.nom}
                </Text>
                <Text style={styles.col3}>{p.age ?? '—'}</Text>
                <Text style={styles.col4}>{p.poids != null ? `${p.poids} kg` : '—'}</Text>
                <Text style={styles.col5}>{p.pmr ? 'Oui' : ''}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Devis de masse (OAT {ceilTemp}C)</Text>
          <View style={styles.table}>
            <View style={styles.tableRow}>
              <Text style={styles.devisCol1}>Pesee a vide</Text>
              <Text style={styles.devisCol2}>{ballon.peseeAVide} kg</Text>
            </View>
            <View style={styles.tableRow}>
              <Text style={styles.devisCol1}>Gaz embarque</Text>
              <Text style={styles.devisCol2}>{vol.qteGaz ?? 0} kg</Text>
            </View>
            <View style={styles.tableRow}>
              <Text style={styles.devisCol1}>Pilote</Text>
              <Text style={styles.devisCol2}>{pilote.poids} kg</Text>
            </View>
            <View style={styles.tableRow}>
              <Text style={styles.devisCol1}>Passagers</Text>
              <Text style={styles.devisCol2}>{poidsPassagers} kg</Text>
            </View>
            <View
              style={{
                ...styles.tableRow,
                borderTopWidth: 1,
                borderTopColor: '#333',
                fontWeight: 'bold',
              }}
            >
              <Text style={styles.devisCol1}>Poids total</Text>
              <Text style={styles.devisCol2}>{poidsTotal} kg</Text>
            </View>
            <View style={styles.tableRow}>
              <Text style={styles.devisCol1}>Charge utile max</Text>
              <Text style={styles.devisCol2}>{chargeUtileMax} kg</Text>
            </View>
            <View style={styles.tableRow}>
              <Text style={styles.devisCol1}>Marge</Text>
              <Text style={styles.devisCol2}>{marge} kg</Text>
            </View>
          </View>
          <Text style={marge >= 0 ? styles.conforme : styles.surcharge}>
            {marge >= 0 ? 'CONFORME' : 'SURCHARGE'}
          </Text>
        </View>

        <Text style={styles.footer}>Genere par Calpax — {formatDate(new Date())}</Text>
      </Page>

      {/* Page 2: VISA CDB */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.sectionTitle}>VISA Commandant de Bord</Text>

        <View style={styles.visaSection}>
          <Text style={{ fontWeight: 'bold', marginBottom: 4 }}>Decollage</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Lieu :</Text>
            <Text style={styles.value}>{isPve && vol.decoLieu ? vol.decoLieu : ''}</Text>
          </View>
          {!isPve && <View style={styles.visaLine} />}
          <View style={styles.row}>
            <Text style={styles.label}>Heure :</Text>
            <Text style={styles.value}>
              {isPve && vol.decoHeure ? formatTime(vol.decoHeure) : ''}
            </Text>
          </View>
          {!isPve && <View style={styles.visaLine} />}
        </View>

        <View style={styles.visaSection}>
          <Text style={{ fontWeight: 'bold', marginBottom: 4 }}>Atterrissage</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Lieu :</Text>
            <Text style={styles.value}>{isPve && vol.atterLieu ? vol.atterLieu : ''}</Text>
          </View>
          {!isPve && <View style={styles.visaLine} />}
          <View style={styles.row}>
            <Text style={styles.label}>Heure :</Text>
            <Text style={styles.value}>
              {isPve && vol.atterHeure ? formatTime(vol.atterHeure) : ''}
            </Text>
          </View>
          {!isPve && <View style={styles.visaLine} />}
        </View>

        <View style={styles.visaSection}>
          <View style={styles.row}>
            <Text style={styles.label}>Consommation gaz :</Text>
            <Text style={styles.value}>
              {isPve && vol.gasConso != null ? `${vol.gasConso} kg` : ''}
            </Text>
          </View>
          {!isPve && <View style={styles.visaLine} />}
        </View>

        <View style={styles.visaSection}>
          <Text style={{ fontWeight: 'bold', marginBottom: 4 }}>Anomalies / Observations</Text>
          <Text>{isPve && vol.anomalies ? vol.anomalies : ''}</Text>
          {!isPve && <View style={{ ...styles.visaLine, width: '100%', marginTop: 40 }} />}
        </View>

        <View style={styles.visaSection}>
          <View style={styles.row}>
            <Text style={styles.label}>Signature CDB :</Text>
            <Text style={styles.value}>{''}</Text>
          </View>
          {!isPve && <View style={styles.visaLine} />}
          <View style={styles.row}>
            <Text style={styles.label}>Date :</Text>
            <Text style={styles.value}>{isPve && archivedAt ? formatDate(archivedAt) : ''}</Text>
          </View>
          {!isPve && <View style={styles.visaLine} />}
        </View>

        <Text style={styles.footer}>
          {isPve
            ? `PROCES-VERBAL D'ENVOL — Archive le ${archivedAt ? formatDate(archivedAt) : ''}`
            : 'FICHE DE VOL — A remplir par le CDB'}
        </Text>
      </Page>

      {/* Page 3: Meteo placeholder */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.sectionTitle}>Meteo</Text>
        <Text style={styles.meteoPlaceholder}>
          Page meteo — sera generee par le module meteo (Pw)
        </Text>
        <Text style={styles.footer}>Genere par Calpax — {formatDate(new Date())}</Text>
      </Page>
    </Document>
  )
}
```

- [ ] **Step 4: Create PDF generation orchestration**

Create `lib/pdf/generate.ts`:

```ts
import { renderToBuffer } from '@react-pdf/renderer'
import { FicheVolDocument, type FicheVolData } from './fiche-vol'

export type { FicheVolData }

export async function generateFicheVolBuffer(data: FicheVolData): Promise<Buffer> {
  const buffer = await renderToBuffer(<FicheVolDocument data={data} />)
  return Buffer.from(buffer)
}
```

- [ ] **Step 5: Run tests — should pass**

```bash
npx vitest run tests/unit/pdf-fiche-vol.spec.ts --reporter=verbose
```

- [ ] **Step 6: Commit**

```bash
git add lib/pdf/ tests/unit/pdf-fiche-vol.spec.ts
git commit -m "feat(pdf): fiche de vol + PVE generation with @react-pdf/renderer + tdd"
```

---

### Task 3: PDF download API routes

**Files:**

- Create: `app/api/vols/[id]/fiche-vol/route.ts`
- Create: `app/api/vols/[id]/pve/route.ts`

- [ ] **Step 1: Create fiche de vol download route**

Create `app/api/vols/[id]/fiche-vol/route.ts`:

```ts
import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/requireAuth'
import { db } from '@/lib/db'
import { decrypt } from '@/lib/crypto'
import { generateFicheVolBuffer } from '@/lib/pdf/generate'

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  return requireAuth(async () => {
    const { id } = await params

    const vol = await db.vol.findUniqueOrThrow({
      where: { id },
      include: {
        exploitant: { select: { name: true, frDecNumber: true, logoUrl: true } },
        ballon: true,
        pilote: true,
        passagers: { include: { billet: { select: { reference: true } } } },
      },
    })

    const pilotePoids = vol.pilote.poidsEncrypted
      ? parseInt(decrypt(vol.pilote.poidsEncrypted))
      : 80

    const passagers = vol.passagers.map((p) => ({
      prenom: p.prenom,
      nom: p.nom,
      age: p.age,
      poids: p.poidsEncrypted ? parseInt(decrypt(p.poidsEncrypted)) : null,
      pmr: p.pmr,
      billetReference: p.billet.reference,
    }))

    const buffer = await generateFicheVolBuffer({
      exploitant: vol.exploitant,
      vol: {
        date: vol.date,
        creneau: vol.creneau,
        lieuDecollage: vol.lieuDecollage,
        equipier: vol.equipier,
        vehicule: vol.vehicule,
        configGaz: vol.configGaz,
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
      temperatureCelsius: 20,
      isPve: false,
      archivedAt: null,
    })

    const filename = `fiche-vol-${vol.ballon.immatriculation}-${vol.date.toISOString().slice(0, 10)}.pdf`

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  })
}
```

- [ ] **Step 2: Create PVE download route**

Create `app/api/vols/[id]/pve/route.ts` — similar to fiche-vol but redirects to the stored PVE URL:

```ts
import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/requireAuth'
import { db } from '@/lib/db'
import { getSignedPveUrl } from '@/lib/storage/pve'

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  return requireAuth(async () => {
    const { id } = await params
    const vol = await db.vol.findUniqueOrThrow({ where: { id } })

    if (!vol.pvePdfUrl) {
      return NextResponse.json({ error: 'PVE not archived yet' }, { status: 404 })
    }

    const signedUrl = await getSignedPveUrl(vol.pvePdfUrl)
    return NextResponse.redirect(signedUrl)
  })
}
```

- [ ] **Step 3: Commit**

```bash
git add app/api/vols/
git commit -m "feat(api): fiche de vol + PVE download routes"
```

---

### Task 4: Supabase Storage for PVE

**Files:**

- Create: `lib/storage/pve.ts`

- [ ] **Step 1: Create storage helpers**

Create `lib/storage/pve.ts`:

```ts
import { createClient } from '@supabase/supabase-js'

function getStorageClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) throw new Error('Supabase config missing')
  return createClient(url, serviceKey)
}

const BUCKET = 'pve'

export async function uploadPve(
  exploitantId: string,
  volId: string,
  pdfBuffer: Buffer,
): Promise<string> {
  const supabase = getStorageClient()
  const path = `${exploitantId}/${volId}.pdf`

  const { error } = await supabase.storage.from(BUCKET).upload(path, pdfBuffer, {
    contentType: 'application/pdf',
    upsert: true,
  })

  if (error) throw new Error(`PVE upload failed: ${error.message}`)
  return path
}

export async function getSignedPveUrl(path: string): Promise<string> {
  const supabase = getStorageClient()

  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 3600) // 1 hour expiry

  if (error || !data?.signedUrl) {
    throw new Error(`Failed to create signed URL: ${error?.message ?? 'unknown'}`)
  }

  return data.signedUrl
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/storage/pve.ts
git commit -m "feat(storage): supabase storage helpers for PVE upload + signed URL"
```

---

### Task 5: Post-vol form + archive actions

**Files:**

- Modify: `lib/schemas/vol.ts`
- Modify: `lib/actions/vol.ts`
- Create: `app/[locale]/(app)/vols/[id]/post-vol/page.tsx`

- [ ] **Step 1: Add post-flight zod schema**

Add to `lib/schemas/vol.ts`:

```ts
export const volPostFlightSchema = z.object({
  decoLieu: z.string().min(1, 'Lieu de decollage requis'),
  decoHeure: z.coerce.date(),
  atterLieu: z.string().min(1, "Lieu d'atterrissage requis"),
  atterHeure: z.coerce.date(),
  gasConso: z.coerce.number().int().nonnegative().optional(),
  distance: z.coerce.number().int().nonnegative().optional(),
  anomalies: z.string().optional().or(z.literal('')),
  noteDansCarnet: z.coerce.boolean().default(true),
})

export type VolPostFlightFormData = z.infer<typeof volPostFlightSchema>
```

- [ ] **Step 2: Add server actions**

Add to `lib/actions/vol.ts`:

```ts
import { volPostFlightSchema } from '@/lib/schemas/vol'
import { generateFicheVolBuffer } from '@/lib/pdf/generate'
import { uploadPve } from '@/lib/storage/pve'

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
        exploitant: { select: { name: true, frDecNumber: true, logoUrl: true } },
        ballon: true,
        pilote: true,
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
      age: p.age,
      poids: p.poidsEncrypted ? parseInt(decrypt(p.poidsEncrypted)) : null,
      pmr: p.pmr,
      billetReference: p.billet.reference,
    }))

    const now = new Date()

    const buffer = await generateFicheVolBuffer({
      exploitant: vol.exploitant,
      vol: {
        date: vol.date,
        creneau: vol.creneau,
        lieuDecollage: vol.lieuDecollage,
        equipier: vol.equipier,
        vehicule: vol.vehicule,
        configGaz: vol.configGaz,
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
      temperatureCelsius: 20,
      isPve: true,
      archivedAt: now,
    })

    const pvePath = await uploadPve(ctx.exploitantId, volId, buffer)

    await db.vol.update({
      where: { id: volId },
      data: { statut: 'ARCHIVE', pvePdfUrl: pvePath, pveArchivedAt: now },
    })

    // Mark billets as VOLE
    const billetIds = [...new Set(vol.passagers.map((p) => p.billet.id))]
    for (const billetId of billetIds) {
      await db.billet.update({ where: { id: billetId }, data: { statut: 'VOLE' } })
    }

    redirect(`/${locale}/vols/${volId}`)
  })
}
```

Note: add the missing imports (`decrypt` from `@/lib/crypto`, `volPostFlightSchema` from schema file) at the top of the file.

- [ ] **Step 3: Create post-vol form page**

Create `app/[locale]/(app)/vols/[id]/post-vol/page.tsx`:

Server component with form for post-flight data entry. Fields: decoLieu (text), decoHeure (datetime-local), atterLieu (text), atterHeure (datetime-local), gasConso (number), distance (number), anomalies (textarea), noteDansCarnet (checkbox). Action calls `savePostFlight`. Pre-fill from existing vol data if already partially filled.

- [ ] **Step 4: Commit**

```bash
git add lib/schemas/vol.ts lib/actions/vol.ts "app/[locale]/(app)/vols/[id]/post-vol/"
git commit -m "feat(vol): post-flight form + PVE archive with Supabase Storage"
```

---

### Task 6: Update vol detail page with download + archive buttons

**Files:**

- Modify: `app/[locale]/(app)/vols/[id]/vol-actions.tsx`

- [ ] **Step 1: Add buttons to vol-actions**

Extend the existing `VolActions` client component to add:

- "Telecharger fiche de vol" link (when statut >= CONFIRME, not ANNULE) — link to `/api/vols/${volId}/fiche-vol`
- "Saisie post-vol" link (when statut = CONFIRME) — link to `/${locale}/vols/${volId}/post-vol`
- "Archiver PVE" button (when statut = TERMINE) — calls `archivePve(volId, locale)`
- "Telecharger PVE" link (when statut = ARCHIVE) — link to `/api/vols/${volId}/pve`

- [ ] **Step 2: Commit**

```bash
git add "app/[locale]/(app)/vols/[id]/vol-actions.tsx"
git commit -m "feat(ui): vol detail actions — download fiche, post-vol, archive PVE"
```

---

### Task 7: i18n for P2c features

**Files:**

- Modify: `messages/fr.json`
- Modify: `messages/en.json`

- [ ] **Step 1: Add translations**

Add to the existing `"vols"` key in fr.json:

```json
"postVol": {
  "title": "Compte-rendu post-vol",
  "decoLieu": "Lieu de decollage",
  "decoHeure": "Heure de decollage",
  "atterLieu": "Lieu d'atterrissage",
  "atterHeure": "Heure d'atterrissage",
  "gasConso": "Consommation gaz (kg)",
  "distance": "Distance parcourue (km)",
  "anomalies": "Anomalies / Observations",
  "noteDansCarnet": "Note dans le carnet de bord",
  "save": "Enregistrer et terminer le vol"
},
"downloadFiche": "Telecharger fiche de vol",
"downloadPve": "Telecharger PVE",
"archivePve": "Archiver comme PVE",
"confirmArchive": "Generer le PVE final et archiver ce vol ?",
"postVolLink": "Saisie post-vol"
```

Add new top-level keys:

```json
"journal": {
  "title": "Journal de bord",
  "noVols": "Aucun vol enregistre",
  "stats": {
    "totalVols": "Vols total",
    "totalGaz": "Gaz consomme (kg)",
    "volsArchives": "PVE archives"
  },
  "viewJournal": "Voir le journal de bord"
},
"audit": {
  "title": "Journal des modifications",
  "noEntries": "Aucune modification enregistree",
  "filters": {
    "entityType": "Type d'entite",
    "entityId": "ID entite",
    "action": "Action",
    "dateFrom": "Date debut",
    "dateTo": "Date fin",
    "all": "Tous"
  },
  "fields": {
    "date": "Date",
    "user": "Utilisateur",
    "entity": "Entite",
    "action": "Action",
    "field": "Champ",
    "before": "Avant",
    "after": "Apres"
  }
}
```

Add to `nav`:

```json
"audit": "Audit"
```

Add equivalent English translations.

- [ ] **Step 2: Commit**

```bash
git add messages/fr.json messages/en.json
git commit -m "feat(i18n): translations for post-vol, journal, audit"
```

---

### Task 8: Journal de bord ballon

**Files:**

- Create: `app/[locale]/(app)/ballons/[id]/journal/page.tsx`
- Modify: `app/[locale]/(app)/ballons/[id]/page.tsx` (add link)

- [ ] **Step 1: Create journal page**

Server component at `app/[locale]/(app)/ballons/[id]/journal/page.tsx`:

- Fetch ballon by id
- Fetch vols for this ballon: `db.vol.findMany({ where: { ballonId: id, statut: { not: 'ANNULE' } }, include: { pilote: { select: { prenom: true, nom: true } } }, orderBy: { date: 'desc' } })`
- Display stats at top: total vols, total gasConso, count of ARCHIVE vols
- Table: date, creneau, pilote, statut badge, decoLieu, atterLieu, distance, gasConso, anomalies, PVE link (if pvePdfUrl)

- [ ] **Step 2: Add link from ballon detail page**

Add "Voir le journal de bord" link to `app/[locale]/(app)/ballons/[id]/page.tsx`.

- [ ] **Step 3: Commit**

```bash
git add "app/[locale]/(app)/ballons/[id]/journal/" "app/[locale]/(app)/ballons/[id]/page.tsx"
git commit -m "feat(ui): journal de bord ballon — flight history per balloon"
```

---

### Task 9: Audit trail UI

**Files:**

- Create: `app/[locale]/(app)/audit/page.tsx`
- Create: `app/[locale]/(app)/audit/audit-client.tsx`
- Modify: `components/app-sidebar.tsx`

- [ ] **Step 1: Create audit page**

Server component wrapper + client component with filters.

`app/[locale]/(app)/audit/page.tsx` — server component that renders title + `<AuditClient>`.

`app/[locale]/(app)/audit/audit-client.tsx` — client component:

- Calls a server action to fetch audit logs with filters
- Filters: entityType (select: Ballon, Pilote, Billet, Passager, Paiement, Vol), date range, action (CREATE/UPDATE/DELETE)
- Table: date, entityType, entityId, action, field, before (JSON), after (JSON)
- Pagination: 50 per page, prev/next buttons

Create `lib/actions/audit.ts`:

```ts
'use server'
import { requireAuth } from '@/lib/auth/requireAuth'
import { db } from '@/lib/db'

export async function fetchAuditLogs(filters: {
  entityType?: string
  action?: string
  page?: number
}) {
  return requireAuth(async () => {
    const page = filters.page ?? 1
    const take = 50
    const skip = (page - 1) * take

    const where: Record<string, unknown> = {}
    if (filters.entityType) where.entityType = filters.entityType
    if (filters.action) where.action = filters.action

    const [logs, total] = await Promise.all([
      db.auditLog.findMany({ where, orderBy: { createdAt: 'desc' }, take, skip }),
      db.auditLog.count({ where }),
    ])

    return { logs, total, page, pageCount: Math.ceil(total / take) }
  })
}
```

- [ ] **Step 2: Add Audit to sidebar**

Import `History` from lucide-react, add nav item after `rgpd`:

```ts
{ key: 'audit' as const, href: `/${locale}/audit`, icon: History },
```

- [ ] **Step 3: Commit**

```bash
git add "app/[locale]/(app)/audit/" lib/actions/audit.ts components/app-sidebar.tsx
git commit -m "feat(ui): audit trail page with filters + pagination"
```

---

### Task 10: Verify and fix

- [ ] **Step 1: Run full test suite**

```bash
npx vitest run --reporter=verbose
npx vitest run tests/integration/ --config vitest.integration.config.ts --reporter=verbose
```

- [ ] **Step 2: TypeScript check**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Fix any issues**

- [ ] **Step 4: Commit and push**

```bash
git push origin main
```

---

## P2c Checkpoint (P2 Complete)

Before moving to Pw (weather), verify:

- [ ] Fiche de vol PDF generates correctly (3 pages: content, VISA CDB, meteo placeholder)
- [ ] PDF download works from vol detail page (statut >= CONFIRME)
- [ ] Post-vol form saves data and transitions to TERMINE
- [ ] PVE archive: generates final PDF, uploads to Supabase Storage, transitions to ARCHIVE, billets → VOLE
- [ ] PVE download returns signed URL from Supabase Storage
- [ ] Journal de bord shows vol history per balloon with stats
- [ ] Audit trail page shows entity modifications with filters
- [ ] All tests pass (unit + integration), 0 TS errors
- [ ] Deployed and verified on calpax.fr
