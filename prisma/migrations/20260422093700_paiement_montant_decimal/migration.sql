-- Migrate `paiement.montantTtc` from DOUBLE PRECISION (Float) to NUMERIC(10, 2)
-- to match `billet.montantTtc` and remove any rounding drift before the
-- Mollie payment reconciliation work. Existing Float values (2-decimal EUR
-- amounts under 10M) cast losslessly.

ALTER TABLE "paiement"
  ALTER COLUMN "montantTtc" SET DATA TYPE DECIMAL(10, 2) USING "montantTtc"::DECIMAL(10, 2);
