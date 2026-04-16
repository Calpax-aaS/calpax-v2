# M3 — Day-of Operations + Pilote Mobile

**Date:** 2026-04-17
**Scope:** M3 milestone — operational day tooling for Cameron Balloons France dogfood (gate M1: ≥5 real flights)
**Architecture:** Extend existing pages with responsive mobile-first CSS + role-based filtering. No new route groups. Same codebase serves desktop and mobile.

---

## Decisions

| #   | Question                 | Decision                                                                                                                                                                            |
| --- | ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Scope                    | Full M3: A (dashboard jour J) + B (pilote mobile) + C (PVE mobile) + D (annulation météo)                                                                                           |
| 2   | Mobile roles             | All roles use the same interface. PILOTE filtered on `piloteId`, EQUIPIER sees all vols (no User→Equipier link yet, same as GERANT), GERANT/ADMIN_CALPAX unfiltered (tenant-scoped) |
| 3   | Dashboard jour J content | Vols du jour + météo par créneau + devis de masse par vol + alertes CAMO/BFCL                                                                                                       |
| 4   | Cancellation workflow    | Auto-suggestion (weather cron flags vols exceeding wind threshold) + manual confirmation. Email notification to payeur + pilote + équipier                                          |
| 5   | Post-vol mobile          | Wizard 3 steps (décollage → atterrissage → compte-rendu)                                                                                                                            |
| 6   | Architecture             | Option A — extend existing pages, no route duplication                                                                                                                              |

---

## A — Dashboard jour J

**File:** `app/[locale]/(app)/page.tsx` — complete rewrite of current dashboard.

### Layout

- **Header:** "Vols du jour — [date formatted]" + badge with flight count
- **Alert banner:** CAMO/BFCL alerts filtered to balloons and pilots assigned today only (not all alerts)
- **Flight cards** (stacked mobile, 2-col grid desktop): one card per vol with:
  - Créneau (matin/soir) + ballon + pilote + équipier + site décollage
  - Passengers confirmed / max capacity (e.g. "4/6")
  - Mass budget summary: total passenger weight vs max payload at forecast OAT, green/orange/red badge
  - Weather summary: max wind, OAT, go/no-go indicator
  - Vol status (PLANIFIE / CONFIRME / TERMINE / ARCHIVE)
  - Quick actions: "Organiser" (if PLANIFIE), "Détail", "Annuler"
- **Weather section:** weather widget per créneau (matin/soir), reuses existing WeatherTable component
- **Empty state:** "Aucun vol aujourd'hui" + link to weekly planning

### Data

```
db.vol.findMany({
  where: {
    date: today,
    statut: { not: 'ANNULE' },
    // Role filtering:
    // PILOTE: piloteId = ctx.userId
    // EQUIPIER: no User→Equipier link yet, sees all vols (same as GERANT)
    // GERANT/ADMIN: no additional filter (tenant-scoped)
  },
  include: {
    ballon: true,
    pilote: true,
    equipier: true,
    siteDecollage: true,
    passagers: true,
  },
})
```

Weather cache fetched per (exploitantId, date) — existing `getWeather()` call.

Mass budget: use existing `buildDevisMasse()` logic with ballon performance chart + forecast OAT.

---

## B — Vue pilote mobile (responsive existing pages)

### Planning vols (`/vols`)

- **Mobile (< md):** list mode — stack of flight cards (same card component as dashboard jour J). No week grid.
- **Desktop (≥ md):** existing week grid, unchanged.
- Toggle automatic via CSS breakpoint, no user toggle needed.
- Role filtering applied in query (same logic as dashboard).

### Détail vol (`/vols/[id]`)

- Make responsive: stack info sections vertically on mobile instead of 2-col grid.
- Passenger list: replace HTML table with stacked cards on mobile (name + weight per card).
- Weather + devis de masse: already rendered, verify mobile layout.
- **Sticky CTA on mobile:** when vol is CONFIRME, show a fixed bottom bar with "Remplir le post-vol" button (full width, prominent).

### Organiser (`/vols/[id]/organiser`)

- Access restricted to GERANT + ADMIN_CALPAX (already the case).
- Layout already stacks on mobile (`lg:grid-cols-[1fr_2fr]`). No changes needed.

### No new routes

All improvements are CSS + query changes on existing pages.

---

## C — Post-vol wizard mobile

**File:** `app/[locale]/(app)/vols/[id]/post-vol/page.tsx` — rewrite `PostVolForm` as a 3-step wizard (new client component, same route).

### Step 1 — Décollage

