-- TD-034: Admin ban via Better Auth admin plugin.
-- Banned users cannot create a new session (Better Auth enforces this in
-- session.create.before hook from the admin plugin). Active sessions are
-- deleted by the banUser endpoint.
ALTER TABLE "user" ADD COLUMN "banned" BOOLEAN DEFAULT false;
ALTER TABLE "user" ADD COLUMN "banReason" TEXT;
ALTER TABLE "user" ADD COLUMN "banExpires" TIMESTAMP(3);
