-- CreateEnum
CREATE TYPE "StatutVol" AS ENUM ('PLANIFIE', 'CONFIRME', 'TERMINE', 'ARCHIVE', 'ANNULE');

-- CreateEnum
CREATE TYPE "Creneau" AS ENUM ('MATIN', 'SOIR');

-- AlterTable
ALTER TABLE "passager" ADD COLUMN     "volId" TEXT;

-- CreateTable
CREATE TABLE "vol" (
    "id" TEXT NOT NULL,
    "exploitantId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "creneau" "Creneau" NOT NULL,
    "statut" "StatutVol" NOT NULL DEFAULT 'PLANIFIE',
    "ballonId" TEXT NOT NULL,
    "piloteId" TEXT NOT NULL,
    "equipier" TEXT,
    "vehicule" TEXT,
    "configGaz" TEXT,
    "qteGaz" INTEGER,
    "lieuDecollage" TEXT,
    "decoLieu" TEXT,
    "decoHeure" TIMESTAMP(3),
    "atterLieu" TEXT,
    "atterHeure" TIMESTAMP(3),
    "distance" INTEGER,
    "gasConso" INTEGER,
    "anomalies" TEXT,
    "noteDansCarnet" BOOLEAN NOT NULL DEFAULT false,
    "pvePdfUrl" TEXT,
    "pveArchivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vol_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "vol_exploitantId_idx" ON "vol"("exploitantId");

-- CreateIndex
CREATE INDEX "vol_exploitantId_date_idx" ON "vol"("exploitantId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "vol_exploitantId_date_creneau_ballonId_key" ON "vol"("exploitantId", "date", "creneau", "ballonId");

-- CreateIndex
CREATE INDEX "passager_volId_idx" ON "passager"("volId");

-- AddForeignKey
ALTER TABLE "passager" ADD CONSTRAINT "passager_volId_fkey" FOREIGN KEY ("volId") REFERENCES "vol"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vol" ADD CONSTRAINT "vol_exploitantId_fkey" FOREIGN KEY ("exploitantId") REFERENCES "exploitant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vol" ADD CONSTRAINT "vol_ballonId_fkey" FOREIGN KEY ("ballonId") REFERENCES "ballon"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vol" ADD CONSTRAINT "vol_piloteId_fkey" FOREIGN KEY ("piloteId") REFERENCES "pilote"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
