-- Better Auth migration: NextAuth -> Better Auth schema

-- 1. User table: emailVerified DateTime? -> Boolean, name String? -> String
-- Drop the old emailVerified column and add new boolean one
ALTER TABLE "user" ALTER COLUMN "emailVerified" DROP DEFAULT;
ALTER TABLE "user" ALTER COLUMN "emailVerified" TYPE BOOLEAN USING CASE WHEN "emailVerified" IS NOT NULL THEN true ELSE false END;
ALTER TABLE "user" ALTER COLUMN "emailVerified" SET NOT NULL;
ALTER TABLE "user" ALTER COLUMN "emailVerified" SET DEFAULT false;

-- Make name required (set empty string for NULLs first)
UPDATE "user" SET "name" = '' WHERE "name" IS NULL;
ALTER TABLE "user" ALTER COLUMN "name" SET NOT NULL;

-- 2. Session table: complete restructure
-- Drop old sessions (they will be invalidated anyway during auth migration)
DELETE FROM "session";

-- Drop old columns
ALTER TABLE "session" DROP COLUMN IF EXISTS "sessionToken";
ALTER TABLE "session" DROP COLUMN IF EXISTS "expires";

-- Add new columns
ALTER TABLE "session" ADD COLUMN "token" TEXT NOT NULL;
ALTER TABLE "session" ADD COLUMN "expiresAt" TIMESTAMP(3) NOT NULL;
ALTER TABLE "session" ADD COLUMN "ipAddress" TEXT;
ALTER TABLE "session" ADD COLUMN "userAgent" TEXT;
ALTER TABLE "session" ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "session" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Add unique constraint on token
CREATE UNIQUE INDEX "session_token_key" ON "session"("token");

-- Add index on userId
CREATE INDEX "session_userId_idx" ON "session"("userId");

-- 3. Account table: complete restructure
-- Drop old accounts (migration to new provider format)
DELETE FROM "account";

-- Drop old unique constraint
DROP INDEX IF EXISTS "account_provider_providerAccountId_key";

-- Drop old columns
ALTER TABLE "account" DROP COLUMN IF EXISTS "type";
ALTER TABLE "account" DROP COLUMN IF EXISTS "provider";
ALTER TABLE "account" DROP COLUMN IF EXISTS "providerAccountId";
ALTER TABLE "account" DROP COLUMN IF EXISTS "refresh_token";
ALTER TABLE "account" DROP COLUMN IF EXISTS "access_token";
ALTER TABLE "account" DROP COLUMN IF EXISTS "expires_at";
ALTER TABLE "account" DROP COLUMN IF EXISTS "token_type";
ALTER TABLE "account" DROP COLUMN IF EXISTS "scope";
ALTER TABLE "account" DROP COLUMN IF EXISTS "id_token";
ALTER TABLE "account" DROP COLUMN IF EXISTS "session_state";

-- Add new columns
ALTER TABLE "account" ADD COLUMN "accountId" TEXT NOT NULL DEFAULT '';
ALTER TABLE "account" ADD COLUMN "providerId" TEXT NOT NULL DEFAULT '';
ALTER TABLE "account" ADD COLUMN "accessToken" TEXT;
ALTER TABLE "account" ADD COLUMN "refreshToken" TEXT;
ALTER TABLE "account" ADD COLUMN "idToken" TEXT;
ALTER TABLE "account" ADD COLUMN "accessTokenExpiresAt" TIMESTAMP(3);
ALTER TABLE "account" ADD COLUMN "refreshTokenExpiresAt" TIMESTAMP(3);
ALTER TABLE "account" ADD COLUMN "scope" TEXT;
ALTER TABLE "account" ADD COLUMN "password" TEXT;
ALTER TABLE "account" ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "account" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Remove defaults used only for migration
ALTER TABLE "account" ALTER COLUMN "accountId" DROP DEFAULT;
ALTER TABLE "account" ALTER COLUMN "providerId" DROP DEFAULT;

-- Add index on userId
CREATE INDEX "account_userId_idx" ON "account"("userId");

-- 4. Verification table: replace verification_token with verification
DROP TABLE IF EXISTS "verification_token";

CREATE TABLE "verification" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "verification_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "verification_identifier_idx" ON "verification"("identifier");
