import 'dotenv/config'
import { basePrisma as prisma } from '../lib/db/base'

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL ?? 'damien@calpax.fr'
  const ownerEmail = process.env.SEED_EXPLOITANT_OWNER_EMAIL ?? 'olivier@cameronfrance.com'

  const calpaxSas = await prisma.exploitant.upsert({
    where: { frDecNumber: 'INTERNAL.CALPAX' },
    update: {},
    create: {
      name: 'Calpax SAS',
      frDecNumber: 'INTERNAL.CALPAX',
    },
  })

  const cameronBalloons = await prisma.exploitant.upsert({
    where: { frDecNumber: 'FR.DEC.059' },
    update: {},
    create: {
      name: 'Cameron Balloons France',
      frDecNumber: 'FR.DEC.059',
    },
  })

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      name: 'Damien Cuenot',
      role: 'ADMIN_CALPAX',
      exploitantId: calpaxSas.id,
    },
  })

  await prisma.user.upsert({
    where: { email: ownerEmail },
    update: {},
    create: {
      email: ownerEmail,
      name: 'Olivier Cuenot',
      role: 'GERANT',
      exploitantId: cameronBalloons.id,
    },
  })

  console.log('Seed complete:')
  console.log('  - Exploitant: Calpax SAS (INTERNAL.CALPAX)')
  console.log('  - Exploitant: Cameron Balloons France (FR.DEC.059)')
  console.log(`  - User: ${adminEmail} (ADMIN_CALPAX)`)
  console.log(`  - User: ${ownerEmail} (GERANT)`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
