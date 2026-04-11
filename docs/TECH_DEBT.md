# Technical Debt

Items to address before or during P1. Each entry has a severity and a proposed fix.

---

## TD-001: NODE_TLS_REJECT_UNAUTHORIZED=0 on Vercel

**Severity:** HIGH — disables TLS certificate verification for ALL outbound connections from the Vercel runtime, not just Supabase.

**Context:** Supabase's pooler certificate chain is rejected by Node.js on Vercel with "self-signed certificate in certificate chain". The `pg.Pool` config `ssl: { rejectUnauthorized: false }` should scope the bypass to Postgres only, but Prisma v7's adapter-pg doesn't fully respect it. Added `NODE_TLS_REJECT_UNAUTHORIZED=0` as a Vercel env var to unblock P0 deployment.

**Proposed fix:** Remove the env var and instead:

1. Download Supabase's CA certificate from the Supabase dashboard (Settings > Database > SSL > Download Certificate)
2. Pass it to the `pg.Pool` via `ssl: { ca: fs.readFileSync('supabase-ca.crt').toString() }`
3. Or upgrade to a Prisma/adapter-pg version that properly passes SSL config through

**When:** Start of P1, before any real passenger data flows through the system.

**Added:** 2026-04-11
