-- AlterTable
ALTER TABLE "exploitant" ADD COLUMN     "adresse" TEXT,
ADD COLUMN     "codePostal" TEXT,
ADD COLUMN     "contactName" TEXT,
ADD COLUMN     "email" TEXT,
ADD COLUMN     "logoUrl" TEXT,
ADD COLUMN     "numCamo" TEXT,
ADD COLUMN     "pays" TEXT NOT NULL DEFAULT 'France',
ADD COLUMN     "siret" TEXT,
ADD COLUMN     "telephone" TEXT,
ADD COLUMN     "ville" TEXT,
ADD COLUMN     "website" TEXT;

-- CreateTable
CREATE TABLE "ballon" (
    "id" TEXT NOT NULL,
    "exploitantId" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "immatriculation" TEXT NOT NULL,
    "volume" TEXT NOT NULL,
    "nbPassagerMax" INTEGER NOT NULL,
    "peseeAVide" INTEGER NOT NULL,
    "configGaz" TEXT NOT NULL,
    "manexAnnexRef" TEXT NOT NULL,
    "mtom" INTEGER,
    "mlm" INTEGER,
    "performanceChart" JSONB NOT NULL,
    "camoOrganisme" TEXT,
    "camoExpiryDate" TIMESTAMP(3),
    "certificatNavigabilite" TEXT,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ballon_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pilote" (
    "id" TEXT NOT NULL,
    "exploitantId" TEXT NOT NULL,
    "userId" TEXT,
    "prenom" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "email" TEXT,
    "telephone" TEXT,
    "poidsEncrypted" TEXT,
    "licenceBfcl" TEXT NOT NULL,
    "qualificationCommerciale" BOOLEAN NOT NULL DEFAULT false,
    "dateExpirationLicence" TIMESTAMP(3) NOT NULL,
    "classesBallon" TEXT[],
    "heuresDeVol" INTEGER,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pilote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ballon_exploitantId_idx" ON "ballon"("exploitantId");

-- CreateIndex
CREATE UNIQUE INDEX "ballon_exploitantId_immatriculation_key" ON "ballon"("exploitantId", "immatriculation");

-- CreateIndex
CREATE UNIQUE INDEX "pilote_userId_key" ON "pilote"("userId");

-- CreateIndex
CREATE INDEX "pilote_exploitantId_idx" ON "pilote"("exploitantId");

-- AddForeignKey
ALTER TABLE "ballon" ADD CONSTRAINT "ballon_exploitantId_fkey" FOREIGN KEY ("exploitantId") REFERENCES "exploitant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pilote" ADD CONSTRAINT "pilote_exploitantId_fkey" FOREIGN KEY ("exploitantId") REFERENCES "exploitant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
