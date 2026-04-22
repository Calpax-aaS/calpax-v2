-- #4 — add encrypted columns for passager email + telephone alongside the
-- existing plaintext columns. A one-off backfill script (see
-- `scripts/backfill-passager-pii.ts`) must be run to populate the new
-- columns. Plaintext columns will be dropped in a follow-up migration
-- once the backfill is verified in production.

ALTER TABLE "passager"
  ADD COLUMN "emailEncrypted"     TEXT,
  ADD COLUMN "telephoneEncrypted" TEXT;
