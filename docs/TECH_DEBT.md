# Technical Debt

Items to address before or during P1. Each entry has a severity and a proposed fix.

---

## TD-001: NODE_TLS_REJECT_UNAUTHORIZED=0 on Vercel

**Severity:** HIGH — disables TLS certificate verification for ALL outbound connections from the Vercel runtime, not just Supabase.

**Context:** Supabase's pooler certificate chain is rejected by Node.js on Vercel with "self-signed certificate in certificate chain". The `pg.Pool` config `ssl: { rejectUnauthorized: false }` should scope the bypass to Postgres only, but Prisma v7's adapter-pg doesn't fully respect it. Added `NODE_TLS_REJECT_UNAUTHORIZED=0` as a Vercel env var to unblock P0 deployment.

**Proposed fix:** Remove the env var and instead:

1. Download Supabase's CA certificate from the Supabase dashboard (Settings > Database > SSL > Download Certificate)
2. Pass it to the `pg.Pool` via `ssl: { ca: fs.readFileSync('supabase-ca.crt').toString() }`
3. Or upgrade to a Prisma/adapter-pg version that properly passes SSL config through

**When:** Start of P1, before any real passenger data flows through the system.

**Added:** 2026-04-11

---

## TD-002: react-pdf SectionTitle single-string child constraint

**Severity:** LOW — cosmetic workaround, no functional impact.

**Context:** The `SectionTitle` component in react-pdf/renderer requires its child to be a single string. Passing JSX children or concatenated expressions causes a runtime error. Worked around by using template literals everywhere a dynamic string is needed inside SectionTitle.

**Proposed fix:** Either accept a `text` prop instead of `children`, or use a `<Text>` wrapper that is always a string. Document the constraint in the component's JSX comment.

**When:** Next PDF component refactor.

**Added:** 2026-04-11

---

## TD-003: Paiement.montant stored as Float

**Severity:** MEDIUM — floating-point arithmetic is unsuitable for financial calculations (rounding errors accumulate).

**Context:** The `Paiement` model stores `montant` as a Prisma `Float` (PostgreSQL `double precision`). All current amounts are in EUR cents represented as decimals, but Float cannot represent all decimal values exactly.

**Proposed fix:** Migrate `montant` to `Decimal` (PostgreSQL `numeric`) and use the Prisma `Decimal` scalar. Update all arithmetic in business logic to use a decimal library (e.g., `decimal.js`).

**When:** Before any real financial transactions flow through the system (before Mollie integration).

**Added:** 2026-04-11

---

## TD-004: Equipier and Vehicule are free-text fields on Vol

**Severity:** LOW — sufficient for Olivier's current workflow but not scalable.

**Context:** The `Vol` model stores `equipier` and `vehicule` as plain strings. If Olivier needs to track crew assignments across multiple vols, manage availability, or generate crew-facing documents, these need to be proper entities with their own profiles.

**Proposed fix:** Create `Equipier` and `Vehicule` entities linked to `Exploitant`, and replace the string fields on `Vol` with foreign keys. Gate behind a feature flag if not immediately needed.

**When:** P3 or when Olivier explicitly requests crew management.

**Added:** 2026-04-11

---

## TD-005: PDF meteo page is a placeholder

**Severity:** LOW — PVE is functional without it; meteo data is a nice-to-have on the PDF.

**Context:** The meteo section of the PVE PDF renders a static placeholder. It needs to be connected to the Open-Meteo / AVWX data fetched at flight time and archived alongside the PVE.

**Proposed fix:** At vol validation time, fetch and snapshot the relevant meteo data (wind profile, METAR, go/no-go status) and store it on the `Vol` record. The PVE PDF generator then reads from that snapshot.

**When:** After meteo integration (P3 weather feature).

**Added:** 2026-04-11

---

## TD-006: Billet reference prefix "CBF" is hardcoded

**Severity:** MEDIUM — blocks multi-tenant correctness; all exploitants would share the same prefix.

**Context:** The reference generator in `BilletSequence` uses the hardcoded prefix `CBF` (Cameron Balloons France). This is fine for the single-tenant pilot phase with Olivier but will produce incorrect references for any other exploitant.

**Proposed fix:** Add a `referencePrefix` field (3-4 chars) to the `Exploitant` model, defaulting to a derivation of the company name. Use it in the reference generator instead of the hardcoded value.

**When:** Before onboarding a second exploitant (P-SaaS).

**Added:** 2026-04-11
