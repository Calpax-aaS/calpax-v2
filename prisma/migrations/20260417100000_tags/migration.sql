-- Tags system for billets
CREATE TABLE "tag" (
    "id" TEXT NOT NULL,
    "exploitantId" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "couleur" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "tag_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "billet_tag" (
    "billetId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,
    CONSTRAINT "billet_tag_pkey" PRIMARY KEY ("billetId","tagId")
);

CREATE UNIQUE INDEX "tag_exploitantId_nom_key" ON "tag"("exploitantId", "nom");
CREATE INDEX "tag_exploitantId_idx" ON "tag"("exploitantId");

ALTER TABLE "tag" ADD CONSTRAINT "tag_exploitantId_fkey" FOREIGN KEY ("exploitantId") REFERENCES "exploitant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "billet_tag" ADD CONSTRAINT "billet_tag_billetId_fkey" FOREIGN KEY ("billetId") REFERENCES "billet"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "billet_tag" ADD CONSTRAINT "billet_tag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;