- Lieu de décollage: text input, pre-filled from `vol.siteDecollage.nom`, editable
- Heure de décollage: `time` input
- Button: "Suivant"

### Step 2 — Atterrissage

- Lieu d'atterrissage: text input (free text)
- Heure d'atterrissage: `time` input
- Consommation gaz: number input (unit from `ballon.configGaz`)
- Distance estimée: number input (km, optional)
- Buttons: "Retour" / "Suivant"

### Step 3 — Compte-rendu

- Anomalies: textarea (optional)
- Noter dans carnet de bord: toggle (default: true)
- Read-only summary of steps 1+2
- Buttons: "Retour" / **"Valider le vol"**

### Behavior

- Submit calls existing `savePostFlight()` server action (already allows PILOTE role)
- Vol transitions: CONFIRME → TERMINE
- Redirect to vol detail page
- Toast success via `t('saveSuccess')` or similar

### Mobile UX

- Progress indicator at top: 3 dots (active / done / upcoming)
- Large touch-friendly inputs (`text-lg`, full-width)
- Buttons full-width at bottom of screen
- No horizontal scroll, fully stacked layout

### Permissions

Accessible to: ADMIN_CALPAX, GERANT, PILOTE (already enforced in `requireRole` within `savePostFlight()`).

---

## D — Annulation météo (suggestion + notifications)

### Weather alert cron

**New endpoint:** `app/api/cron/meteo-alert/route.ts`

- **Schedule:** every 30 min from 03:00 to 18:00 UTC. Checks all vols for today regardless of créneau. Configured via Vercel Cron (`vercel.json`).
- **Logic:** for each vol with status PLANIFIE or CONFIRME on today's date:
  1. Fetch weather via existing `getWeather()` (cached)
  2. Compare max wind for the vol's créneau vs `exploitant.meteoSeuilVent`
  3. If wind > threshold: set `vol.meteoAlert = true`
  4. If wind ≤ threshold and `meteoAlert` was true: reset to `false`
- Protected by `CRON_SECRET` header (existing pattern from `rappels.ts`).

### Alert display

- **Dashboard jour J:** orange banner on the flight card: "Vent prévu au-dessus du seuil — Annuler ce vol ?"
- **Vol detail page:** same orange banner at top
- Banner includes a "Annuler (météo)" button → triggers cancellation flow

### Cancellation flow

- User confirms via `confirm()` dialog
- Calls `cancelVol()` (existing) with new `reason` parameter set to `"Météo"`
- Vol status → `ANNULE`
- Passengers unassigned (existing behavior)
- Triggers email notifications (new)

### Email notifications

Three new Resend email templates in `lib/email/cancellation.ts`:

1. **Payeur/organisateur:** "Votre vol du [date] a été annulé pour raison météo. Nous vous recontacterons pour reprogrammer."
2. **Pilote assigné:** "Le vol [ballon] du [date] [créneau] a été annulé (météo)."
3. **Équipier assigné:** "Le vol [ballon] du [date] [créneau] a été annulé (météo)."

Pilote/équipier emails are only sent if they are different from the user performing the cancellation (avoid self-notification).

Emails sent via Resend (existing setup). If Resend not configured, `console.warn` with the message content (existing pattern).

### Schema changes

Two new fields on `Vol` model:

```prisma
model Vol {
  // ... existing fields ...
  meteoAlert   Boolean @default(false)
  cancelReason String?
}
```

Migration: `ALTER TABLE vol ADD COLUMN "meteoAlert" BOOLEAN DEFAULT false; ALTER TABLE vol ADD COLUMN "cancelReason" TEXT;`

---

## Testing strategy

### Unit tests

- Mass budget calculation on dashboard (existing test vectors, new rendering context)
- Weather alert threshold comparison logic (extracted to pure function)
- Email template rendering (snapshot or string match)

### Integration tests

- Role-based vol filtering: PILOTE sees only assigned vols, EQUIPIER/GERANT see all tenant vols
- `meteoAlert` cron logic: flag set when wind > threshold, cleared when wind ≤ threshold
- `cancelVol` with reason propagates to `cancelReason` field

### E2E tests

- Dashboard jour J renders flight cards for today's vols
- Post-vol wizard: navigate 3 steps, submit, verify vol status changes to TERMINE

---

## Out of scope

- GPS tracking / geolocation (M5)
- Auto-timestamping "Décollé" / "Posé" buttons (deferred to M5 when map is available)
- PWA / offline support
- SMS notifications
- Automatic cancellation without manual confirmation
- Weather radar / METAR/TAF (M4)
- Portail passager / public booking (M2)
