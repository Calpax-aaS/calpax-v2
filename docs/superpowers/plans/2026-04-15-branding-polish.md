# Branding Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add visual polish to the Calpax app: redesigned login page, empty state illustrations, and enriched dashboard with weather widget and activity chart.

**Architecture:** Pure UI changes. No new dependencies, no schema changes. SVG illustrations inline, bar chart with Tailwind divs, weather widget reuses existing `getWeather` + `summarizeWeather`.

**Tech Stack:** Next.js 15 server components, Tailwind CSS, next-intl, existing weather libs

**Spec:** `docs/superpowers/specs/2026-04-15-branding-polish-design.md`

---

## File Map

### New files

| File                         | Responsibility                                                 |
| ---------------------------- | -------------------------------------------------------------- |
| `components/empty-state.tsx` | Reusable empty state with SVG balloon + message + optional CTA |

### Modified files

| File                                    | Responsibility                      |
| --------------------------------------- | ----------------------------------- |
| `app/[locale]/auth/signin/page.tsx`     | Redesign to split screen login      |
| `app/[locale]/(app)/page.tsx`           | Add weather widget + activity chart |
| `app/[locale]/(app)/billets/page.tsx`   | Use EmptyState component            |
| `app/[locale]/(app)/vols/page.tsx`      | Use EmptyState component            |
| `app/[locale]/(app)/ballons/page.tsx`   | Use EmptyState component            |
| `app/[locale]/(app)/pilotes/page.tsx`   | Use EmptyState component            |
| `app/[locale]/(app)/equipiers/page.tsx` | Use EmptyState component            |
| `app/[locale]/(app)/vehicules/page.tsx` | Use EmptyState component            |
| `app/[locale]/(app)/sites/page.tsx`     | Use EmptyState component            |
| `messages/fr.json`                      | Add missing i18n keys               |
| `messages/en.json`                      | Add missing i18n keys               |

---

## Task 1: Redesign login page

**Files:**

- Modify: `app/[locale]/auth/signin/page.tsx`
- Modify: `messages/fr.json`
- Modify: `messages/en.json`

- [ ] **Step 1: Add i18n keys for login page**

In `messages/fr.json`, add to the `signin` section:

```json
"signin": {
  "title": "Connexion à Calpax",
  "emailLabel": "Adresse email",
  "emailPlaceholder": "vous@exemple.com",
  "submit": "Recevoir le lien de connexion",
  "verifySent": "Vérifiez votre boîte email. Un lien de connexion vous a été envoyé.",
  "verifyTitle": "Lien envoyé",
  "tagline": "Volez avec Calpax.\nVotre flotte, votre ciel.",
  "subtitle": "La gestion de vols réinventée.",
  "magicLinkHint": "Un lien magique vous sera envoyé par email",
  "connectTitle": "Connectez-vous à votre compte",
  "appDescription": "SaaS de gestion de vols en montgolfière",
  "footer": "Calpax 2026"
}
```

Add the equivalent in `messages/en.json`:

```json
"signin": {
  "title": "Sign in to Calpax",
  "emailLabel": "Email address",
  "emailPlaceholder": "you@example.com",
  "submit": "Send magic link",
  "verifySent": "Check your inbox. A sign-in link has been sent.",
  "verifyTitle": "Link sent",
  "tagline": "Fly with Calpax.\nYour fleet, your sky.",
  "subtitle": "Flight management reinvented.",
  "magicLinkHint": "A magic link will be sent to your email",
  "connectTitle": "Sign in to your account",
  "appDescription": "Hot air balloon flight management SaaS",
  "footer": "Calpax 2026"
}
```

- [ ] **Step 2: Rewrite the signin page**

Replace the entire content of `app/[locale]/auth/signin/page.tsx` with the split-screen layout:

