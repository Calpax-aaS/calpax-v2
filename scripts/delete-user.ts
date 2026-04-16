/**
 * One-shot script to delete a user by email.
 * Handles cascade cleanup of Better Auth accounts, sessions, and audit logs.
 *
 * Usage:
 *   pnpm exec tsx scripts/delete-user.ts <email>
 *
 * Example:
 *   pnpm exec tsx scripts/delete-user.ts damien@cameronfrance.com
 *
 * DATABASE_URL must point to the target database (prod or local).
 */
import 'dotenv/config'
import { basePrisma as prisma } from '../lib/db/base'

async function main() {
  const email = process.argv[2]
  if (!email) {
    console.error('Usage: pnpm exec tsx scripts/delete-user.ts <email>')
    process.exit(1)
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, name: true, exploitantId: true },
  })

  if (!user) {
    console.log(`No user found with email ${email}`)
    return
  }

  console.log(`Found user: ${user.name} (${user.email}) — exploitantId=${user.exploitantId}`)

  // Delete in cascade order (Better Auth schema has FKs)
  const deletedSessions = await prisma.session.deleteMany({ where: { userId: user.id } })
  const deletedAccounts = await prisma.account.deleteMany({ where: { userId: user.id } })
  // Audit logs have userId but no FK constraint -- update to null or delete based on retention policy
  const deletedAuditLogs = await prisma.auditLog.deleteMany({ where: { userId: user.id } })

  console.log(`  Deleted ${deletedSessions.count} sessions`)
  console.log(`  Deleted ${deletedAccounts.count} accounts`)
  console.log(`  Deleted ${deletedAuditLogs.count} audit log entries`)

  await prisma.user.delete({ where: { id: user.id } })
  console.log(`  Deleted user ${user.email}`)
  console.log('Done.')
}

main()
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
