# Technical Debt

Items to address before or during P1. Each entry has a severity and a proposed fix.

---

## TD-001: NODE_TLS_REJECT_UNAUTHORIZED=0 on Vercel

**Status:** RESOLVED (2026-04-13)

Supabase CA cert stored in `SUPABASE_CA_CERT` env var. Pool uses `rejectUnauthorized: true` + `ca: cert`. `NODE_TLS_REJECT_UNAUTHORIZED=0` removed from Vercel.

---

## TD-002: react-pdf SectionTitle single-string child constraint

**Severity:** LOW — cosmetic workaround, no functional impact.

**Context:** The `SectionTitle` component in react-pdf/renderer requires its child to be a single string. Passing JSX children or concatenated expressions causes a runtime error. Worked around by using template literals everywhere a dynamic string is needed inside SectionTitle.

**Proposed fix:** Either accept a `text` prop instead of `children`, or use a `<Text>` wrapper that is always a string. Document the constraint in the component's JSX comment.

**When:** Next PDF component refactor.

**Added:** 2026-04-11

---

## TD-003: Paiement.montant stored as Float

**Severity:** LOW (downgraded) — acceptable for current scale.

**Context:** The `Paiement` and `Billet` models store `montantTtc` as Prisma `Float` (PostgreSQL `double precision`). Amounts are in EUR (not centimes). For balloon operator transactions (150-1200 EUR), Float64 precision (15 significant digits) means rounding errors only appear above ~10M EUR — well beyond our scale.

**Decision:** Keep Float for now. Migrate to `Decimal` before Mollie integration (P3) where precise payment reconciliation matters. The migration is mechanical (schema + cast all arithmetic to Decimal) but invasive (every file that does montant arithmetic needs updating).

**When:** Before Mollie integration (P3).

**Added:** 2026-04-11

---

## TD-004: Equipier, Vehicule, SiteDecollage as entities

**Status:** RESOLVED (2026-04-13)

Created 3 formal entities (Equipier, Vehicule, SiteDecollage) with CRUD pages.
Vol now uses FK references + "Autre" free-text fallback for each.
Seeded with Cameron Balloons data (2 equipiers, 2 vehicules, 3 sites).

---

## TD-005: PDF meteo page is a placeholder

**Status:** RESOLVED (Pw — 2026-04-12)

Open-Meteo data now renders on PDF page 3 with colored wind table + summary banner.

**Added:** 2026-04-11

---

## TD-006: Billet reference prefix "CBF" is hardcoded

**Status:** RESOLVED (2026-04-13)

Added `billetPrefix` field to Exploitant model. Reference generator reads from exploitant settings with fallback to first 3 chars of name. Configurable in Settings page.

**Added:** 2026-04-11