```tsx
import { getTranslations } from 'next-intl/server'
import { signIn } from '@/lib/auth'

type Props = {
  params: Promise<{ locale: string }>
}

export default async function SignInPage({ params }: Props) {
  const { locale } = await params
  const t = await getTranslations('signin')

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#E8ECF0] p-4">
      <div className="flex w-full max-w-5xl overflow-hidden rounded-2xl bg-white shadow-xl">
        {/* Left panel — branding */}
        <div
          className="relative hidden flex-1 flex-col justify-end overflow-hidden p-10 md:flex"
          style={{
            background:
              'linear-gradient(160deg, #0D3B66 0%, #1A5A96 30%, #3B82F6 55%, #7DD3FC 70%, #F59E0B 88%, #FCD34D 100%)',
          }}
        >
          {/* Subtle pattern overlay */}
          <div
            className="absolute inset-0 opacity-5"
            style={{
              background:
                'repeating-linear-gradient(45deg, white 0px, white 1px, transparent 1px, transparent 20px)',
            }}
          />
          {/* Balloon silhouettes */}
          <svg
            className="absolute left-1/2 top-16 -translate-x-1/2 opacity-15"
            width="200"
            height="200"
            viewBox="0 0 200 200"
            fill="none"
          >
            <path
              d="M100 20 C75 20, 40 45, 40 85 C40 110, 55 130, 100 145 C145 130, 160 110, 160 85 C160 45, 125 20, 100 20Z"
              fill="white"
            />
            <rect x="90" y="145" width="20" height="15" rx="3" fill="white" />
            <path
              d="M45 80 C35 80, 20 95, 20 115 C20 128, 28 138, 45 145 C62 138, 70 128, 70 115 C70 95, 55 80, 45 80Z"
              fill="white"
              opacity="0.6"
              transform="translate(-5, 30) scale(0.5)"
            />
            <path
              d="M155 70 C145 70, 130 85, 130 105 C130 118, 138 128, 155 135 C172 128, 180 118, 180 105 C180 85, 165 70, 155 70Z"
              fill="white"
              opacity="0.4"
              transform="translate(10, 40) scale(0.45)"
            />
          </svg>
          {/* Tagline */}
          <div className="relative z-10">
            <h2 className="whitespace-pre-line text-3xl font-bold leading-tight text-white">
              {t('tagline')}
            </h2>
            <p className="mt-2 text-sm text-white/70">{t('subtitle')}</p>
          </div>
        </div>

        {/* Right panel — form */}
        <div className="flex flex-1 flex-col items-center justify-center px-8 py-12 sm:px-12">
          <div className="w-full max-w-sm">
            {/* Logo */}
            <div className="mb-8 flex flex-col items-center">
              <img src="/logo.svg" alt="Calpax" className="mb-3 h-12 w-12" />
              <span className="text-2xl font-bold text-primary">Calpax</span>
              <span className="mt-1 text-xs text-muted-foreground">{t('appDescription')}</span>
            </div>

            <h3 className="mb-6 text-center text-lg font-semibold">{t('connectTitle')}</h3>

            <form
              action={async (formData: FormData) => {
                'use server'
                const email = formData.get('email') as string
                await signIn('resend', { email, redirectTo: `/${locale}` })
              }}
              className="space-y-5"
            >
              <div className="space-y-1.5">
                <label
                  htmlFor="email"
                  className="text-xs font-medium uppercase tracking-wider text-muted-foreground"
                >
                  {t('emailLabel')}
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  placeholder={t('emailPlaceholder')}
                  className="w-full rounded-lg border border-input bg-secondary/30 px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring/20"
                />
              </div>
              <button
                type="submit"
                className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                {t('submit')}
              </button>
            </form>

            <p className="mt-4 text-center text-xs text-muted-foreground">{t('magicLinkHint')}</p>

            <p className="mt-12 text-center text-[10px] text-muted-foreground/50">{t('footer')}</p>
          </div>
        </div>
      </div>
    </main>
  )
}
```

- [ ] **Step 3: Build and verify**

```bash
npm run build
```

Open `/fr/auth/signin` in browser. Verify split screen layout renders, mobile view shows only the form.

- [ ] **Step 4: Commit**

```bash
git add "app/[locale]/auth/signin/page.tsx" messages/fr.json messages/en.json
git commit -m "feat(ui): redesign login page with split-screen branding layout"
```

---

## Task 2: Create EmptyState component

**Files:**

- Create: `components/empty-state.tsx`

- [ ] **Step 1: Create the component**

Create `components/empty-state.tsx`:

