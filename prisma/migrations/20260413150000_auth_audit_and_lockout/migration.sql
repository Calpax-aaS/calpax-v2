-- Auth audit logging + account lockout after N failed attempts

-- 1. Extend AuditAction enum with auth-specific actions
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'SIGN_IN';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'SIGN_IN_FAILED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'SIGN_OUT';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'PASSWORD_RESET';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'PASSWORD_CHANGED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'ACCOUNT_LOCKED';

-- 2. Add lockedUntil to User for account lockout
ALTER TABLE "user" ADD COLUMN "lockedUntil" TIMESTAMP(3);

-- 3. Track failed login attempts per email (no tenant, used pre-auth)
CREATE TABLE "failed_login_attempt" (
    "id" BIGSERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "failed_login_attempt_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "failed_login_attempt_email_createdAt_idx"
  ON "failed_login_attempt"("email", "createdAt");
