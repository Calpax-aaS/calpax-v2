-- #76: per-endpoint cooldown backing the cron rate limiter in lib/auth/cron.ts.
-- One row per cron endpoint; upserted on every successful invocation.

CREATE TABLE "cron_invocation" (
  "endpoint"       TEXT NOT NULL,
  "lastInvokedAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "cron_invocation_pkey" PRIMARY KEY ("endpoint")
);