```tsx
import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type EmptyStateProps = {
  message: string
  actionLabel?: string
  actionHref?: string
}

function BalloonSvg() {
  return (
    <svg
      width="80"
      height="96"
      viewBox="0 0 80 96"
      fill="none"
      className="text-muted-foreground/20"
    >
      <path
        d="M40 4 C28 4, 12 18, 12 38 C12 52, 20 62, 32 68 L34 70 L34 74 L46 74 L46 70 L48 68 C60 62, 68 52, 68 38 C68 18, 52 4, 40 4Z"
        fill="currentColor"
      />
      <line x1="34" y1="74" x2="36" y2="82" stroke="currentColor" strokeWidth="1.5" />
      <line x1="46" y1="74" x2="44" y2="82" stroke="currentColor" strokeWidth="1.5" />
      <rect x="34" y="82" width="12" height="8" rx="2" fill="currentColor" />
    </svg>
  )
}

export function EmptyState({ message, actionLabel, actionHref }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <BalloonSvg />
      <p className="mt-4 text-sm text-muted-foreground">{message}</p>
      {actionLabel && actionHref && (
        <Link
          href={actionHref}
          className={cn(buttonVariants({ variant: 'default', size: 'sm' }), 'mt-4')}
        >
          {actionLabel}
        </Link>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Build and verify**

```bash
npm run build
```

- [ ] **Step 3: Commit**

```bash
git add components/empty-state.tsx
git commit -m "feat(ui): create EmptyState component with balloon SVG illustration"
```

---

## Task 3: Integrate EmptyState in listing pages

**Files:**

- Modify: `app/[locale]/(app)/billets/page.tsx`
- Modify: `app/[locale]/(app)/ballons/page.tsx`
- Modify: `app/[locale]/(app)/pilotes/page.tsx`
- Modify: `app/[locale]/(app)/equipiers/page.tsx`
- Modify: `app/[locale]/(app)/vehicules/page.tsx`
- Modify: `app/[locale]/(app)/sites/page.tsx`
- Modify: `app/[locale]/(app)/vols/page.tsx`
- Modify: `messages/fr.json`
- Modify: `messages/en.json`

- [ ] **Step 1: Add missing i18n keys for empty states and CTAs**

In `messages/fr.json`, ensure these keys exist (add if missing):

```json
"billets": {
  "noBillets": "Aucun billet pour le moment",
  "createFirst": "Créer un billet"
}
"ballons": {
  "noResults": "Aucun ballon enregistré",
  "createFirst": "Ajouter un ballon"
}
"pilotes": {
  "noResults": "Aucun pilote enregistré",
  "createFirst": "Ajouter un pilote"
}
"equipiers": {
  "noEntries": "Aucun équipier enregistré.",
  "createFirst": "Ajouter un équipier"
}
"vehicules": {
  "noEntries": "Aucun véhicule enregistré.",
  "createFirst": "Ajouter un véhicule"
}
"sites": {
  "noEntries": "Aucun site enregistré.",
  "createFirst": "Ajouter un site"
}
"vols": {
  "noVols": "Aucun vol sur cette semaine",
  "createFirst": "Planifier un vol"
}
```

Add equivalent keys in `messages/en.json`.

- [ ] **Step 2: Integrate EmptyState in each listing page**

For each page, read the file first, then find the "no data" rendering (usually a ternary checking `items.length === 0` or a conditional `<p>` tag). Replace with:

```tsx
import { EmptyState } from '@/components/empty-state'

// Replace the inline "no data" text with:
{
  items.length === 0 ? (
    <EmptyState
      message={t('noBillets')}
      actionLabel={t('createFirst')}
      actionHref={`/${locale}/billets/new`}
    />
  ) : (
    <Table>...</Table>
  )
}
```

Apply this pattern to all 7 listing pages. For each:

| Page      | message key | actionLabel key | actionHref                                |
| --------- | ----------- | --------------- | ----------------------------------------- |
| billets   | `noBillets` | `createFirst`   | `/${locale}/billets/new`                  |
| ballons   | `noResults` | `createFirst`   | `/${locale}/ballons/new`                  |
| pilotes   | `noResults` | `createFirst`   | `/${locale}/pilotes/new`                  |
| equipiers | `noEntries` | `createFirst`   | (no href -- inline form, omit actionHref) |
| vehicules | `noEntries` | `createFirst`   | (no href -- inline form, omit actionHref) |
| sites     | `noEntries` | `createFirst`   | (no href -- inline form, omit actionHref) |
| vols      | `noVols`    | `createFirst`   | `/${locale}/vols/create`                  |

For equipiers/vehicules/sites which have inline create forms, render `<EmptyState message={t('noEntries')} />` without a CTA button (the create form is already on the page).

For vols, the WeekGrid component handles the empty state internally. Read the WeekGrid to see how it renders "no vols" and replace that text with the EmptyState component, or add the EmptyState above/instead of the WeekGrid when there are zero vols.

- [ ] **Step 3: Build and verify**

```bash
npm run build
```

Check a few pages with empty data to verify the balloon SVG renders correctly.

- [ ] **Step 4: Commit**

```bash
git add components/empty-state.tsx "app/[locale]/(app)/billets/page.tsx" "app/[locale]/(app)/ballons/page.tsx" "app/[locale]/(app)/pilotes/page.tsx" "app/[locale]/(app)/equipiers/page.tsx" "app/[locale]/(app)/vehicules/page.tsx" "app/[locale]/(app)/sites/page.tsx" "app/[locale]/(app)/vols/page.tsx" messages/fr.json messages/en.json
git commit -m "feat(ui): integrate EmptyState component across all listing pages"
```

---

## Task 4: Dashboard — weather widget

**Files:**

- Modify: `app/[locale]/(app)/page.tsx`
- Modify: `messages/fr.json`
- Modify: `messages/en.json`

- [ ] **Step 1: Add i18n keys**

In `messages/fr.json` `home` section, add:

```json
"meteoAujourdhui": "Météo du jour",
"aucunVolAujourdhui": "Aucun vol prévu aujourd'hui",
"gpsNonConfigure": "Coordonnées GPS non configurées",
"volsConcernes": "{count} vol(s) concerné(s)",
"ventMax": "Vent max",
"tempMoy": "Temp. moy."
```

Add equivalents in `messages/en.json`.

- [ ] **Step 2: Add weather widget to dashboard**

In `app/[locale]/(app)/page.tsx`, after the stats cards section and before the "Prochains vols" table, add a weather card.

Read the file first to understand the existing data fetching. The dashboard already fetches `prochVols`. Add a weather fetch for today's vols:

```tsx
// After the existing queries, add:
const volsAujourdhui = prochVols.filter(
  (v) => v.date.toISOString().slice(0, 10) === today.toISOString().slice(0, 10),
)

