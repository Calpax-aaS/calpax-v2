-- AlterTable
ALTER TABLE "exploitant" ADD COLUMN     "meteoLatitude" DOUBLE PRECISION,
ADD COLUMN     "meteoLongitude" DOUBLE PRECISION,
ADD COLUMN     "meteoSeuilVent" INTEGER DEFAULT 15;

-- CreateTable
CREATE TABLE "weather_cache" (
    "id" TEXT NOT NULL,
    "exploitantId" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "date" DATE NOT NULL,
    "data" JSONB NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "weather_cache_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "weather_cache_exploitantId_idx" ON "weather_cache"("exploitantId");

-- CreateIndex
CREATE UNIQUE INDEX "weather_cache_exploitantId_date_key" ON "weather_cache"("exploitantId", "date");

-- AddForeignKey
ALTER TABLE "weather_cache" ADD CONSTRAINT "weather_cache_exploitantId_fkey" FOREIGN KEY ("exploitantId") REFERENCES "exploitant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
