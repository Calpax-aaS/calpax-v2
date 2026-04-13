-- TD-004: Formalize Equipier, Vehicule, SiteDecollage as entities
-- Manual migration with data preservation

-- Create new tables
CREATE TABLE "equipier" (
  "id" TEXT NOT NULL,
  "exploitantId" TEXT NOT NULL,
  "prenom" TEXT NOT NULL,
  "nom" TEXT NOT NULL,
  "telephone" TEXT,
  "actif" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "equipier_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "equipier_exploitantId_fkey" FOREIGN KEY ("exploitantId") REFERENCES "exploitant"("id") ON DELETE CASCADE
);
CREATE INDEX "equipier_exploitantId_idx" ON "equipier"("exploitantId");

CREATE TABLE "vehicule" (
  "id" TEXT NOT NULL,
  "exploitantId" TEXT NOT NULL,
  "nom" TEXT NOT NULL,
  "immatriculation" TEXT,
  "actif" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "vehicule_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "vehicule_exploitantId_fkey" FOREIGN KEY ("exploitantId") REFERENCES "exploitant"("id") ON DELETE CASCADE
);
CREATE INDEX "vehicule_exploitantId_idx" ON "vehicule"("exploitantId");

CREATE TABLE "site_decollage" (
  "id" TEXT NOT NULL,
  "exploitantId" TEXT NOT NULL,
  "nom" TEXT NOT NULL,
  "adresse" TEXT,
  "latitude" DOUBLE PRECISION,
  "longitude" DOUBLE PRECISION,
  "notes" TEXT,
  "actif" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "site_decollage_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "site_decollage_exploitantId_fkey" FOREIGN KEY ("exploitantId") REFERENCES "exploitant"("id") ON DELETE CASCADE
);
CREATE INDEX "site_decollage_exploitantId_idx" ON "site_decollage"("exploitantId");

-- Add new columns to vol
ALTER TABLE "vol" ADD COLUMN "equipierId" TEXT;
ALTER TABLE "vol" ADD COLUMN "equipierAutre" TEXT;
ALTER TABLE "vol" ADD COLUMN "vehiculeId" TEXT;
ALTER TABLE "vol" ADD COLUMN "vehiculeAutre" TEXT;
ALTER TABLE "vol" ADD COLUMN "siteDecollageId" TEXT;
ALTER TABLE "vol" ADD COLUMN "lieuDecollageAutre" TEXT;

-- Migrate existing data: copy old text values to *Autre fields
UPDATE "vol" SET "equipierAutre" = "equipier" WHERE "equipier" IS NOT NULL;
UPDATE "vol" SET "vehiculeAutre" = "vehicule" WHERE "vehicule" IS NOT NULL;
UPDATE "vol" SET "lieuDecollageAutre" = "lieuDecollage" WHERE "lieuDecollage" IS NOT NULL;

-- Drop old columns
ALTER TABLE "vol" DROP COLUMN "equipier";
ALTER TABLE "vol" DROP COLUMN "vehicule";
ALTER TABLE "vol" DROP COLUMN "lieuDecollage";

-- Add FK constraints
ALTER TABLE "vol" ADD CONSTRAINT "vol_equipierId_fkey" FOREIGN KEY ("equipierId") REFERENCES "equipier"("id") ON DELETE SET NULL;
ALTER TABLE "vol" ADD CONSTRAINT "vol_vehiculeId_fkey" FOREIGN KEY ("vehiculeId") REFERENCES "vehicule"("id") ON DELETE SET NULL;
ALTER TABLE "vol" ADD CONSTRAINT "vol_siteDecollageId_fkey" FOREIGN KEY ("siteDecollageId") REFERENCES "site_decollage"("id") ON DELETE SET NULL;
