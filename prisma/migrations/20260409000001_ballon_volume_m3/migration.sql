-- AlterTable: Replace volume String with volumeM3 Int on ballon table

ALTER TABLE "ballon" ADD COLUMN "volumeM3" INTEGER;

UPDATE "ballon" SET "volumeM3" = 0 WHERE "volumeM3" IS NULL;

ALTER TABLE "ballon" ALTER COLUMN "volumeM3" SET NOT NULL;

ALTER TABLE "ballon" DROP COLUMN "volume";
