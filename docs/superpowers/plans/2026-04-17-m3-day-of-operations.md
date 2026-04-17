# M3 — Day-of Operations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable Cameron Balloons France to operate real flights with a mobile-first dashboard, pilot post-vol wizard, and weather-driven cancellation workflow.

**Architecture:** Extend existing Next.js pages with responsive mobile-first CSS and role-based filtering. New shared FlightCard component used by dashboard and vols list. Post-vol form rewritten as 3-step wizard. Weather alert cron flags vols exceeding wind threshold. Cancellation sends email to payeur + pilote + équipier.

**Tech Stack:** Next.js 15, React 19, Prisma 7, Tailwind CSS 4, shadcn/ui, Resend, Vitest

---

## File Structure

### New files

- `prisma/migrations/20260417000000_vol_meteo_alert/migration.sql` — schema migration
- `lib/vol/role-filter.ts` — role-based vol filtering helper
- `components/flight-card.tsx` — shared flight card component (dashboard + vols list mobile)
- `components/post-vol-wizard.tsx` — 3-step wizard client component
- `components/meteo-alert-banner.tsx` — weather alert banner with cancel button
- `lib/email/cancellation.ts` — cancellation email templates
- `app/api/cron/meteo-alert/route.ts` — weather alert cron endpoint
- `tests/unit/role-filter.spec.ts` — unit tests for role filtering
- `tests/integration/meteo-alert.spec.ts` — integration tests for weather alert + cancellation

### Modified files

- `prisma/schema.prisma` — add `meteoAlert`, `cancelReason` to Vol
- `messages/fr.json` — new i18n keys for dashboard, wizard, cancellation, weather alert
- `messages/en.json` — same keys in English
- `app/[locale]/(app)/page.tsx` — full rewrite as dashboard jour J
- `app/[locale]/(app)/vols/page.tsx` — add mobile list mode
- `app/[locale]/(app)/vols/[id]/page.tsx` — responsive layout + sticky CTA + meteo alert banner
- `app/[locale]/(app)/vols/[id]/post-vol/page.tsx` — use wizard component
- `lib/actions/vol.ts` — update `cancelVol` to accept reason + send notifications
- `vercel.json` — add meteo-alert cron

---

### Task 1: Schema — add meteoAlert and cancelReason to Vol

**Files:**

- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/20260417000000_vol_meteo_alert/migration.sql`

- [ ] **Step 1: Add fields to Vol model**

In `prisma/schema.prisma`, inside the `Vol` model, after the `noteDansCarnet` line and before `pvePdfUrl`:

```prisma
  meteoAlert     Boolean    @default(false)
  cancelReason   String?
```

- [ ] **Step 2: Create migration file**

Create `prisma/migrations/20260417000000_vol_meteo_alert/migration.sql`:

```sql
-- M3: Weather alert flag and cancellation reason
ALTER TABLE "vol" ADD COLUMN "meteoAlert" BOOLEAN DEFAULT false NOT NULL;
ALTER TABLE "vol" ADD COLUMN "cancelReason" TEXT;
```

- [ ] **Step 3: Apply migration locally**

Run: `npx prisma migrate dev --name vol_meteo_alert`
Expected: Migration applied, schema in sync

- [ ] **Step 4: Regenerate Prisma client**

Run: `npx prisma generate`
Expected: Client generated with new fields

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat(m3): add meteoAlert and cancelReason fields to Vol"
```

---

### Task 2: Role-based vol filtering helper

**Files:**

- Create: `lib/vol/role-filter.ts`
- Create: `tests/unit/role-filter.spec.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/unit/role-filter.spec.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { buildVolWhereForRole } from '@/lib/vol/role-filter'

describe('buildVolWhereForRole', () => {
  const baseWhere = { date: new Date('2026-04-17') }

  it('adds piloteId filter for PILOTE role', () => {
    const result = buildVolWhereForRole(baseWhere, 'PILOTE', 'user-123')
    expect(result).toEqual({
      date: new Date('2026-04-17'),
      pilote: { userId: 'user-123' },
    })
  })

  it('does not add filter for GERANT role', () => {
    const result = buildVolWhereForRole(baseWhere, 'GERANT', 'user-456')
    expect(result).toEqual({ date: new Date('2026-04-17') })
  })

  it('does not add filter for ADMIN_CALPAX role', () => {
    const result = buildVolWhereForRole(baseWhere, 'ADMIN_CALPAX', 'user-789')
    expect(result).toEqual({ date: new Date('2026-04-17') })
  })

  it('does not add filter for EQUIPIER role (no User→Equipier link)', () => {
    const result = buildVolWhereForRole(baseWhere, 'EQUIPIER', 'user-eq')
    expect(result).toEqual({ date: new Date('2026-04-17') })
  })

  it('preserves existing where conditions', () => {
    const where = { date: new Date('2026-04-17'), statut: { not: 'ANNULE' as const } }
    const result = buildVolWhereForRole(where, 'PILOTE', 'user-123')
    expect(result).toEqual({
      date: new Date('2026-04-17'),
      statut: { not: 'ANNULE' },
      pilote: { userId: 'user-123' },
    })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/role-filter.spec.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Write implementation**

Create `lib/vol/role-filter.ts`:

```typescript
import type { UserRole } from '@/lib/context'

/**
 * Adds role-based filtering to a Prisma `where` clause for Vol queries.
 * - PILOTE: only vols where pilote.userId matches
 * - EQUIPIER/GERANT/ADMIN_CALPAX: no additional filter (tenant-scoped)
 */
