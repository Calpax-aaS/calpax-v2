import 'dotenv/config'
import { basePrisma as prisma } from '../lib/db/base'
import { encrypt } from '../lib/crypto'

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL ?? 'dcuenot@calpax.fr'
  const ownerEmail = process.env.SEED_EXPLOITANT_OWNER_EMAIL ?? 'damien@cameronfrance.com'

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
    update: {
      siret: 'placeholder-siret',
      numCamo: 'OSAC',
      adresse: 'Route de Brevans',
      codePostal: '39100',
      ville: 'Dole',
      contactName: 'Olivier Cuenot',
    },
    create: {
      name: 'Cameron Balloons France',
      frDecNumber: 'FR.DEC.059',
      siret: 'placeholder-siret',
      numCamo: 'OSAC',
      adresse: 'Route de Brevans',
      codePostal: '39100',
      ville: 'Dole',
      contactName: 'Olivier Cuenot',
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

  // Seed 9 ballons for Cameron Balloons France
  const ballonsData = [
    {
      immatriculation: 'F-HFCC',
      nom: 'F-HFCC (Z-105)',
      volumeM3: 3000,
      peseeAVide: 376,
      configGaz: '4xCB2990 : 4x23 kg',
      manexAnnexRef: 'Manex - Annexe 5.4',
      nbPassagerMax: 4,
      mtom: null,
      mlm: null,
      performanceChart: {
        '10': 482,
        '11': 470,
        '12': 458,
        '13': 446,
        '14': 434,
        '15': 422,
        '16': 411,
        '17': 399,
        '18': 388,
        '19': 376,
        '20': 365,
        '21': 354,
        '22': 342,
        '23': 331,
        '24': 320,
        '25': 309,
        '26': 298,
        '27': 288,
        '28': 277,
        '29': 266,
        '30': 256,
        '31': 245,
        '32': 235,
        '33': 224,
        '34': 214,
      },
      camoExpiryDate: new Date('2026-04-25'), // CRITICAL ~14 days
    },
    {
      immatriculation: 'F-HTLT',
      nom: 'F-HTLT (Z-133)',
      volumeM3: 3700,
      peseeAVide: 485,
      mtom: 1206,
      mlm: 603,
      configGaz: '2xCB2901+1xCB2380:2x30+29kg',
      manexAnnexRef: 'Manex - Annexe 5.6',
      nbPassagerMax: 6,
      performanceChart: {
        '10': 602,
        '11': 587,
        '12': 571,
        '13': 556,
        '14': 541,
        '15': 526,
        '16': 512,
        '17': 497,
        '18': 482,
        '19': 468,
        '20': 454,
        '21': 439,
        '22': 425,
        '23': 411,
        '24': 397,
        '25': 383,
        '26': 369,
        '27': 356,
        '28': 342,
        '29': 328,
        '30': 315,
        '31': 302,
        '32': 288,
        '33': 275,
        '34': 262,
      },
      camoExpiryDate: new Date('2027-01-01'), // far
    },
    {
      immatriculation: 'F-HMJD',
      nom: 'F-HMJD (Z-133)',
      volumeM3: 3700,
      peseeAVide: 492,
      mtom: 1206,
      mlm: 603,
      configGaz: '2xCB2901+1xCB2380:2x30+29kg',
      manexAnnexRef: 'Manex - Annexe 5.6',
      nbPassagerMax: 6,
      performanceChart: {
        '10': 595,
        '11': 580,
        '12': 564,
        '13': 549,
        '14': 534,
        '15': 519,
        '16': 505,
        '17': 490,
        '18': 475,
        '19': 461,
        '20': 447,
        '21': 432,
        '22': 418,
        '23': 404,
        '24': 390,
        '25': 376,
        '26': 362,
        '27': 349,
        '28': 335,
        '29': 321,
        '30': 308,
        '31': 295,
        '32': 281,
        '33': 268,
        '34': 255,
      },
      camoExpiryDate: new Date('2026-06-01'), // WARNING ~51 days
    },
    {
      immatriculation: 'F-HCPJ',
      nom: 'F-HCPJ (Z-90)',
      volumeM3: 2600,
      peseeAVide: 343,
      mtom: 816,
      mlm: 0,
      configGaz: '4xCB2385 : 4x23 kg',
      manexAnnexRef: 'Manex - Annexe 5.2',
      nbPassagerMax: 3,
      performanceChart: {
        '10': 393,
        '11': 382,
        '12': 372,
        '13': 362,
        '14': 351,
        '15': 341,
        '16': 331,
        '17': 321,
        '18': 312,
        '19': 302,
        '20': 292,
        '21': 282,
        '22': 273,
        '23': 263,
        '24': 254,
        '25': 244,
        '26': 235,
        '27': 226,
        '28': 217,
        '29': 207,
        '30': 198,
        '31': 189,
        '32': 180,
        '33': 171,
        '34': 163,
      },
      camoExpiryDate: new Date('2027-01-01'), // far
    },
    {
      immatriculation: 'F-HCBF',
      nom: 'F-HCBF (Z-77)',
      volumeM3: 2200,
      peseeAVide: 342,
      mtom: 703,
      mlm: 0,
      configGaz: '4xCB2990 : 4x23 kg',
      manexAnnexRef: 'Manex - Annexe 5.1',
      nbPassagerMax: 2,
      performanceChart: {
        '10': 287,
        '11': 278,
        '12': 270,
        '13': 261,
        '14': 252,
        '15': 244,
        '16': 235,
        '17': 226,
        '18': 218,
        '19': 210,
        '20': 201,
        '21': 193,
        '22': 185,
        '23': 177,
        '24': 169,
        '25': 161,
        '26': 153,
        '27': 145,
        '28': 137,
        '29': 129,
        '30': 121,
        '31': 113,
        '32': 106,
        '33': 98,
        '34': 91,
      },
      camoExpiryDate: new Date('2026-04-25'), // CRITICAL ~14 days
    },
    {
      immatriculation: 'F-HCDS',
      nom: 'F-HCDS (Z-77)',
      volumeM3: 2200,
      peseeAVide: 344,
      mtom: 703,
      mlm: 0,
      configGaz: '4xCB2990 : 4x23 kg',
      manexAnnexRef: 'Manex - Annexe 5.1',
      nbPassagerMax: 2,
      performanceChart: {
        '10': 285,
        '11': 276,
        '12': 268,
        '13': 259,
        '14': 250,
        '15': 242,
        '16': 233,
        '17': 224,
        '18': 216,
        '19': 208,
        '20': 199,
        '21': 191,
        '22': 183,
        '23': 175,
        '24': 167,
        '25': 159,
        '26': 151,
        '27': 143,
        '28': 135,
        '29': 127,
        '30': 119,
        '31': 111,
        '32': 104,
        '33': 96,
        '34': 89,
      },
      camoExpiryDate: new Date('2026-06-01'), // WARNING ~51 days
    },
    {
      immatriculation: 'F-GVGD',
      nom: 'F-GVGD (Z-120)',
      volumeM3: 3400,
      peseeAVide: 467,
      mtom: 1088,
      mlm: 544,
      configGaz: '3xCB2901:3x30kg',
      manexAnnexRef: 'Manex - Annexe 5.5',
      nbPassagerMax: 5,
      performanceChart: {
        '10': 514,
        '11': 500,
        '12': 486,
        '13': 473,
        '14': 459,
        '15': 446,
        '16': 432,
        '17': 419,
        '18': 406,
        '19': 393,
        '20': 380,
        '21': 367,
        '22': 354,
        '23': 341,
        '24': 329,
        '25': 316,
        '26': 304,
        '27': 291,
        '28': 279,
        '29': 267,
        '30': 255,
        '31': 243,
        '32': 231,
        '33': 219,
        '34': 207,
      },
      camoExpiryDate: new Date('2027-01-01'), // far
    },
    {
      immatriculation: 'F-HACK',
      nom: 'F-HACK (Z-225)',
      volumeM3: 6400,
      peseeAVide: 746,
      mtom: 2041,
      mlm: 1021,
      configGaz: '4xCB2903 : 4x36 kg',
      manexAnnexRef: 'Manex - Annexe 5.7',
      nbPassagerMax: 12,
      performanceChart: {
        '10': 1093,
        '11': 1067,
        '12': 1041,
        '13': 1016,
        '14': 990,
        '15': 965,
        '16': 940,
        '17': 915,
        '18': 891,
        '19': 866,
        '20': 842,
        '21': 818,
        '22': 794,
        '23': 770,
        '24': 746,
        '25': 723,
        '26': 699,
        '27': 676,
        '28': 653,
        '29': 630,
        '30': 607,
        '31': 585,
        '32': 562,
        '33': 540,
        '34': 518,
      },
      camoExpiryDate: new Date('2027-01-01'), // far
    },
    {
      immatriculation: 'F-HPLM',
      nom: 'F-HPLM (Z-105)',
      volumeM3: 3000,
      peseeAVide: 378,
      mtom: 952,
      mlm: 476,
      configGaz: '4xCB2385 : 4x23 kg',
      manexAnnexRef: 'Manex - Annexe 5.3',
      nbPassagerMax: 4,
      performanceChart: {
        '10': 480,
        '11': 468,
        '12': 456,
        '13': 444,
        '14': 432,
        '15': 420,
        '16': 409,
        '17': 397,
        '18': 386,
        '19': 374,
        '20': 363,
        '21': 352,
        '22': 340,
        '23': 329,
        '24': 318,
        '25': 307,
        '26': 296,
        '27': 286,
        '28': 275,
        '29': 264,
        '30': 254,
        '31': 243,
        '32': 233,
        '33': 222,
        '34': 212,
      },
      camoExpiryDate: new Date('2026-06-01'), // WARNING ~51 days
    },
  ]

  for (const ballon of ballonsData) {
    const existing = await prisma.ballon.findFirst({
      where: {
        exploitantId: cameronBalloons.id,
        immatriculation: ballon.immatriculation,
      },
    })
    if (existing) {
      await prisma.ballon.update({
        where: { id: existing.id },
        data: {
          ...ballon,
          camoOrganisme: 'OSAC',
          actif: true,
        },
      })
    } else {
      await prisma.ballon.create({
        data: {
          ...ballon,
          exploitantId: cameronBalloons.id,
          camoOrganisme: 'OSAC',
          actif: true,
        },
      })
    }
  }

  // Seed 4 pilotes for Cameron Balloons France
  const pilotesData = [
    {
      prenom: 'Olivier',
      nom: 'Cuenot',
      poids: 92,
      telephone: '0680344117',
      email: 'olivier.cuenot@cameronfrance.com',
      licenceBfcl: 'BFCL-CBF-001',
      qualificationCommerciale: true,
      classeA: true,
      groupeA1: true,
      groupeA2: true,
      groupeA3: true, // flies F-HACK 6400m3 (groupe 3: 6001–10500 m3)
      heuresDeVol: 2500,
      dateExpirationLicence: new Date('2027-03-15'), // far
    },
    {
      prenom: 'Eric',
      nom: 'Plantade',
      poids: 86,
      telephone: '0616531560',
      email: null,
      licenceBfcl: 'BFCL-CBF-002',
      qualificationCommerciale: true,
      classeA: true,
      groupeA1: true,
      groupeA2: true,
      heuresDeVol: 800,
      dateExpirationLicence: new Date('2026-05-15'), // WARNING ~34 days
    },
    {
      prenom: 'Max',
      nom: 'Thomas',
      poids: 75,
      telephone: '0676390635',
      email: null,
      licenceBfcl: 'BFCL-CBF-003',
      qualificationCommerciale: true,
      classeA: true,
      groupeA1: true,
      heuresDeVol: 400,
      dateExpirationLicence: new Date('2026-04-25'), // CRITICAL ~14 days
    },
    {
      prenom: 'Herve',
      nom: 'Daclin',
      poids: 94,
      telephone: null,
      email: null,
      licenceBfcl: 'BFCL-CBF-004',
      qualificationCommerciale: true,
      classeA: true,
      classeB: true,
      groupeA1: true,
      groupeA2: true,
      heuresDeVol: 1200,
      dateExpirationLicence: new Date('2027-09-01'), // far
    },
  ]

  for (const pilote of pilotesData) {
    const { poids, telephone, email, ...rest } = pilote
    const poidsEncrypted = encrypt(String(poids))

    const existing = await prisma.pilote.findFirst({
      where: { licenceBfcl: pilote.licenceBfcl },
    })

    const data = {
      ...rest,
      exploitantId: cameronBalloons.id,
      poidsEncrypted,
      ...(telephone ? { telephone } : {}),
      ...(email ? { email } : {}),
      actif: true,
    }

    if (existing) {
      await prisma.pilote.update({
        where: { id: existing.id },
        data,
      })
    } else {
      await prisma.pilote.create({ data })
    }
  }

  console.log('Seed complete:')
  console.log('  - Exploitant: Calpax SAS (INTERNAL.CALPAX)')
  console.log(
    '  - Exploitant: Cameron Balloons France (FR.DEC.059) — updated with CAMO/SIRET/address',
  )
  console.log(`  - User: ${adminEmail} (ADMIN_CALPAX)`)
  console.log(`  - User: ${ownerEmail} (GERANT)`)
  console.log('  - 9 ballons seeded for Cameron Balloons France')
  console.log('  - 4 pilotes seeded for Cameron Balloons France')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
