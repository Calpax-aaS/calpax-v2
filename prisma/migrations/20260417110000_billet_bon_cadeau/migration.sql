-- Gift card (bon cadeau) fields on billet
ALTER TABLE "billet" ADD COLUMN "estBonCadeau" BOOLEAN DEFAULT false NOT NULL;
ALTER TABLE "billet" ADD COLUMN "dateCadeau" TIMESTAMP(3);
ALTER TABLE "billet" ADD COLUMN "destinataireNom" TEXT;
ALTER TABLE "billet" ADD COLUMN "destinataireEmail" TEXT;
ALTER TABLE "billet" ADD COLUMN "organisateurNom" TEXT;
ALTER TABLE "billet" ADD COLUMN "organisateurEmail" TEXT;
ALTER TABLE "billet" ADD COLUMN "organisateurTelephone" TEXT;