let todayWeather = null
if (volsAujourdhui.length > 0 && exploitant.meteoLatitude && exploitant.meteoLongitude) {
  try {
    const todayStr = today.toISOString().slice(0, 10)
    const forecast = await getWeather({
      exploitantId: ctx.exploitantId,
      latitude: exploitant.meteoLatitude,
      longitude: exploitant.meteoLongitude,
      date: todayStr,
    })
    // Use MATIN for morning, SOIR for afternoon based on current time
    const creneau = new Date().getHours() < 14 ? 'MATIN' : 'SOIR'
    const hours = extractCreneauHours(forecast, creneau)
    todayWeather = summarizeWeather(hours, exploitant.meteoSeuilVent ?? 15)
  } catch {
    // Weather not available
  }
}
```

Then render the card:

```tsx
{
  /* Weather widget */
}
;<Card>
  <CardHeader className="pb-2">
    <CardTitle className="text-base">{t('meteoAujourdhui')}</CardTitle>
  </CardHeader>
  <CardContent>
    {!exploitant.meteoLatitude ? (
      <p className="text-sm text-muted-foreground">{t('gpsNonConfigure')}</p>
    ) : volsAujourdhui.length === 0 ? (
      <p className="text-sm text-muted-foreground">{t('aucunVolAujourdhui')}</p>
    ) : !todayWeather ? (
      <p className="text-sm text-muted-foreground">{tMeteo('noData')}</p>
    ) : (
      <div
        className={cn(
          'flex items-center justify-between rounded-lg px-4 py-3',
          todayWeather.level === 'OK' && 'bg-success/10 text-success',
          todayWeather.level === 'WARNING' && 'bg-warning/10 text-warning',
          todayWeather.level === 'DANGER' && 'bg-destructive/10 text-destructive',
        )}
      >
        <div>
          <span className="text-lg font-bold">
            {todayWeather.level === 'OK'
              ? 'Favorable'
              : todayWeather.level === 'WARNING'
                ? 'Prudence'
                : 'Défavorable'}
          </span>
          <p className="text-xs opacity-70">
            {t('volsConcernes', { count: volsAujourdhui.length })}
          </p>
        </div>
        <div className="flex gap-6 text-sm">
          <div className="text-center">
            <div className="font-semibold">{Math.round(todayWeather.maxWindKt)} km/h</div>
            <div className="text-xs opacity-70">{t('ventMax')}</div>
          </div>
          <div className="text-center">
            <div className="font-semibold">{Math.round(todayWeather.avgTemperature)}°C</div>
            <div className="text-xs opacity-70">{t('tempMoy')}</div>
          </div>
        </div>
      </div>
    )}
  </CardContent>
