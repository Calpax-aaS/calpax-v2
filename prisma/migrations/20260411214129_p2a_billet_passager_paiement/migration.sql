-- CreateEnum
CREATE TYPE "TypePlannif" AS ENUM ('MATIN', 'SOIR', 'TOUTE_LA_JOURNEE', 'AU_PLUS_VITE', 'AUTRE', 'INDETERMINE');

-- CreateEnum
CREATE TYPE "StatutBillet" AS ENUM ('EN_ATTENTE', 'PLANIFIE', 'VOLE', 'ANNULE', 'REMBOURSE', 'EXPIRE');

-- CreateEnum
CREATE TYPE "StatutPaiement" AS ENUM ('EN_ATTENTE', 'PARTIEL', 'SOLDE', 'REMBOURSE');

-- CreateEnum
CREATE TYPE "ModePaiement" AS ENUM ('ESPECES', 'CHEQUE', 'CB', 'VIREMENT', 'CHEQUE_VACANCES', 'AVOIR');

-- CreateTable
CREATE TABLE "billet_sequence" (
    "exploitantId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "lastSeq" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "billet_sequence_pkey" PRIMARY KEY ("exploitantId","year")
);

-- CreateTable
CREATE TABLE "billet" (
    "id" TEXT NOT NULL,
    "exploitantId" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "checksum" TEXT NOT NULL,
    "typePlannif" "TypePlannif" NOT NULL DEFAULT 'INDETERMINE',
    "dateVolDeb" TIMESTAMP(3),
    "dateVolFin" TIMESTAMP(3),
    "dateValidite" TIMESTAMP(3),
    "payeurCiv" TEXT,
    "payeurPrenom" TEXT NOT NULL,
    "payeurNom" TEXT NOT NULL,
    "payeurEmail" TEXT,
    "payeurTelephone" TEXT,
    "payeurAdresse" TEXT,
    "payeurCp" TEXT,
    "payeurVille" TEXT,
    "statut" "StatutBillet" NOT NULL DEFAULT 'EN_ATTENTE',
    "statutPaiement" "StatutPaiement" NOT NULL DEFAULT 'EN_ATTENTE',
    "montantTtc" INTEGER NOT NULL,
    "enAttente" BOOLEAN NOT NULL DEFAULT false,
    "categorie" TEXT,
    "provenance" TEXT,
    "lieuDecollage" TEXT,
    "survol" TEXT,
    "commentaire" TEXT,
    "dateRappel" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "billet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "passager" (
    "id" TEXT NOT NULL,
    "exploitantId" TEXT NOT NULL,
    "billetId" TEXT NOT NULL,
    "prenom" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "email" TEXT,
    "telephone" TEXT,
    "age" INTEGER,
    "poidsEncrypted" TEXT,
    "pmr" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "passager_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "paiement" (
    "id" TEXT NOT NULL,
    "exploitantId" TEXT NOT NULL,
    "billetId" TEXT NOT NULL,
    "modePaiement" "ModePaiement" NOT NULL,
    "montantTtc" INTEGER NOT NULL,
    "datePaiement" TIMESTAMP(3) NOT NULL,
    "dateEncaissement" TIMESTAMP(3),
    "commentaire" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "paiement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "billet_exploitantId_idx" ON "billet"("exploitantId");

-- CreateIndex
CREATE INDEX "billet_exploitantId_statut_idx" ON "billet"("exploitantId", "statut");

-- CreateIndex
CREATE INDEX "billet_exploitantId_dateRappel_idx" ON "billet"("exploitantId", "dateRappel");

-- CreateIndex
CREATE UNIQUE INDEX "billet_exploitantId_reference_key" ON "billet"("exploitantId", "reference");

-- CreateIndex
CREATE INDEX "passager_exploitantId_idx" ON "passager"("exploitantId");

-- CreateIndex
CREATE INDEX "passager_billetId_idx" ON "passager"("billetId");

-- CreateIndex
CREATE INDEX "paiement_exploitantId_idx" ON "paiement"("exploitantId");

-- CreateIndex
CREATE INDEX "paiement_billetId_idx" ON "paiement"("billetId");

-- AddForeignKey
ALTER TABLE "billet" ADD CONSTRAINT "billet_exploitantId_fkey" FOREIGN KEY ("exploitantId") REFERENCES "exploitant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "passager" ADD CONSTRAINT "passager_exploitantId_fkey" FOREIGN KEY ("exploitantId") REFERENCES "exploitant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "passager" ADD CONSTRAINT "passager_billetId_fkey" FOREIGN KEY ("billetId") REFERENCES "billet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "paiement" ADD CONSTRAINT "paiement_exploitantId_fkey" FOREIGN KEY ("exploitantId") REFERENCES "exploitant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "paiement" ADD CONSTRAINT "paiement_billetId_fkey" FOREIGN KEY ("billetId") REFERENCES "billet"("id") ON DELETE CASCADE ON UPDATE CASCADE;
