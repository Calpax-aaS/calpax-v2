-- #67 follow-up to #4: drop the plaintext email/telephone columns on
-- Passager now that every row has been backfilled into emailEncrypted /
-- telephoneEncrypted (verified: zero rows with plaintext NOT NULL and
-- encrypted NULL before this deploy).
--
-- No DATA backfill in this migration — the backfill is performed by
-- scripts/backfill-passager-pii.ts in the preceding deploy window.

ALTER TABLE "passager" DROP COLUMN "email";
ALTER TABLE "passager" DROP COLUMN "telephone";