</Card>
```

Note: The dashboard page will need to import `getWeather`, `extractCreneauHours`, `summarizeWeather`, and `cn`. Also needs the exploitant's GPS coordinates -- read the existing page to see how the exploitant data is fetched and add `meteoLatitude`, `meteoLongitude`, `meteoSeuilVent` to the select if not already there.

- [ ] **Step 3: Build and verify**

```bash
npm run build
```

- [ ] **Step 4: Commit**

```bash
git add "app/[locale]/(app)/page.tsx" messages/fr.json messages/en.json
git commit -m "feat(ui): add weather widget to dashboard"
```

---

## Task 5: Dashboard — activity chart

**Files:**

- Modify: `app/[locale]/(app)/page.tsx`
- Modify: `messages/fr.json`
- Modify: `messages/en.json`

- [ ] **Step 1: Add i18n keys**

In `messages/fr.json` `home` section, add:

```json
"activite": "Activité des 4 dernières semaines",
"semaine": "S",
"cetteSemaine": "Cette sem.",
"volsCount": "{count} vol(s)"
```

Add equivalents in `messages/en.json`.

- [ ] **Step 2: Fetch weekly activity data**

In the dashboard page, add a query to group vols by week:

```tsx
const fourWeeksAgo = new Date(today)
fourWeeksAgo.setDate(today.getDate() - 28)

const recentVols = await db.vol.findMany({
  where: {
    date: { gte: fourWeeksAgo },
    statut: { not: 'ANNULE' },
  },
  select: { date: true, statut: true },
})

// Group by week (Mon-Sun)
function getWeekStart(d: Date): string {
  const date = new Date(d)
  const day = date.getDay()
  const diff = date.getDate() - day + (day === 0 ? -6 : 1)
  date.setDate(diff)
  return date.toISOString().slice(0, 10)
}

const weekMap = new Map<string, { done: number; planned: number }>()
for (const vol of recentVols) {
  const week = getWeekStart(vol.date)
  const entry = weekMap.get(week) ?? { done: 0, planned: 0 }
  if (vol.statut === 'TERMINE' || vol.statut === 'ARCHIVE') {
    entry.done++
  } else {
    entry.planned++
  }
  weekMap.set(week, entry)
}

// Sort weeks and take last 4
const weeks = [...weekMap.entries()].sort(([a], [b]) => a.localeCompare(b)).slice(-4)

const maxVols = Math.max(1, ...weeks.map(([, w]) => w.done + w.planned))
```

- [ ] **Step 3: Render the activity chart**

After the "Prochains vols" table card, add:

```tsx
{
  /* Activity chart */
}
;<Card>
  <CardHeader className="pb-2">
    <CardTitle className="text-base">{t('activite')}</CardTitle>
  </CardHeader>
  <CardContent>
    <div className="flex items-end justify-around gap-4 pt-4" style={{ height: 180 }}>
      {weeks.map(([weekStart, data], i) => {
        const total = data.done + data.planned
        const height = Math.round((total / maxVols) * 120)
        const doneHeight = Math.round((data.done / maxVols) * 120)
        const plannedHeight = height - doneHeight
        const label =
          i === weeks.length - 1 ? t('cetteSemaine') : `${t('semaine')}-${weeks.length - 1 - i}`
        return (
          <div key={weekStart} className="flex flex-col items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">{total}</span>
            <div className="flex w-12 flex-col items-stretch" style={{ height: 120 }}>
              <div className="flex-1" />
              {plannedHeight > 0 && (
                <div className="rounded-t bg-primary/30" style={{ height: plannedHeight }} />
              )}
              {doneHeight > 0 && (
                <div
                  className={cn('bg-primary', plannedHeight > 0 ? '' : 'rounded-t', 'rounded-b')}
                  style={{ height: doneHeight }}
                />
              )}
            </div>
            <span className="text-xs text-muted-foreground">{label}</span>
          </div>
        )
      })}
      {weeks.length === 0 && <p className="text-sm text-muted-foreground py-8">{t('aucunVol')}</p>}
    </div>
  </CardContent>
</Card>
```

- [ ] **Step 4: Build and verify**

```bash
npm run build
```

- [ ] **Step 5: Commit**

```bash
git add "app/[locale]/(app)/page.tsx" messages/fr.json messages/en.json
git commit -m "feat(ui): add weekly activity bar chart to dashboard"
```

---

## Task 6: Final build and cleanup

- [ ] **Step 1: Full build**

```bash
npm run build
```

- [ ] **Step 2: Run tests**

```bash
npm test
```

- [ ] **Step 3: Commit any remaining fixes**

```bash
git add -A
git commit -m "chore: final polish and cleanup"
```
