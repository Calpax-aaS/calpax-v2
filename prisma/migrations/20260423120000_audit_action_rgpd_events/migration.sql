-- GDPR: persistent audit trail for PII exports and passager anonymisation.
-- Art. 30 (record of processing) + Art. 17 (right to erasure) demand a trace
-- every time sensitive data leaves the system or is irreversibly scrubbed.

ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'EXPORT_PII';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'ANONYMIZE_PII';
