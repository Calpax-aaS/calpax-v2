-- #15: Better Auth twoFactor plugin — adds the `twoFactorEnabled` flag on
-- user and a new `two_factor` table that stores the encrypted TOTP secret
-- + encrypted backup codes. Plugin handles encryption server-side using
-- BETTER_AUTH_SECRET as the key; we only persist ciphertext.

ALTER TABLE "user" ADD COLUMN "twoFactorEnabled" BOOLEAN DEFAULT false;

CREATE TABLE "two_factor" (
  "id"          TEXT NOT NULL,
  "userId"      TEXT NOT NULL,
  "secret"      TEXT NOT NULL,
  "backupCodes" TEXT NOT NULL,
  "verified"    BOOLEAN NOT NULL DEFAULT true,

  CONSTRAINT "two_factor_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "two_factor_userId_key" ON "two_factor"("userId");

ALTER TABLE "two_factor"
  ADD CONSTRAINT "two_factor_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "user"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