export function buildVolWhereForRole<T extends Record<string, unknown>>(
  where: T,
  role: UserRole,
  userId: string,
): T & Record<string, unknown> {
  if (role === 'PILOTE') {
    return { ...where, pilote: { userId } }
  }
  return { ...where }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/role-filter.spec.ts`
Expected: 5 tests PASS

- [ ] **Step 5: Commit**

```bash
git add lib/vol/role-filter.ts tests/unit/role-filter.spec.ts
git commit -m "feat(m3): add role-based vol filtering helper"
```

---

### Task 3: i18n keys for M3 features

**Files:**

- Modify: `messages/fr.json`
- Modify: `messages/en.json`

- [ ] **Step 1: Add French keys**

Add the following keys to `messages/fr.json`:

In the root level, add a new `"dashboard"` section:

```json
"dashboard": {
  "title": "Vols du jour",
  "noFlights": "Aucun vol aujourd'hui",
  "goToPlanning": "Voir le planning",
  "passengers": "passagers",
  "capacity": "capacité",
  "massOk": "Masse OK",
  "massWarning": "Masse limite",
  "massOver": "Dépassement",
  "goNogo": {
    "GO": "GO",
    "NOGO": "NO-GO",
    "MARGINAL": "Limite"
  },
  "meteoAlert": "Vent prévu au-dessus du seuil",
  "meteoAlertAction": "Annuler ce vol ?",
  "cancelMeteo": "Annuler (météo)",
  "cancelMeteoConfirm": "Annuler ce vol pour raison météo ? Les passagers seront désaffectés et les contacts notifiés par email."
}
```

In the `"vols"` section, add:

```json
"mobileList": "Liste",
"mobileGrid": "Grille"
```

In the `"vols"."postVol"` section, replace:

```json
"postVol": {
  "title": "Compte-rendu post-vol",
  "step1": "Décollage",
  "step2": "Atterrissage",
  "step3": "Compte-rendu",
  "decoLieu": "Lieu de décollage",
  "decoHeure": "Heure de décollage",
  "atterLieu": "Lieu d'atterrissage",
  "atterHeure": "Heure d'atterrissage",
  "gasConso": "Consommation gaz (kg)",
  "distance": "Distance parcourue (km)",
  "anomalies": "Anomalies / Observations",
  "noteDansCarnet": "Note dans le carnet de bord",
  "next": "Suivant",
  "back": "Retour",
  "submit": "Valider le vol",
  "summary": "Récapitulatif",
  "save": "Enregistrer et terminer le vol"
}
```

Add a new `"cancellation"` section at root:

```json
"cancellation": {
  "emailSubjectPayeur": "Vol annulé — {date}",
  "emailSubjectEquipe": "Vol annulé — {ballon} — {date}"
}
```

- [ ] **Step 2: Add English keys**

Add matching keys to `messages/en.json`:

```json
"dashboard": {
  "title": "Today's flights",
  "noFlights": "No flights today",
  "goToPlanning": "View planning",
  "passengers": "passengers",
  "capacity": "capacity",
  "massOk": "Mass OK",
  "massWarning": "Mass marginal",
  "massOver": "Overweight",
  "goNogo": {
    "GO": "GO",
    "NOGO": "NO-GO",
    "MARGINAL": "Marginal"
  },
  "meteoAlert": "Wind forecast above threshold",
  "meteoAlertAction": "Cancel this flight?",
  "cancelMeteo": "Cancel (weather)",
  "cancelMeteoConfirm": "Cancel this flight due to weather? Passengers will be unassigned and contacts notified by email."
}
```

```json
"mobileList": "List",
"mobileGrid": "Grid"
```

Post-vol wizard English keys:

```json
"postVol": {
  "title": "Post-flight report",
  "step1": "Takeoff",
  "step2": "Landing",
  "step3": "Report",
  "decoLieu": "Takeoff location",
  "decoHeure": "Takeoff time",
  "atterLieu": "Landing location",
  "atterHeure": "Landing time",
  "gasConso": "Gas consumption (kg)",
  "distance": "Distance (km)",
  "anomalies": "Issues / Observations",
  "noteDansCarnet": "Log in flight journal",
  "next": "Next",
  "back": "Back",
  "submit": "Complete flight",
  "summary": "Summary",
  "save": "Save and complete flight"
}
```

```json
"cancellation": {
  "emailSubjectPayeur": "Flight cancelled — {date}",
  "emailSubjectEquipe": "Flight cancelled — {ballon} — {date}"
}
```

- [ ] **Step 3: Verify build**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add messages/fr.json messages/en.json
git commit -m "feat(m3): add i18n keys for dashboard, wizard, cancellation"
```

---

### Task 4: FlightCard shared component

**Files:**

- Create: `components/flight-card.tsx`

- [ ] **Step 1: Create FlightCard component**

Create `components/flight-card.tsx`:

```tsx
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { Plane, Users, Wind, Thermometer, AlertTriangle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type MassBudget = {
  totalWeight: number
  maxPayload: number
  status: 'OK' | 'WARNING' | 'OVER'
}

type WeatherSummary = {
  maxWindKt: number
  avgTemperature: number
  goNogo: 'GO' | 'NOGO' | 'MARGINAL'
}

export type FlightCardData = {
  id: string
  date: string
  creneau: 'MATIN' | 'SOIR'
  statut: string
  ballonNom: string
  ballonImmat: string
  piloteNom: string
  equipierNom: string | null
  siteDeco: string | null
  passagerCount: number
  passagerMax: number
  massBudget: MassBudget | null
  weather: WeatherSummary | null
  meteoAlert: boolean
}

type Props = {
  flight: FlightCardData
  locale: string
  showActions?: boolean
}

const STATUT_VARIANT: Record<string, 'outline' | 'secondary' | 'default' | 'destructive'> = {
  PLANIFIE: 'outline',
  CONFIRME: 'secondary',
  TERMINE: 'default',
  ARCHIVE: 'default',
  ANNULE: 'destructive',
}

const MASS_COLORS: Record<string, string> = {
  OK: 'text-green-600',
  WARNING: 'text-amber-600',
  OVER: 'text-red-600',
}

export function FlightCard({ flight, locale, showActions = true }: Props) {
  const t = useTranslations('dashboard')
  const tv = useTranslations('vols')

  return (
    <Card className={cn(flight.meteoAlert && 'border-amber-400 bg-amber-50/50')}>
      <CardContent className="p-4 space-y-3">
        {/* Header: créneau + statut */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {tv(`creneau.${flight.creneau}`)}
            </Badge>
            <span className="text-sm font-semibold">{flight.ballonNom}</span>
            <span className="text-xs text-muted-foreground">({flight.ballonImmat})</span>
          </div>
          <Badge variant={STATUT_VARIANT[flight.statut] ?? 'outline'}>
            {tv(`statut.${flight.statut}`)}
          </Badge>
        </div>

        {/* Crew + site */}
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <span className="text-xs text-muted-foreground">{tv('fields.pilote')}</span>
            <p className="font-medium">{flight.piloteNom}</p>
          </div>
          {flight.equipierNom && (
            <div>
              <span className="text-xs text-muted-foreground">{tv('fields.equipier')}</span>
              <p className="font-medium">{flight.equipierNom}</p>
            </div>
          )}
          {flight.siteDeco && (
            <div>
              <span className="text-xs text-muted-foreground">{tv('fields.lieuDecollage')}</span>
              <p className="font-medium">{flight.siteDeco}</p>
            </div>
          )}
        </div>

        {/* Passengers + mass */}
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1">
            <Users className="h-3.5 w-3.5 text-muted-foreground" />
            <span>
              {flight.passagerCount}/{flight.passagerMax} {t('passengers')}
            </span>
          </div>
          {flight.massBudget && (
            <span className={cn('font-medium', MASS_COLORS[flight.massBudget.status])}>
              {flight.massBudget.totalWeight}kg / {flight.massBudget.maxPayload}kg
            </span>
          )}
        </div>

        {/* Weather */}
        {flight.weather && (
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1">
              <Wind className="h-3.5 w-3.5 text-muted-foreground" />
              <span>{flight.weather.maxWindKt} kt</span>
            </div>
            <div className="flex items-center gap-1">
              <Thermometer className="h-3.5 w-3.5 text-muted-foreground" />
              <span>{flight.weather.avgTemperature}°C</span>
            </div>
            <Badge
              variant={
                flight.weather.goNogo === 'GO'
                  ? 'secondary'
                  : flight.weather.goNogo === 'NOGO'
                    ? 'destructive'
                    : 'warning'
              }
            >
              {t(`goNogo.${flight.weather.goNogo}`)}
            </Badge>
          </div>
        )}

        {/* Meteo alert */}
        {flight.meteoAlert && (
          <div className="flex items-center gap-2 rounded-md bg-amber-100 px-3 py-2 text-sm text-amber-800">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{t('meteoAlert')}</span>
          </div>
        )}

        {/* Actions */}
        {showActions && (
          <div className="flex flex-wrap gap-2 pt-1">
            <Button asChild size="sm" variant="outline">
              <Link href={`/${locale}/vols/${flight.id}`}>{tv('detail')}</Link>
            </Button>
            {flight.statut === 'PLANIFIE' && (
              <Button asChild size="sm" variant="outline">
                <Link href={`/${locale}/vols/${flight.id}/organiser`}>{tv('organiser')}</Link>
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 2: Verify typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add components/flight-card.tsx
git commit -m "feat(m3): add FlightCard shared component"
```

---

### Task 5: Dashboard jour J rewrite

**Files:**

- Modify: `app/[locale]/(app)/page.tsx`

- [ ] **Step 1: Rewrite dashboard**

Replace `app/[locale]/(app)/page.tsx` entirely with a new dashboard that:

- Fetches today's vols (non-ANNULE) with role filtering via `buildVolWhereForRole`
- Fetches weather via `getWeather()` for today's date
- Computes mass budget per vol using ballon performance chart + forecast OAT
- Fetches CAMO/BFCL alerts filtered to today's ballons/pilotes only
- Renders flight cards using `FlightCard` component
- Renders weather widget per créneau
- Shows alert banner for today's entities only
- Empty state if no flights

The server component fetches data, maps each vol to a `FlightCardData` object, and passes to a client wrapper that renders `FlightCard` components.

Key query:

```typescript
const today = new Date()
today.setHours(0, 0, 0, 0)
const todayStr = today.toISOString().slice(0, 10)

const baseWhere = { date: today, statut: { not: 'ANNULE' as const } }
const where = buildVolWhereForRole(baseWhere, role, session.user.id)

const vols = await db.vol.findMany({
  where,
  include: {
    ballon: true,
    pilote: true,
    equipierEntity: true,
    siteDecollageEntity: true,
    passagers: true,
  },
  orderBy: [{ creneau: 'asc' }, { createdAt: 'asc' }],
})
```

Mass budget computation per vol: use `ballon.performanceChart` (JSON Record<string, number>) + forecast `avgTemperature` → find max payload, compare with total passenger weight.

Alert filtering: only build alerts for ballons and pilotes assigned to today's vols (filter by IDs).

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
git add app/[locale]/(app)/page.tsx
git commit -m "feat(m3): rewrite dashboard as jour J (today's flights)"
```

---

### Task 6: Vols list mobile mode

**Files:**

- Modify: `app/[locale]/(app)/vols/page.tsx`

- [ ] **Step 1: Add mobile list mode**

In the vols page, wrap the existing week grid in `hidden md:block` and add a mobile-only list above it wrapped in `md:hidden`:

```tsx
{
  /* Mobile: stacked flight cards */
}
;<div className="md:hidden space-y-3">
  {vols.map((vol) => (
    <FlightCard key={vol.id} flight={mapVolToCardData(vol)} locale={locale} />
  ))}
  {vols.length === 0 && <p className="text-center text-muted-foreground py-8">{t('noVols')}</p>}
</div>

{
  /* Desktop: existing week grid */
}
;<div className="hidden md:block">{/* ... existing grid code ... */}</div>
```

Add role filtering to the vol query using `buildVolWhereForRole`.

The `mapVolToCardData` helper converts the Prisma vol (with includes) to `FlightCardData` — same mapping as dashboard.

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
git add app/[locale]/(app)/vols/page.tsx
git commit -m "feat(m3): add mobile list mode to vols page"
```

---

### Task 7: Vol detail responsive + sticky CTA

**Files:**

- Modify: `app/[locale]/(app)/vols/[id]/page.tsx`

- [ ] **Step 1: Make detail layout responsive**

Changes to the vol detail page:

1. Detail grid: change `grid-cols-2` to `grid-cols-1 sm:grid-cols-2`
2. Passenger table: wrap in `overflow-x-auto` for mobile scroll
3. Add sticky bottom CTA for mobile when vol is CONFIRME:

```tsx
{
  /* Sticky CTA mobile */
}
{
  vol.statut === 'CONFIRME' && (
    <div className="md:hidden fixed bottom-0 inset-x-0 z-10 border-t bg-background p-4">
      <Button asChild className="w-full" size="lg">
        <Link href={`/${locale}/vols/${vol.id}/post-vol`}>{t('postVolLink')}</Link>
      </Button>
    </div>
  )
}
```

4. Add bottom padding to main content to prevent CTA overlap: `pb-20 md:pb-0`

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
git add app/[locale]/(app)/vols/[id]/page.tsx
git commit -m "feat(m3): responsive vol detail + sticky post-vol CTA on mobile"
```

---

### Task 8: Post-vol wizard component

**Files:**

- Create: `components/post-vol-wizard.tsx`
- Modify: `app/[locale]/(app)/vols/[id]/post-vol/page.tsx`

- [ ] **Step 1: Create wizard component**

Create `components/post-vol-wizard.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { savePostFlight } from '@/lib/actions/vol'

type Props = {
  volId: string
  locale: string
  defaultDecoLieu: string
  configGaz: string | null
}

const STEPS = ['step1', 'step2', 'step3'] as const

export function PostVolWizard({ volId, locale, defaultDecoLieu, configGaz }: Props) {
  const t = useTranslations('vols.postVol')
  const [step, setStep] = useState(0)
  const [submitting, setSubmitting] = useState(false)

  // Form state
  const [decoLieu, setDecoLieu] = useState(defaultDecoLieu)
  const [decoHeure, setDecoHeure] = useState('')
  const [atterLieu, setAtterLieu] = useState('')
  const [atterHeure, setAtterHeure] = useState('')
  const [gasConso, setGasConso] = useState('')
  const [distance, setDistance] = useState('')
  const [anomalies, setAnomalies] = useState('')
  const [noteDansCarnet, setNoteDansCarnet] = useState(true)

  async function handleSubmit() {
    setSubmitting(true)
    const formData = new FormData()
    formData.set('decoLieu', decoLieu)
    formData.set('decoHeure', decoHeure)
    formData.set('atterLieu', atterLieu)
    formData.set('atterHeure', atterHeure)
    formData.set('gasConso', gasConso)
    formData.set('distance', distance)
    formData.set('anomalies', anomalies)
    formData.set('noteDansCarnet', noteDansCarnet ? 'true' : 'false')

    const result = await savePostFlight(volId, locale, formData)
    if (result?.error) {
      toast.error(result.error)
      setSubmitting(false)
    }
    // On success, savePostFlight redirects — no need to handle here
  }

  return (
    <div className="space-y-6">
      {/* Progress indicator */}
      <div className="flex items-center justify-center gap-2">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium',
                i < step && 'bg-primary text-primary-foreground',
                i === step && 'bg-primary text-primary-foreground ring-2 ring-primary/30',
                i > step && 'bg-muted text-muted-foreground',
              )}
            >
              {i + 1}
            </div>
            <span className="text-sm hidden sm:inline">{t(s)}</span>
            {i < STEPS.length - 1 && <div className="w-8 h-px bg-border" />}
          </div>
        ))}
      </div>

      {/* Step 1: Décollage */}
      {step === 0 && (
        <Card>
          <CardContent className="p-6 space-y-4">
            <h2 className="text-lg font-semibold">{t('step1')}</h2>
            <div className="space-y-2">
              <Label htmlFor="decoLieu">{t('decoLieu')}</Label>
              <Input
                id="decoLieu"
                value={decoLieu}
                onChange={(e) => setDecoLieu(e.target.value)}
                className="text-lg"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="decoHeure">{t('decoHeure')}</Label>
              <Input
                id="decoHeure"
                type="time"
                value={decoHeure}
                onChange={(e) => setDecoHeure(e.target.value)}
                className="text-lg"
              />
            </div>
            <Button className="w-full" size="lg" onClick={() => setStep(1)} disabled={!decoHeure}>
              {t('next')}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Atterrissage */}
      {step === 1 && (
        <Card>
          <CardContent className="p-6 space-y-4">
            <h2 className="text-lg font-semibold">{t('step2')}</h2>
            <div className="space-y-2">
              <Label htmlFor="atterLieu">{t('atterLieu')}</Label>
              <Input
                id="atterLieu"
                value={atterLieu}
                onChange={(e) => setAtterLieu(e.target.value)}
                className="text-lg"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="atterHeure">{t('atterHeure')}</Label>
              <Input
                id="atterHeure"
                type="time"
                value={atterHeure}
                onChange={(e) => setAtterHeure(e.target.value)}
                className="text-lg"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="gasConso">
                {t('gasConso')}
                {configGaz ? ` (${configGaz})` : ''}
              </Label>
              <Input
                id="gasConso"
                type="number"
                value={gasConso}
                onChange={(e) => setGasConso(e.target.value)}
                className="text-lg"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="distance">{t('distance')}</Label>
              <Input
                id="distance"
                type="number"
                value={distance}
                onChange={(e) => setDistance(e.target.value)}
                className="text-lg"
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" size="lg" onClick={() => setStep(0)}>
                {t('back')}
              </Button>
              <Button
                className="flex-1"
                size="lg"
                onClick={() => setStep(2)}
                disabled={!atterHeure}
              >
                {t('next')}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Compte-rendu */}
      {step === 2 && (
        <Card>
          <CardContent className="p-6 space-y-4">
            <h2 className="text-lg font-semibold">{t('step3')}</h2>
            <div className="space-y-2">
              <Label htmlFor="anomalies">{t('anomalies')}</Label>
              <Textarea
                id="anomalies"
                value={anomalies}
                onChange={(e) => setAnomalies(e.target.value)}
                rows={4}
                className="text-lg"
              />
            </div>
            <div className="flex items-center gap-3">
              <Switch
                id="noteDansCarnet"
                checked={noteDansCarnet}
                onCheckedChange={setNoteDansCarnet}
              />
              <Label htmlFor="noteDansCarnet">{t('noteDansCarnet')}</Label>
            </div>

            {/* Summary */}
            <div className="rounded-lg bg-muted p-4 space-y-1 text-sm">
              <h3 className="font-medium">{t('summary')}</h3>
              <p>
                {t('decoLieu')}: {decoLieu}
              </p>
              <p>
                {t('decoHeure')}: {decoHeure}
              </p>
              <p>
                {t('atterLieu')}: {atterLieu}
              </p>
              <p>
                {t('atterHeure')}: {atterHeure}
              </p>
              {gasConso && (
                <p>
                  {t('gasConso')}: {gasConso}
                </p>
              )}
              {distance && (
                <p>
                  {t('distance')}: {distance}
                </p>
              )}
            </div>

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" size="lg" onClick={() => setStep(1)}>
                {t('back')}
              </Button>
              <Button className="flex-1" size="lg" onClick={handleSubmit} disabled={submitting}>
                {t('submit')}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Update post-vol page to use wizard**

Modify `app/[locale]/(app)/vols/[id]/post-vol/page.tsx` to pass `defaultDecoLieu` (from `vol.siteDecollageEntity?.nom`) and `configGaz` (from `vol.ballon.configGaz`) to the wizard:

```tsx
import { requireAuth } from '@/lib/auth/requireAuth'
import { getContext } from '@/lib/context'
import { db } from '@/lib/db'
import { redirect, notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { PostVolWizard } from '@/components/post-vol-wizard'

type Props = {
  params: Promise<{ locale: string; id: string }>
}

export default async function PostVolPage({ params }: Props) {
  return requireAuth(async () => {
    const { locale, id } = await params
    const t = await getTranslations('vols')

    const vol = await db.vol.findUnique({
      where: { id },
      include: {
        ballon: { select: { configGaz: true } },
        siteDecollageEntity: { select: { nom: true } },
      },
    })

    if (!vol) notFound()
    if (vol.statut === 'ARCHIVE' || vol.statut === 'ANNULE') {
      redirect(`/${locale}/vols/${id}`)
    }

    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold tracking-tight">{t('postVol.title')}</h1>
        <PostVolWizard
          volId={id}
          locale={locale}
          defaultDecoLieu={vol.siteDecollageEntity?.nom ?? ''}
          configGaz={vol.ballon.configGaz}
        />
      </div>
    )
  })
}
```

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: Build succeeds

- [ ] **Step 4: Commit**

```bash
git add components/post-vol-wizard.tsx app/[locale]/(app)/vols/[id]/post-vol/page.tsx
git commit -m "feat(m3): post-vol wizard 3-step mobile component"
```

---

### Task 9: Cancellation email templates

**Files:**

- Create: `lib/email/cancellation.ts`

- [ ] **Step 1: Create email template module**

Create `lib/email/cancellation.ts`:

```typescript
import { Resend } from 'resend'
import { formatDateFr } from '@/lib/format'

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

type CancellationData = {
  ballonNom: string
  date: Date
  creneau: 'MATIN' | 'SOIR'
  exploitantName: string
  reason: string
}

function buildPayeurHtml(data: CancellationData): string {
  const dateStr = formatDateFr(data.date)
  const creneauLabel = data.creneau === 'MATIN' ? 'matin' : 'soir'
  return `<!DOCTYPE html>
<html lang="fr"><head><meta charset="UTF-8"/><title>Vol annule</title></head>
<body style="font-family:Arial,sans-serif;color:#111827;background:#f9fafb;margin:0;padding:24px;">
<div style="max-width:640px;margin:0 auto;background:#fff;border-radius:8px;border:1px solid #e5e7eb;">
  <div style="background:#b45309;color:#fff;padding:20px 24px;">
    <h1 style="margin:0;font-size:18px;">Vol annule — ${escapeHtml(data.exploitantName)}</h1>
  </div>
  <div style="padding:24px;">
    <p>Bonjour,</p>
    <p>Nous vous informons que votre vol du <strong>${dateStr}</strong> (creneau ${creneauLabel})
       a ete annule pour raison <strong>${escapeHtml(data.reason)}</strong>.</p>
    <p>Nous vous recontacterons pour reprogrammer votre vol dans les meilleurs delais.</p>
    <p style="margin-top:24px;font-size:12px;color:#6b7280;">
      ${escapeHtml(data.exploitantName)} — Calpax
    </p>
  </div>
</div></body></html>`
}

function buildEquipeHtml(data: CancellationData, role: string): string {
  const dateStr = formatDateFr(data.date)
  const creneauLabel = data.creneau === 'MATIN' ? 'matin' : 'soir'
  return `<!DOCTYPE html>
<html lang="fr"><head><meta charset="UTF-8"/><title>Vol annule</title></head>
<body style="font-family:Arial,sans-serif;color:#111827;background:#f9fafb;margin:0;padding:24px;">
<div style="max-width:640px;margin:0 auto;background:#fff;border-radius:8px;border:1px solid #e5e7eb;">
  <div style="background:#b45309;color:#fff;padding:20px 24px;">
    <h1 style="margin:0;font-size:18px;">Vol annule</h1>
  </div>
  <div style="padding:24px;">
    <p>Bonjour,</p>
    <p>Le vol <strong>${escapeHtml(data.ballonNom)}</strong> du <strong>${dateStr}</strong>
       (creneau ${creneauLabel}) a ete annule.</p>
    <p>Raison : ${escapeHtml(data.reason)}</p>
    <p style="margin-top:24px;font-size:12px;color:#6b7280;">
      ${escapeHtml(data.exploitantName)} — Calpax
    </p>
  </div>
</div></body></html>`
}

type SendCancellationParams = {
  payeurEmails: string[]
  piloteEmail: string | null
  equipierEmail: string | null
  cancellingUserId: string
  piloteUserId: string | null
  data: CancellationData
}

/**
 * Send cancellation notification emails.
 * Skips pilote/equipier if they are the user who cancelled (avoid self-notification).
 */
export async function sendCancellationEmails(params: SendCancellationParams): Promise<{
  sent: number
  skipped: number
}> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.warn('[cancellation] Resend not configured — skipping emails')
    return { sent: 0, skipped: 0 }
  }

  const resend = new Resend(apiKey)
  const from = process.env.EMAIL_FROM ?? 'Calpax <noreply@calpax.fr>'
  const dateStr = formatDateFr(params.data.date)
  let sent = 0
  let skipped = 0

  // Payeur emails
  for (const email of params.payeurEmails) {
    try {
      await resend.emails.send({
        from,
        to: email,
        subject: `Vol annule — ${dateStr}`,
        html: buildPayeurHtml(params.data),
      })
      sent++
    } catch {
      skipped++
    }
  }

  // Pilote email (skip if same user)
  if (params.piloteEmail && params.piloteUserId !== params.cancellingUserId) {
    try {
      await resend.emails.send({
        from,
        to: params.piloteEmail,
        subject: `Vol annule — ${params.data.ballonNom} — ${dateStr}`,
        html: buildEquipeHtml(params.data, 'pilote'),
      })
      sent++
    } catch {
      skipped++
    }
  }

  // Equipier email (skip if same user — no userId link, always send if available)
  if (params.equipierEmail) {
    try {
      await resend.emails.send({
        from,
        to: params.equipierEmail,
        subject: `Vol annule — ${params.data.ballonNom} — ${dateStr}`,
        html: buildEquipeHtml(params.data, 'equipier'),
      })
      sent++
    } catch {
      skipped++
    }
  }

  return { sent, skipped }
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/email/cancellation.ts
git commit -m "feat(m3): add cancellation email templates"
```

---

### Task 10: Update cancelVol with reason + notifications

**Files:**

- Modify: `lib/actions/vol.ts`

- [ ] **Step 1: Update cancelVol to accept reason and send emails**

Modify the `cancelVol` function in `lib/actions/vol.ts`:

1. Add optional `reason` parameter
2. Save `cancelReason` on the vol
3. Fetch payeur emails from affected billets
4. Fetch pilote and equipier emails
5. Call `sendCancellationEmails` after cancellation

The function signature becomes:

```typescript
export async function cancelVol(
  volId: string,
  locale: string,
  reason?: string,
): Promise<{ error?: string }>
```

After the vol update to `ANNULE`, add:

```typescript
// Send cancellation emails
const billets = await db.billet.findMany({
  where: { passagers: { some: { volId } } },
  select: { payeurEmail: true },
})
const payeurEmails = [...new Set(billets.map((b) => b.payeurEmail).filter(Boolean) as string[])]

const pilote = await db.pilote.findUnique({
  where: { id: vol.piloteId },
  select: { email: true, userId: true },
})

const equipier = vol.equipierId
  ? await db.equipier.findUnique({
      where: { id: vol.equipierId },
      select: { telephone: true }, // equipier has no email field yet
    })
  : null

await sendCancellationEmails({
  payeurEmails,
  piloteEmail: pilote?.email ?? null,
  equipierEmail: null, // Equipier model has no email field
  cancellingUserId: ctx.userId,
  piloteUserId: pilote?.userId ?? null,
  data: {
    ballonNom: vol.ballon.nom,
    date: vol.date,
    creneau: vol.creneau,
    exploitantName: vol.exploitant.name,
    reason: reason ?? 'Non précisée',
  },
})
```

- [ ] **Step 2: Verify typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add lib/actions/vol.ts
git commit -m "feat(m3): cancelVol sends notification emails with reason"
```

---

### Task 11: Weather alert cron

**Files:**

- Create: `app/api/cron/meteo-alert/route.ts`
- Modify: `vercel.json`

- [ ] **Step 1: Create cron endpoint**

Create `app/api/cron/meteo-alert/route.ts`:

```typescript
import { basePrisma } from '@/lib/db/base'
import { getWeather } from '@/lib/weather/cache'
import { extractCreneauHours } from '@/lib/weather/extract'
import { classifyWind } from '@/lib/weather/classify'
import { logger } from '@/lib/logger'

/**
 * Weather alert cron — checks today's vols against wind thresholds.
 * Runs every 30 min from 03:00 to 18:00 UTC (Vercel Cron).
 * Sets vol.meteoAlert = true if wind exceeds exploitant.meteoSeuilVent.
 * Clears the flag if wind drops below threshold.
 */
export async function GET(request: Request): Promise<Response> {
  const authHeader = request.headers.get('Authorization')
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret) {
    logger.error('CRON_SECRET is not configured')
    return Response.json({ error: 'Server misconfiguration' }, { status: 500 })
  }

  if (authHeader !== `Bearer ${cronSecret}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayStr = today.toISOString().slice(0, 10)

  // Fetch all vols for today that are still active, grouped by exploitant
  const vols = await basePrisma.vol.findMany({
    where: {
      date: today,
      statut: { in: ['PLANIFIE', 'CONFIRME'] },
    },
    include: {
      exploitant: {
        select: {
          id: true,
          meteoLatitude: true,
          meteoLongitude: true,
          meteoSeuilVent: true,
        },
      },
      ballon: { select: { nom: true } },
    },
  })

  if (vols.length === 0) {
    return Response.json({ checked: 0, flagged: 0, cleared: 0 })
  }

  let flagged = 0
  let cleared = 0

  // Group vols by exploitant to avoid duplicate weather fetches
  const byExploitant = new Map<string, typeof vols>()
  for (const vol of vols) {
    const key = vol.exploitantId
    if (!byExploitant.has(key)) byExploitant.set(key, [])
    byExploitant.get(key)!.push(vol)
  }

  for (const [, expVols] of byExploitant) {
    const exp = expVols[0]!.exploitant
    if (!exp.meteoLatitude || !exp.meteoLongitude) continue

    let forecast
    try {
      forecast = await getWeather({
        exploitantId: exp.id,
        latitude: exp.meteoLatitude,
        longitude: exp.meteoLongitude,
        date: todayStr,
      })
    } catch (err) {
      logger.error({ exploitantId: exp.id, err }, 'Failed to fetch weather for meteo-alert')
      continue
    }

    const threshold = exp.meteoSeuilVent ?? 15

    for (const vol of expVols) {
      const hours = extractCreneauHours(forecast, vol.creneau)
      const maxWind = Math.max(...hours.map((h) => h.windSpeedKt))
      const shouldAlert = maxWind > threshold

      if (shouldAlert && !vol.meteoAlert) {
        await basePrisma.vol.update({
          where: { id: vol.id },
          data: { meteoAlert: true },
        })
        flagged++
        logger.info(
          { volId: vol.id, ballon: vol.ballon.nom, maxWind, threshold },
          'Meteo alert flagged',
        )
      } else if (!shouldAlert && vol.meteoAlert) {
        await basePrisma.vol.update({
          where: { id: vol.id },
          data: { meteoAlert: false },
        })
        cleared++
        logger.info(
          { volId: vol.id, ballon: vol.ballon.nom, maxWind, threshold },
          'Meteo alert cleared',
        )
      }
    }
  }

  logger.info({ checked: vols.length, flagged, cleared }, 'Cron meteo-alert complete')
  return Response.json({ checked: vols.length, flagged, cleared })
}
```

- [ ] **Step 2: Add cron to vercel.json**

Add to the `crons` array in `vercel.json`:

```json
{
  "path": "/api/cron/meteo-alert",
  "schedule": "*/30 3-18 * * *"
}
```

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: Build succeeds

- [ ] **Step 4: Commit**

```bash
git add app/api/cron/meteo-alert/route.ts vercel.json
git commit -m "feat(m3): weather alert cron flags vols exceeding wind threshold"
```

---

### Task 12: Meteo alert banner on dashboard and vol detail

**Files:**

- Create: `components/meteo-alert-banner.tsx`
- Modify: `app/[locale]/(app)/vols/[id]/page.tsx`

- [ ] **Step 1: Create meteo alert banner component**

Create `components/meteo-alert-banner.tsx`:

```tsx
'use client'

import { useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cancelVol } from '@/lib/actions/vol'

type Props = {
  volId: string
  locale: string
}

export function MeteoAlertBanner({ volId, locale }: Props) {
  const t = useTranslations('dashboard')
  const [pending, startTransition] = useTransition()

  function handleCancel() {
    if (!confirm(t('cancelMeteoConfirm'))) return
    startTransition(async () => {
      const result = await cancelVol(volId, locale, 'Météo')
      if (result?.error) {
        toast.error(result.error)
      }
    })
  }

  return (
    <div className="flex items-center gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
      <AlertTriangle className="h-4 w-4 shrink-0" />
      <span className="flex-1">
        {t('meteoAlert')} — {t('meteoAlertAction')}
      </span>
      <Button size="sm" variant="destructive" onClick={handleCancel} disabled={pending}>
        {t('cancelMeteo')}
      </Button>
    </div>
  )
}
```

- [ ] **Step 2: Add banner to vol detail page**

In `app/[locale]/(app)/vols/[id]/page.tsx`, after the page header and before the detail card, add:

```tsx
{
  vol.meteoAlert && vol.statut !== 'ANNULE' && <MeteoAlertBanner volId={vol.id} locale={locale} />
}
```

Import `MeteoAlertBanner` at top.

The `FlightCard` component (Task 4) already renders a read-only meteo alert indicator on the dashboard, so the dashboard side is covered.

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: Build succeeds

- [ ] **Step 4: Commit**

```bash
git add components/meteo-alert-banner.tsx app/[locale]/(app)/vols/[id]/page.tsx
git commit -m "feat(m3): meteo alert banner with cancel button on vol detail"
```

---

### Task 13: Integration tests

**Files:**

- Create: `tests/integration/meteo-alert.spec.ts`

- [ ] **Step 1: Write integration tests**

Create `tests/integration/meteo-alert.spec.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { basePrisma } from '@/lib/db/base'
import { resetDb, seedTenant, asUser } from './helpers'
import { db } from '@/lib/db'

describe('M3 — role filtering + meteo alert + cancellation', () => {
  beforeEach(async () => {
    await resetDb()
  })

  it('PILOTE only sees vols where they are assigned', async () => {
    const tenant = await seedTenant('A')

    // Create a pilote linked to the tenant user
    const pilote = await basePrisma.pilote.create({
      data: {
        prenom: 'Jean',
        nom: 'Dupont',
        userId: tenant.userId,
        exploitantId: tenant.exploitantId,
        dateExpirationLicence: new Date('2027-01-01'),
      },
    })

    // Create a second pilote (different user)
    const other = await basePrisma.user.create({
      data: {
        email: 'other@test.local',
        name: 'Other',
        role: 'PILOTE',
        exploitantId: tenant.exploitantId,
      },
    })
    const otherPilote = await basePrisma.pilote.create({
      data: {
        prenom: 'Marc',
        nom: 'Martin',
        userId: other.id,
        exploitantId: tenant.exploitantId,
        dateExpirationLicence: new Date('2027-01-01'),
      },
    })

    // Create a ballon
    const ballon = await basePrisma.ballon.create({
      data: {
        nom: 'TestBallon',
        immatriculation: 'F-TEST',
        volumeM3: 3000,
        nbPassagerMax: 6,
        peseeAVide: 200,
        configGaz: 'propane',
        manexAnnexRef: 'A1',
        exploitantId: tenant.exploitantId,
        camoExpiryDate: new Date('2027-01-01'),
      },
    })

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Vol assigned to tenant user's pilote
    await basePrisma.vol.create({
      data: {
        date: today,
        creneau: 'MATIN',
        ballonId: ballon.id,
        piloteId: pilote.id,
        exploitantId: tenant.exploitantId,
      },
    })

    // Vol assigned to other pilote
    await basePrisma.vol.create({
      data: {
        date: today,
        creneau: 'SOIR',
        ballonId: ballon.id,
        piloteId: otherPilote.id,
        exploitantId: tenant.exploitantId,
      },
    })

    // As PILOTE, should only see 1 vol
    const vols = await asUser(tenant, 'PILOTE', async () =>
      db.vol.findMany({
        where: {
          date: today,
          pilote: { userId: tenant.userId },
        },
      }),
    )
    expect(vols).toHaveLength(1)
    expect(vols[0]!.creneau).toBe('MATIN')
  })

  it('meteoAlert flag can be set and cleared on a vol', async () => {
    const tenant = await seedTenant('A')
    const pilote = await basePrisma.pilote.create({
      data: {
        prenom: 'Jean',
        nom: 'Dupont',
        exploitantId: tenant.exploitantId,
        dateExpirationLicence: new Date('2027-01-01'),
      },
    })
    const ballon = await basePrisma.ballon.create({
      data: {
        nom: 'B1',
        immatriculation: 'F-B1',
        volumeM3: 3000,
        nbPassagerMax: 6,
        peseeAVide: 200,
        configGaz: 'propane',
        manexAnnexRef: 'A1',
        exploitantId: tenant.exploitantId,
        camoExpiryDate: new Date('2027-01-01'),
      },
    })
    const vol = await basePrisma.vol.create({
      data: {
        date: new Date(),
        creneau: 'MATIN',
        ballonId: ballon.id,
        piloteId: pilote.id,
        exploitantId: tenant.exploitantId,
      },
    })

    // Default: false
    expect(vol.meteoAlert).toBe(false)

    // Set alert
    const updated = await basePrisma.vol.update({
      where: { id: vol.id },
      data: { meteoAlert: true },
    })
    expect(updated.meteoAlert).toBe(true)

    // Clear alert
    const cleared = await basePrisma.vol.update({
      where: { id: vol.id },
      data: { meteoAlert: false },
    })
    expect(cleared.meteoAlert).toBe(false)
  })

  it('cancelReason is stored on cancellation', async () => {
    const tenant = await seedTenant('A')
    const pilote = await basePrisma.pilote.create({
      data: {
        prenom: 'Jean',
        nom: 'Dupont',
        exploitantId: tenant.exploitantId,
        dateExpirationLicence: new Date('2027-01-01'),
      },
    })
    const ballon = await basePrisma.ballon.create({
      data: {
        nom: 'B1',
        immatriculation: 'F-B1',
        volumeM3: 3000,
        nbPassagerMax: 6,
        peseeAVide: 200,
        configGaz: 'propane',
        manexAnnexRef: 'A1',
        exploitantId: tenant.exploitantId,
        camoExpiryDate: new Date('2027-01-01'),
      },
    })
    const vol = await basePrisma.vol.create({
      data: {
        date: new Date(),
        creneau: 'MATIN',
        ballonId: ballon.id,
        piloteId: pilote.id,
        exploitantId: tenant.exploitantId,
      },
    })

    await basePrisma.vol.update({
      where: { id: vol.id },
      data: { statut: 'ANNULE', cancelReason: 'Météo' },
    })

    const cancelled = await basePrisma.vol.findUniqueOrThrow({ where: { id: vol.id } })
    expect(cancelled.statut).toBe('ANNULE')
    expect(cancelled.cancelReason).toBe('Météo')
  })
})
```

- [ ] **Step 2: Run integration tests**

Run: `npm run test:integration -- --run meteo-alert`
Expected: 3 tests PASS

- [ ] **Step 3: Run full test suite**

Run: `npm run test:integration && npm run test`
Expected: All tests PASS

- [ ] **Step 4: Commit**

```bash
git add tests/integration/meteo-alert.spec.ts
git commit -m "test(m3): integration tests for role filtering, meteo alert, cancellation"
```

---

### Task 14: Final build + push

- [ ] **Step 1: Full build verification**

Run: `npm run build`
Expected: Build succeeds with no errors

- [ ] **Step 2: Push all commits**

Run: `git push`
Expected: All commits pushed to main

- [ ] **Step 3: Monitor pipeline**

Run: `gh run list --limit 1`
Expected: CI pipeline green
