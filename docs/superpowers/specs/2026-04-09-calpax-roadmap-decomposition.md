# Calpax — Roadmap & Decomposition

**Date:** 2026-04-09
**Scope:** strategic decomposition of the Calpax v2 build into shippable milestones and sub-projects.
**Audience:** Damien (solo developer), informed by Olivier (Cameron Balloons France, FR.DEC.059) as client zéro.
**Status:** design agreed during brainstorming session on 2026-04-09. Each phase below will get its own spec → plan → implementation cycle.

---

## Context

Calpax v2 is a multi-tenant SaaS for commercial hot-air balloon operators (target: FR.DEC exploitants in France, then EU). It replaces a 20-year-old PHP/MySQL v1 still running in production at Cameron Balloons France (5+ ballons, ~4 000 billets historiques, ~2 965 paiements, ~11 800 passagers).

Stack: Next.js 15 + Prisma + Supabase (PostgreSQL) + NextAuth + Mollie + Leaflet/Open-Meteo/AVWX + Vercel. Multi-tenant via `tenant_id` on every row with Prisma middleware enforcement.

**Scope decision (2026-04-09):** public commercial launch (not private beta, not demo prototype). Full multi-tenant SaaS with subscription billing and external paying exploitants.

**Strategy decision (2026-04-09):** M1-first. Olivier replaces v1 internally at Cameron Balloons before any public booking is opened. Cameron Balloons is the de-risking dogfood of the whole product.

**Team:** solo developer (Damien). No parallelization — every phase is strictly sequential.

---

## V1 insights that shape the decomposition

Five insights from reading the v1 schema (`v1-reference/bdd/extract_bdd.sql`) and the critical PHP files (`create-ficheVol-pdf.php`, `view-billetvol.php`, `cron/cron-mail.php`) that are **not in** `BACKLOG.md` but are load-bearing for the domain model:

1. **Billet de vol ≠ Vol.** The billet is a customer-facing reservation with a *window of availability* (`typePlannif`: `matin` / `soir` / `touteLaJournée` / `auPlusVite` / `autre`, `dateVolDeb`, `dateVolFin`, `dateValidite`). The vol is the operational flight. Passengers get assigned from billets to vols later via `passager_vol` — when weather permits. This is a weather-deferred scheduling model, not a Calendly-style booking. **The MVP public booking UX must reflect this or it breaks the whole operational workflow.**

2. **Devis de masse is a temperature-dependent load chart**, not a simple sum of weights. Each ballon has a per-°C max payload table from 10°C to 34°C, referenced from its Manex annex. Example from `create-ficheVol-pdf.php` (F-HFCC, Z-105, 3000 m³): max payload at 20°C = 365 kg, at 30°C = 256 kg. The v2 `Ballon` entity must store this performance chart and the devis calc must pick the right row based on forecast OAT (or actual OAT at décollage).

3. **PVE and devis de masse are a single document in v1** — the "fiche de vol". Pre-printed before flight (passengers + devis + weather), filled and signed by the pilot after flight (décollage/atterrissage time/place, gaz conso, anomalies, VISA CDB). We keep this unified: one document, two lifecycle states (draft → signed archived PVE).

4. **Partial payments are the norm.** v1 has ~2 965 `paiement` rows for ~4 075 billets — many billets have multiple payment records (acompte + solde, chèque-vacances, avoir, refund). Mollie integration must support multi-payment per billet from day 1.

5. **Billets have multiple passenger roles** (`payeur`, `bénéficiaire`, `organisateur`, `destinataire`). Gift certificates are handled naturally by this model in v1 — not a separate feature. **Bons cadeaux move from V2 → included for free in M1** because the role model covers them.

**Plus:** v1 has `billetvol_audit`, `paiement_audit`, `passager_audit` tables tracking every change. Olivier relies on 15+ years of change history. v2 must preserve this pattern (Prisma middleware writing to generic audit table).

