# lib/admin/

This is the **only folder** in the codebase allowed to import `adminDb` from `@/lib/db`.

## Rules

1. `adminDb` is the unscoped Prisma client. It bypasses tenant isolation.
2. Only `lib/admin/**`, `app/**/admin/**`, `scripts/**`, and `prisma/seed.ts` may import it.
3. Every `adminDb` write is still audited.
4. Prefer `impersonate(exploitantId, fn)` over raw `adminDb` when acting as a tenant.
