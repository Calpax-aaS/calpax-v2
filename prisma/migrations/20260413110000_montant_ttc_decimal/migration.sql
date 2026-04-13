-- Convert montantTtc from double precision (Float) to numeric(10,2) (Decimal)
ALTER TABLE "billet" ALTER COLUMN "montantTtc" TYPE DECIMAL(10,2) USING "montantTtc"::DECIMAL(10,2);
ALTER TABLE "paiement" ALTER COLUMN "montantTtc" TYPE DECIMAL(10,2) USING "montantTtc"::DECIMAL(10,2);