**Gaps in v1 that v2 must design from scratch** (no reference available):
- Multi-tenant isolation (v1 is single-tenant)
- Licence BFCL tracking + expiry alerts
- CAMO expiry tracking + alerts
- RGPD consent + droits interface
- Structured weather persistence (v1 scrapes HTML at flight time, no archive)
- Exploitant profile (FR.DEC number, SIRET, DPA)

---

## Milestone map

| Milestone | Goal | Contents | Relative size |
|-----------|------|----------|----------------|
| **M1** | Olivier replaces v1 internally at Cameron Balloons. First real flights operated through v2. | P0 Foundation + P1 Regulatory + P2 Flight lifecycle + Pw Weather minimum | **large — biggest single milestone by far** |
| **M2** | First external paying exploitant onboarded. Public SaaS launch. | P3 Public booking + Mollie + P-SaaS Landing/onboarding/billing | medium-large |
| **M3** | Operational UX polish: mobile pilote + dashboard jour J + pilot-driven PVE finalization | Moves manual PVE entry from back-office to pilot app | medium |
| **M4** | Full weather stack: METAR/TAF + radar + go/no-go aggregate table | AVWX or CheckWX + radar tiles + per-vol aggregated status | medium |
| **M5** | GPS live tracking (pilote + équipiers + public suivi) | HTML5 geoloc + WebSocket + Leaflet + public share links | medium-large |

**Rule: each milestone is independently shippable and each is a hard checkpoint.** M1 cannot start P2 before P1 is done. M2 cannot start before Olivier has run ≥5 real flights through M1 at Cameron Balloons. Weather stays tiered: minimum (Open-Meteo wind) in M1, full (METAR/TAF/radar) in M4.

---

## M1 — Cameron Balloons internal dogfood

### P0 — Foundation

**Goal:** scaffolding everything else depends on. Zero user-visible value, 100% risk reduction.

**In scope:**
- Next.js 15 app router + TypeScript strict + Tailwind + shadcn/ui
- Prisma + PostgreSQL (Supabase) + local docker-compose for dev
- NextAuth.js with email + credentials providers, session tied to `tenant_id`
- **Multi-tenant Prisma middleware** — every read/write injects `WHERE tenant_id = currentTenant()`. Query without a tenant context is an error.
- **Generic audit middleware** — reproduces v1's `*_audit` pattern. Single `audit_log` table with `(entity_type, entity_id, field, before, after, user_id, tenant_id, created_at)`.
- `lib/crypto` — symmetric encryption for poids passagers + coordonnées (RGPD art. 32)
- i18n FR + EN via `next-intl` (FR default, all user-facing strings in messages files from day 1 — retrofit is painful)
- Sentry + structured logging
- GitHub Actions CI (lint + type-check + unit tests + E2E smoke)
- Vercel preview deployments + Supabase staging branch
- Base domain entities (schema only, minimal CRUD): `Exploitant`, `User`, `Ballon`, `Pilote`, `Vol`, `Billet`, `Passager`, `Paiement`, `AuditLog`
- Tenant isolation integration tests (must be red-green on day 1, never merged without them)

**Out of scope:** any feature UI. P0 delivers the skeleton, not the product.

**Relative size:** small-medium. The temptation to skip rigor here is the #1 risk for the whole project.

### P1 — Regulatory back-office

**Goal:** the non-negotiable legal artefacts that must exist before any real flight is operated.

**In scope:**
- Exploitant profile: N° FR.DEC, SIRET, N° CAMO, adresse, contact, logo — displayed on all generated documents
- **Ballon fiche with performance chart**: immat, nom, volume, MTOM, MLM, pesée à vide, config gaz, Manex annex ref, and a `performanceChart: Record<temperatureCelsius, maxPayloadKg>` JSON field. Temperature range 10°C → 34°C minimum (matches v1). Seed values for Cameron Balloons' 8 ballons extracted from `create-ficheVol-pdf.php` lines 47–622.
- Ballon CAMO expiry date + alerts at 60j and 30j (notification + blocking flag)
- **Pilote BFCL licence**: licence number, qualification vol commercial passagers flag, date expiration, classes ballon autorisées, heures de vol
- Licence alerts at 90j and 30j + blocking flag ("cannot assign pilot with expired licence to a vol" enforced in the vol creation path)
- RGPD v1: politique confidentialité statique, consentement horodaté sur formulaire de réservation, chiffrement poids passagers (using `lib/crypto` from P0), interface droits d'accès/rectification/effacement/portabilité (traitement sous 30j)

