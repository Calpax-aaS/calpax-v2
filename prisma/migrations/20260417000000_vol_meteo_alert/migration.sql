-- M3: Weather alert flag and cancellation reason
ALTER TABLE "vol" ADD COLUMN "meteoAlert" BOOLEAN DEFAULT false NOT NULL;
ALTER TABLE "vol" ADD COLUMN "cancelReason" TEXT;
