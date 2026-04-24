-- #59: explicit audit trail for ADMIN_CALPAX exploitant impersonation.
-- Both events are emitted by lib/actions/impersonation.ts. The rows carry
-- userId = the admin's id and `entityId` = the target exploitantId.

ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'IMPERSONATE_START';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'IMPERSONATE_STOP';