**Out of scope:** DPA e-sign flow (moves to P-SaaS), consentement public-facing (moves to P3 when public booking exists), PNR directive handling (deferred — likely hors champ for montgolfières, confirm with DSAC later).

**Relative size:** small-medium. Mostly CRUD + cron job for alerts + crypto plumbing.

### P2 — Back-office flight lifecycle

**Goal:** reproduce Olivier's v1 workflow end-to-end. Billet → Vol → organisation passagers → fiche de vol printed → signed → archived as PVE.

**In scope:**
- Billet de vol CRUD (back-office only — no public form yet): `typePlannif`, window (`dateVolDeb` → `dateVolFin`), `dateValidite` (important for bons cadeaux), roles (`payeur`, `bénéficiaire`, `organisateur`), reference + checksum, `dateRappel`, statuts, categorie, provenance, commentaire
- **Multiple passengers per billet** with individual weights, age, PMR flag, contact
- **Partial payments per billet**: multi-row, modes (cash/chèque/CB/virement/chèque-vacances/avoir), refunds, audit
- Email reminder cron (v1's `cron-mail.php` equivalent — daily scan of `dateRappel = today`, email to exploitant)
- Planning vols (FullCalendar-style view): create vol = ballon + pilote + équipier + véhicule + gaz + créneau (matin/soir) + lieu décollage
- Pilote + ballon validity checks enforced at vol creation (reject if licence expired or ballon CAMO expired)
- **Organisation vol** (assign billets → vol) — the critical v1 bridge step. UI that shows billets waiting for the selected `typePlannif` window and lets you pull them into a specific vol.
- **Fiche de vol PDF generator** (the core regulatory artefact):
  - Header with exploitant name + N° FR.DEC + ballon name + immat + date + créneau
  - Devis de masse table (temperature-aware, picks correct column from ballon performance chart, uses forecast OAT from Pw weather)
  - Total weight (pilote + passagers + équipement + gaz) + remaining margin check
  - Passenger list (nom, âge, poids, PMR, billet reference) grouped by billet
  - Weather page (embedded from Pw)
  - VISA CDB + compte-rendu blocks (décollage lieu/heure, atterrissage lieu/heure, gaz conso, anomalies, signature) — blank for pilot to fill on paper
- **Post-flight PVE finalization** (manual data entry form): Olivier enters décollage/atterrissage/gaz/anomalies from the signed paper fiche → system generates final signed PDF, archives, updates vol status
- Journal de bord ballon (carnet de route numérique per vol — essentially a filtered view of `vol` records with ballon scope)
- Audit trail UI (surface the generic `audit_log` per entity like v1's `log-modif.php`)

**Out of scope:** pilote mobile app (M3), weather beyond Pw, annulation workflow beyond manual status change (M3), gift certificate emission UI (can wait — the data model supports it, we add UI when needed).

**Relative size:** **large — biggest phase of the whole project**. Contains the fiche de vol PDF generator and the temperature-aware devis de masse calc, which are the most regulatory-sensitive pieces of code in Calpax.

**Critical tests (non-negotiable TDD):**
- Devis de masse calculation must have test vectors extracted from `create-ficheVol-pdf.php` for all 8 Cameron Balloons ballons. A bug here can ground a flight or overload a ballon.
- Fiche de vol PDF golden-file snapshot tests.
- Multi-tenant isolation on every query path.

### Pw — Weather minimum

**Goal:** enough weather data to render the fiche de vol weather page and make go/no-go decisions. Not the full weather stack.

**In scope:**
- Open-Meteo API integration (free, no key)
- Fetch per vol: wind speed + direction at 10 m, 80 m, 120 m, 300 m AGL, hourly, for the vol date
- Fetch OAT forecast for the décollage hour (used by devis de masse to pick the temperature column)
- Per-exploitant configurable wind threshold (default 15 kt) for go/no-go classification
- Rendered into fiche de vol PDF as an embedded weather page (reproduces v1's `meteo-ficheVol-pdf.php` layout)
- Manual refresh button in back-office

**Out of scope:** METAR/TAF, radar pluie, go/no-go aggregate table per vol, alertes météo automatiques, historique météo archivé → M4 and later.

**Relative size:** small. Open-Meteo is trivial. Most of the work is PDF templating.

---

## M2 — Public SaaS launch

### P3 — Public booking + Mollie

**Goal:** external exploitants can take online bookings with Mollie payments and issue billets.

**In scope:**
- Public page réservation per exploitant (white-labeled with logo + couleurs)
- Booking UX that reflects the v1 model: user picks `typePlannif` (matin/soir/anytime/specific date), window (date start/end), number of passengers, passenger details (nom, age, poids, PMR, consentement RGPD)
- Mollie Checkout integration + 3DS v2 for all payments > 30€
- **Partial payments supported from day 1** (acompte now / solde later)
- Mollie webhook handling → update `Paiement` + `Billet` status
- Facturation PDF automatique (N° SIRET, TVA, HT/TTC, N° FR.DEC) after each payment
- Billet numérique PDF + QR code envoyé par email à la confirmation (lieu RDV, CGV, contact)
- Politique confidentialité publique + case consentement non pré-cochée + traçabilité horodatée
- Workflow annulation météo back-office: annulation → email notification passagers → report ou remboursement Mollie
- Rate limiting on public endpoints

**Out of scope:** portail passager autonome (V2), bons cadeaux UI (data model already supports; UI is later), notifications SMS (V2).

**Relative size:** medium-large.

### P-SaaS — Landing, onboarding, billing

**Goal:** SaaS plumbing so new exploitants can sign up, pay their subscription, and start using Calpax.

**In scope:**
- Landing page (marketing site, FR/EN, features + pricing + screenshots + contact)
- Onboarding flow: sign up → choose plan (Starter 79€ / Pro 149€ / Expert 249€) → Mollie subscription setup → create exploitant profile → seed data (first ballon, first pilote, DPA signing) → redirect to back-office
- Mollie subscription management (recurring billing, trial period if any, plan upgrade/downgrade, cancellation)
- DPA (Data Processing Agreement art. 28) e-sign flow — HTML templated document + signature + timestamp + PDF archive per exploitant
- Billing portal (view invoices, update payment method, cancel subscription)
- Calpax internal admin (super-admin view of all tenants, their status, subscription state, usage metrics, support actions — scoped behind a separate role)
- Email onboarding sequence (welcome, getting started, first vol tips)

**Out of scope:** revendeurs portal, marque blanche complète avec custom domain, marketplace connectors → later.

**Relative size:** medium.

**Launch gate before M2:** Olivier must have operated ≥5 real flights through M1 at Cameron Balloons. Any P2 bug discovered during dogfood must be fixed before M2 starts.

---

## Fast follows (post-M2, in strict priority order)

### M3 — Day-of operations + pilote mobile
- Dashboard jour J (vols du jour, passagers confirmés, poids total, devis, équipe, méteo)
- Vue pilote mobile (responsive, read-only): vols assignés, liste passagers, météo, lieu décollage
- Validation vol par pilote (pilot-driven PVE finalization from mobile instead of manual back-office entry) → replaces P2's manual entry path for exploitants that want it
- Workflow annulation météo amélioré avec notifications automatiques email

### M4 — Full weather stack
- METAR/TAF décodés via AVWX ou CheckWX (aéroports dans 50 km, codes OACI configurables, refresh 30 min)
- Radar pluie et orages temps réel (3 h passées + 2 h prévision, 50 km autour du site)
- Tableau go/no-go agrégé par vol (feu vert/orange/rouge combinant wind + METAR + TAF + radar)
- Alertes météo automatiques si dégradation prévue dans 3 h avant un vol planifié
- Archivage conditions météo par vol (audit DSAC)

### M5 — GPS live tracking
- HTML5 Geolocation depuis smartphone pilote (WebSocket → serveur)
- Leaflet + OpenStreetMap live map dans back-office
- Vue équipiers sol (lien sécurisé, pas d'app, temps réel)
- Lien public de suivi live envoyé aux proches des passagers (pas d'inscription, page publique)
- Trace parcours + vitesse + cap + altitude (live, pas de replay — replay est V2)

---

## What is deliberately NOT in the M1–M5 plan

Features from `BACKLOG.md` that are deferred beyond M5 or removed entirely:

**V2 (later features kept in backlog but not scheduled):**
- Portail passager autonome
- Certificat d'ascension souvenir
- Carnet de vol pilote personnel
- Checklist sécurité pré-vol digitale (BOP.BAS.190)
- Suivi récence pilotes BFCL.160
- Profil équipiers sol formalisé
- Suivi incidents / DSAC
- Bons cadeaux UI (data model is ready in M1, UI comes with demand)
- Portail partenaires / revendeurs
- Estimation zone d'atterrissage calculée
- Replay parcours GPS
- Export GPX/KML

**Plus tard (parked, not promised):**
- Statistiques et reporting dashboard
- API publique + widgets embarquables
- Tracker GPS hardware nacelle
- Gestion affrètement inter-exploitants
- Marque blanche complète avec domaine
- Internationalisation DE/ES/IT/NL (FR + EN only in MVP)
- Connecteurs marketplaces (Sport Découverte, coffrets cadeaux)
- Interface UIP directive PNR (conditional — validate non-applicability with DSAC first)

**Removed from scope entirely:** none — nothing in `BACKLOG.md` is dropped, everything is either scheduled or explicitly parked.

---

## Dependencies & ordering (solo dev)

```
P0 ──► P1 ──► P2 ──► Pw ──► M1 dogfood ──► P3 ──► P-SaaS ──► M2 launch ──► M3 ──► M4 ──► M5
       (Pw can start in parallel with late P2 if Pw scope is stable — otherwise strict)
```

Strict sequencing for solo dev. No parallel tracks. Exception: Pw can technically start while late P2 is being built since the only coupling is the PDF template. If either phase wobbles, fall back to strict order.

**Hard gates** (no phase starts before the previous one is complete AND verified):
- P0 gate: multi-tenant isolation tests passing, audit middleware tested, crypto lib tested
- P1 gate: all regulatory alerts working, BFCL/CAMO expiry blocks proven via tests
- P2 gate: fiche de vol PDF golden-file tests passing for all 8 Cameron Balloons ballons, devis de masse test vectors passing
- Pw gate: weather page renders correctly in a real fiche de vol PDF
- M1 gate: **≥5 real flights operated through v2 at Cameron Balloons with Olivier**
- P3 gate: Mollie 3DS + partial payments + webhook handling tested end-to-end
- P-SaaS gate: onboarding flow runs end-to-end for a new exploitant, subscription billing verified, DPA signed
- M2 gate: first external exploitant onboarded and operating

---

## Process: each phase is its own spec cycle

This roadmap is a **decomposition document**, not a per-phase spec. Each phase below will go through the standard superpowers workflow when it's time to build it:

1. **Brainstorming** — refine the phase's design in dialogue with the user
2. **Writing-plans** — produce an executable implementation plan
3. **Executing-plans** — TDD implementation with review checkpoints
4. **Verification** — tests, self-review, requesting-code-review
5. **Finishing** — merge / deploy / move to next phase

Phases are small enough that each spec should be 1–3 pages, not a monolith.

---

## Next step

Brainstorm **P0 — Foundation**. This is the smallest, clearest, and most unblocking phase. Output will be `docs/superpowers/specs/2026-04-09-p0-foundation-design.md`, followed by a writing-plans pass.

Until P0 is complete, no feature work happens. Resist the urge.
