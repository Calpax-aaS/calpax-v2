import 'dotenv/config'
import { basePrisma as prisma } from '../lib/db/base'
import { encrypt } from '../lib/crypto'
import { hashPassword } from 'better-auth/crypto'

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL ?? 'dcuenot@calpax.fr'
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
    update: {
      siret: 'placeholder-siret',
      numCamo: 'OSAC',
      adresse: 'Route de Brevans',
      codePostal: '39100',
      ville: 'Dole',
      contactName: 'Olivier Cuenot',
      billetPrefix: 'CBF',
      meteoLatitude: 47.0833,
      meteoLongitude: 5.4833,
      meteoSeuilVent: 15,
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
      billetPrefix: 'CBF',
      meteoLatitude: 47.0833,
      meteoLongitude: 5.4833,
      meteoSeuilVent: 15,
    },
  })

  const defaultPassword = process.env.SEED_DEFAULT_PASSWORD ?? 'Calpax-2026-Demo!'
  const hashedPw = await hashPassword(defaultPassword)

  const adminUser = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      name: 'Damien Cuenot',
      role: 'ADMIN_CALPAX',
      exploitantId: calpaxSas.id,
    },
  })

  // Create credential account for admin user (Better Auth stores passwords in account table)
  const existingAdminAccount = await prisma.account.findFirst({
    where: { userId: adminUser.id, providerId: 'credential' },
  })
  if (!existingAdminAccount) {
    await prisma.account.create({
      data: {
        userId: adminUser.id,
        accountId: adminUser.id,
        providerId: 'credential',
        password: hashedPw,
      },
    })
  }

  const ownerUser = await prisma.user.upsert({
    where: { email: ownerEmail },
    update: {},
    create: {
      email: ownerEmail,
      name: 'Olivier Cuenot',
      role: 'GERANT',
      exploitantId: cameronBalloons.id,
    },
  })

  // Create credential account for owner user
  const existingOwnerAccount = await prisma.account.findFirst({
    where: { userId: ownerUser.id, providerId: 'credential' },
  })
  if (!existingOwnerAccount) {
    await prisma.account.create({
      data: {
        userId: ownerUser.id,
        accountId: ownerUser.id,
        providerId: 'credential',
        password: hashedPw,
      },
    })
  }

  // Additional users for Cameron Balloons France (role testing)
  const extraUsers = [
    { email: 'pilote@cameronfrance.com', name: 'Pilote Demo', role: 'PILOTE' as const },
    { email: 'equipier@cameronfrance.com', name: 'Equipier Demo', role: 'EQUIPIER' as const },
  ]

  for (const u of extraUsers) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: {
        email: u.email,
        name: u.name,
        role: u.role,
        exploitantId: cameronBalloons.id,
      },
    })

    const existingAccount = await prisma.account.findFirst({
      where: { userId: user.id, providerId: 'credential' },
    })
    if (!existingAccount) {
      await prisma.account.create({
        data: {
          userId: user.id,
          accountId: user.id,
          providerId: 'credential',
          password: hashedPw,
        },
      })
    }
  }

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

  // Seed equipiers for Cameron Balloons France
  const equipiersData = [
    { prenom: 'Marie', nom: 'Cuenot', telephone: '0612345678' },
    { prenom: 'Lucas', nom: 'Martin', telephone: null },
  ]

  for (const eq of equipiersData) {
    const existing = await prisma.equipier.findFirst({
      where: { exploitantId: cameronBalloons.id, prenom: eq.prenom, nom: eq.nom },
    })
    if (!existing) {
      await prisma.equipier.create({
        data: { ...eq, exploitantId: cameronBalloons.id },
      })
    }
  }

  // Seed vehicules for Cameron Balloons France
  const vehiculesData = [
    { nom: 'Renault Master', immatriculation: 'AB-123-CD' },
    { nom: 'Citroen Jumper', immatriculation: 'EF-456-GH' },
  ]

  for (const veh of vehiculesData) {
    const existing = await prisma.vehicule.findFirst({
      where: { exploitantId: cameronBalloons.id, nom: veh.nom },
    })
    if (!existing) {
      await prisma.vehicule.create({
        data: { ...veh, exploitantId: cameronBalloons.id },
      })
    }
  }

  // Seed sites de decollage for Cameron Balloons France (Jura/Dole area)
  const sitesData = [
    {
      nom: 'Dole-Tavaux',
      adresse: 'Route de Tavaux, 39100 Dole',
      latitude: 47.0389,
      longitude: 5.4275,
      notes: 'Terrain habituel',
    },
    {
      nom: 'Parcey',
      adresse: 'Parcey, 39100',
      latitude: 47.0567,
      longitude: 5.4833,
      notes: 'Terrain de secours',
    },
    {
      nom: 'Brevans',
      adresse: 'Brevans, 39100',
      latitude: 47.0722,
      longitude: 5.4611,
      notes: null,
    },
  ]

  for (const site of sitesData) {
    const existing = await prisma.siteDecollage.findFirst({
      where: { exploitantId: cameronBalloons.id, nom: site.nom },
    })
    if (!existing) {
      await prisma.siteDecollage.create({
        data: { ...site, exploitantId: cameronBalloons.id },
      })
    }
  }

  console.log('Seed complete:')
  console.log('  - Exploitant: Calpax SAS (INTERNAL.CALPAX)')
  console.log(
    '  - Exploitant: Cameron Balloons France (FR.DEC.059) — updated with CAMO/SIRET/address',
  )
  console.log(`  - User: ${adminEmail} (ADMIN_CALPAX)`)
  console.log(`  - User: ${ownerEmail} (GERANT)`)
  console.log('  - User: pilote@cameronfrance.com (PILOTE)')
  console.log('  - User: equipier@cameronfrance.com (EQUIPIER)')
  console.log('  - 9 ballons seeded for Cameron Balloons France')
  console.log('  - 4 pilotes seeded for Cameron Balloons France')
  console.log('  - 2 equipiers seeded for Cameron Balloons France')
  console.log('  - 2 vehicules seeded for Cameron Balloons France')
  console.log('  - 3 sites de decollage seeded for Cameron Balloons France')

  // ---------------------------------------------------------------------------
  // Seed 15 billets with passengers and payments for testing
  // ---------------------------------------------------------------------------
  const { formatReference, computeLuhnChecksum } = await import('../lib/billet/reference')

  const billetsSeedData = [
    {
      seq: 1,
      typePlannif: 'MATIN' as const,
      dateVolDeb: new Date('2026-04-20'),
      dateVolFin: new Date('2026-04-25'),
      payeurPrenom: 'Jean-Pierre',
      payeurNom: 'Martin',
      payeurEmail: 'jpmartin@gmail.com',
      payeurTelephone: '0612345678',
      payeurVille: 'Dole',
      montantTtc: 450,
      categorie: 'Touristique',
      provenance: 'Telephone',
      passagers: [
        { prenom: 'Jean-Pierre', nom: 'Martin', age: 52, poids: 85, pmr: false },
        { prenom: 'Marie', nom: 'Martin', age: 48, poids: 62, pmr: false },
      ],
      paiements: [{ mode: 'CB' as const, montant: 450, date: new Date('2026-04-10') }],
    },
    {
      seq: 2,
      typePlannif: 'SOIR' as const,
      dateVolDeb: new Date('2026-05-01'),
      dateVolFin: new Date('2026-05-15'),
      payeurPrenom: 'Sophie',
      payeurNom: 'Durand',
      payeurEmail: 'sophie.durand@orange.fr',
      payeurTelephone: '0687654321',
      payeurVille: 'Besancon',
      montantTtc: 680,
      categorie: 'Touristique',
      provenance: 'Web',
      passagers: [
        { prenom: 'Sophie', nom: 'Durand', age: 35, poids: 58, pmr: false },
        { prenom: 'Lucas', nom: 'Durand', age: 38, poids: 82, pmr: false },
        { prenom: 'Emma', nom: 'Durand', age: 12, poids: 40, pmr: false },
      ],
      paiements: [{ mode: 'CB' as const, montant: 340, date: new Date('2026-04-05') }],
    },
    {
      seq: 3,
      typePlannif: 'AU_PLUS_VITE' as const,
      dateVolDeb: new Date('2026-04-15'),
      dateVolFin: new Date('2026-06-30'),
      payeurPrenom: 'Michel',
      payeurNom: 'Bernard',
      payeurEmail: null,
      payeurTelephone: '0698765432',
      payeurVille: 'Lons-le-Saunier',
      montantTtc: 225,
      categorie: 'Touristique',
      provenance: 'Telephone',
      passagers: [{ prenom: 'Michel', nom: 'Bernard', age: 67, poids: 78, pmr: false }],
      paiements: [{ mode: 'CHEQUE' as const, montant: 225, date: new Date('2026-04-12') }],
    },
    {
      seq: 4,
      typePlannif: 'TOUTE_LA_JOURNEE' as const,
      dateVolDeb: new Date('2026-05-10'),
      dateVolFin: new Date('2026-05-20'),
      payeurPrenom: 'Frederic',
      payeurNom: 'Birebent',
      payeurEmail: 'f.birebent@free.fr',
      payeurTelephone: '0676390635',
      payeurVille: 'Dijon',
      montantTtc: 900,
      categorie: 'Evenementiel',
      provenance: 'Partenaire',
      passagers: [
        { prenom: 'Frederic', nom: 'Birebent', age: 43, poids: 111, pmr: false },
        { prenom: 'Celine', nom: 'Birebent', age: 41, poids: 55, pmr: false },
        { prenom: 'Tom', nom: 'Birebent', age: 15, poids: 68, pmr: false },
        { prenom: 'Lea', nom: 'Birebent', age: 10, poids: 35, pmr: false },
      ],
      paiements: [
        { mode: 'VIREMENT' as const, montant: 450, date: new Date('2026-04-08') },
        { mode: 'VIREMENT' as const, montant: 450, date: new Date('2026-05-01') },
      ],
    },
    {
      seq: 5,
      typePlannif: 'MATIN' as const,
      dateVolDeb: new Date('2026-06-01'),
      dateVolFin: new Date('2026-06-15'),
      payeurPrenom: 'Philippe',
      payeurNom: 'Moreau',
      payeurEmail: 'pmoreau@entreprise.com',
      payeurTelephone: '0654321098',
      payeurVille: 'Lyon',
      montantTtc: 1200,
      categorie: 'Evenementiel',
      provenance: 'Entreprise',
      commentaire: 'Incentive equipe commerciale — 6 personnes',
      passagers: [
        { prenom: 'Philippe', nom: 'Moreau', age: 45, poids: 90, pmr: false },
        { prenom: 'Nathalie', nom: 'Roux', age: 39, poids: 63, pmr: false },
        { prenom: 'Arnaud', nom: 'Lefevre', age: 33, poids: 77, pmr: false },
        { prenom: 'Claire', nom: 'Dubois', age: 28, poids: 55, pmr: false },
        { prenom: 'Julien', nom: 'Garcia', age: 41, poids: 88, pmr: false },
        { prenom: 'Isabelle', nom: 'Petit', age: 36, poids: 60, pmr: false },
      ],
      paiements: [{ mode: 'VIREMENT' as const, montant: 1200, date: new Date('2026-05-15') }],
    },
    {
      seq: 6,
      typePlannif: 'SOIR' as const,
      dateVolDeb: new Date('2026-04-25'),
      dateVolFin: new Date('2026-05-10'),
      payeurPrenom: 'Alain',
      payeurNom: 'Girard',
      payeurEmail: 'alain.girard@laposte.net',
      payeurTelephone: '0632109876',
      payeurVille: 'Arbois',
      montantTtc: 450,
      categorie: 'Touristique',
      provenance: 'Bouche a oreille',
      passagers: [
        { prenom: 'Alain', nom: 'Girard', age: 55, poids: 92, pmr: false },
        { prenom: 'Francoise', nom: 'Girard', age: 53, poids: 68, pmr: false },
      ],
      paiements: [{ mode: 'ESPECES' as const, montant: 200, date: new Date('2026-04-15') }],
    },
    {
      seq: 7,
      typePlannif: 'MATIN' as const,
      dateVolDeb: new Date('2026-05-20'),
      dateVolFin: new Date('2026-05-25'),
      payeurPrenom: 'Catherine',
      payeurNom: 'Lemaire',
      payeurEmail: 'c.lemaire@yahoo.fr',
      payeurTelephone: '0645678901',
      payeurVille: 'Strasbourg',
      montantTtc: 225,
      categorie: 'Touristique',
      provenance: 'Web',
      dateValidite: new Date('2026-12-31'),
      commentaire: 'Bon cadeau anniversaire pour son mari',
      passagers: [{ prenom: 'Pierre', nom: 'Lemaire', age: 60, poids: 82, pmr: false }],
      paiements: [{ mode: 'CB' as const, montant: 225, date: new Date('2026-03-20') }],
    },
    {
      seq: 8,
      typePlannif: 'A_DEFINIR' as const,
      dateVolDeb: null,
      dateVolFin: null,
      payeurPrenom: 'Eric',
      payeurNom: 'Rousseau',
      payeurEmail: null,
      payeurTelephone: '0678901234',
      payeurVille: 'Tavaux',
      montantTtc: 450,
      categorie: 'Touristique',
      provenance: 'Telephone',
      dateRappel: new Date('2026-04-20'),
      commentaire: 'Rappeler pour fixer les dates — indecis',
      passagers: [
        { prenom: 'Eric', nom: 'Rousseau', age: 44, poids: 95, pmr: false },
        { prenom: 'Sandrine', nom: 'Rousseau', age: 42, poids: 65, pmr: false },
      ],
      paiements: [],
    },
    {
      seq: 9,
      typePlannif: 'SOIR' as const,
      dateVolDeb: new Date('2026-04-18'),
      dateVolFin: new Date('2026-04-30'),
      payeurPrenom: 'Damien',
      payeurNom: 'Cuenot',
      payeurEmail: 'damien@cameronfrance.com',
      payeurTelephone: '0680344117',
      payeurVille: 'Dole',
      montantTtc: 0,
      categorie: 'Interne',
      provenance: 'Interne',
      commentaire: 'Vol test pour validation v2 Calpax',
      passagers: [{ prenom: 'Damien', nom: 'Cuenot', age: 39, poids: 99, pmr: false }],
      paiements: [],
    },
    {
      seq: 10,
      typePlannif: 'MATIN' as const,
      dateVolDeb: new Date('2026-05-05'),
      dateVolFin: new Date('2026-05-15'),
      payeurPrenom: 'Beatrice',
      payeurNom: 'Fournier',
      payeurEmail: 'bea.fournier@gmail.com',
      payeurTelephone: '0667890123',
      payeurVille: 'Chalon-sur-Saone',
      montantTtc: 680,
      categorie: 'Touristique',
      provenance: 'Web',
      passagers: [
        { prenom: 'Beatrice', nom: 'Fournier', age: 50, poids: 70, pmr: false },
        { prenom: 'Laurent', nom: 'Fournier', age: 52, poids: 88, pmr: false },
        { prenom: 'Camille', nom: 'Fournier', age: 22, poids: 55, pmr: false },
      ],
      paiements: [
        { mode: 'CHEQUE_VACANCES' as const, montant: 400, date: new Date('2026-04-20') },
        { mode: 'CB' as const, montant: 280, date: new Date('2026-04-20') },
      ],
    },
    {
      seq: 11,
      typePlannif: 'SOIR' as const,
      dateVolDeb: new Date('2026-06-10'),
      dateVolFin: new Date('2026-06-20'),
      payeurPrenom: 'Robert',
      payeurNom: 'Mercier',
      payeurEmail: null,
      payeurTelephone: '0656789012',
      payeurVille: 'Dole',
      montantTtc: 225,
      categorie: 'Touristique',
      provenance: 'Bouche a oreille',
      passagers: [{ prenom: 'Robert', nom: 'Mercier', age: 72, poids: 75, pmr: true }],
      paiements: [{ mode: 'ESPECES' as const, montant: 225, date: new Date('2026-04-18') }],
    },
    {
      seq: 12,
      typePlannif: 'MATIN' as const,
      dateVolDeb: new Date('2026-05-25'),
      dateVolFin: new Date('2026-06-05'),
      payeurPrenom: 'Vincent',
      payeurNom: 'Andre',
      payeurEmail: 'v.andre@outlook.com',
      payeurTelephone: '0623456789',
      payeurVille: 'Dijon',
      montantTtc: 450,
      categorie: 'Touristique',
      provenance: 'Web',
      passagers: [
        { prenom: 'Vincent', nom: 'Andre', age: 30, poids: 78, pmr: false },
        { prenom: 'Julie', nom: 'Andre', age: 29, poids: 54, pmr: false },
      ],
      paiements: [{ mode: 'CB' as const, montant: 225, date: new Date('2026-04-22') }],
    },
    {
      seq: 13,
      typePlannif: 'AU_PLUS_VITE' as const,
      dateVolDeb: new Date('2026-04-15'),
      dateVolFin: new Date('2026-07-31'),
      payeurPrenom: 'Monique',
      payeurNom: 'Blanc',
      payeurEmail: 'monique.blanc@sfr.fr',
      payeurTelephone: '0634567890',
      payeurVille: 'Poligny',
      montantTtc: 450,
      categorie: 'Touristique',
      provenance: 'Telephone',
      dateValidite: new Date('2026-09-30'),
      commentaire: 'Bon cadeau offert par ses enfants — pas de date fixe',
      passagers: [
        { prenom: 'Monique', nom: 'Blanc', age: 65, poids: 68, pmr: false },
        { prenom: 'Gerard', nom: 'Blanc', age: 68, poids: 80, pmr: false },
      ],
      paiements: [{ mode: 'CHEQUE' as const, montant: 450, date: new Date('2026-03-15') }],
    },
    {
      seq: 14,
      typePlannif: 'MATIN' as const,
      dateVolDeb: new Date('2026-05-15'),
      dateVolFin: new Date('2026-05-20'),
      payeurPrenom: 'Thomas',
      payeurNom: 'Lambert',
      payeurEmail: 'thomas.lambert@gmail.com',
      payeurTelephone: '0645098765',
      payeurVille: 'Auxonne',
      montantTtc: 225,
      categorie: 'Touristique',
      provenance: 'Web',
      passagers: [{ prenom: 'Thomas', nom: 'Lambert', age: 27, poids: 73, pmr: false }],
      paiements: [{ mode: 'CB' as const, montant: 225, date: new Date('2026-04-25') }],
    },
    {
      seq: 15,
      typePlannif: 'SOIR' as const,
      dateVolDeb: new Date('2026-06-05'),
      dateVolFin: new Date('2026-06-15'),
      payeurPrenom: 'Christophe',
      payeurNom: 'Perrin',
      payeurEmail: 'c.perrin@wanadoo.fr',
      payeurTelephone: '0676543210',
      payeurVille: 'Beaune',
      montantTtc: 900,
      categorie: 'Touristique',
      provenance: 'Partenaire',
      commentaire: 'Anniversaire de mariage — demande champagne a bord',
      passagers: [
        { prenom: 'Christophe', nom: 'Perrin', age: 48, poids: 86, pmr: false },
        { prenom: 'Valerie', nom: 'Perrin', age: 46, poids: 60, pmr: false },
        { prenom: 'Hugo', nom: 'Perrin', age: 18, poids: 72, pmr: false },
        { prenom: 'Manon', nom: 'Perrin', age: 16, poids: 52, pmr: false },
      ],
      paiements: [
        { mode: 'CB' as const, montant: 500, date: new Date('2026-04-10') },
        { mode: 'AVOIR' as const, montant: 200, date: new Date('2026-04-10') },
      ],
    },
  ]

  // Upsert sequence counter
  await prisma.billetSequence.upsert({
    where: { exploitantId_year: { exploitantId: cameronBalloons.id, year: 2026 } },
    update: { lastSeq: 15 },
    create: { exploitantId: cameronBalloons.id, year: 2026, lastSeq: 15 },
  })

  for (const b of billetsSeedData) {
    const reference = formatReference('CBF', 2026, b.seq)
    const checksum = computeLuhnChecksum(reference)

    const existing = await prisma.billet.findFirst({
      where: { exploitantId: cameronBalloons.id, reference },
    })
    if (existing) continue // skip if already seeded

    await prisma.billet.create({
      data: {
        exploitantId: cameronBalloons.id,
        reference,
        checksum,
        typePlannif: b.typePlannif,
        dateVolDeb: b.dateVolDeb,
        dateVolFin: b.dateVolFin,
        dateValidite: (b as Record<string, unknown>).dateValidite as Date | undefined,
        payeurPrenom: b.payeurPrenom,
        payeurNom: b.payeurNom,
        payeurEmail: b.payeurEmail,
        payeurTelephone: b.payeurTelephone,
        payeurVille: b.payeurVille,
        montantTtc: b.montantTtc,
        statut: b.paiements.length > 0 ? 'EN_ATTENTE' : 'EN_ATTENTE',
        statutPaiement:
          b.paiements.reduce((s, p) => s + p.montant, 0) >= b.montantTtc
            ? 'SOLDE'
            : b.paiements.length > 0
              ? 'PARTIEL'
              : 'EN_ATTENTE',
        categorie: b.categorie,
        provenance: b.provenance,
        commentaire: (b as Record<string, unknown>).commentaire as string | undefined,
        dateRappel: (b as Record<string, unknown>).dateRappel as Date | undefined,
        passagers: {
          create: b.passagers.map((p) => ({
            exploitantId: cameronBalloons.id,
            prenom: p.prenom,
            nom: p.nom,
            age: p.age,
            poidsEncrypted: encrypt(String(p.poids)),
            pmr: p.pmr,
          })),
        },
        paiements: {
          create: b.paiements.map((p) => ({
            exploitantId: cameronBalloons.id,
            modePaiement: p.mode,
            montantTtc: p.montant,
            datePaiement: p.date,
          })),
        },
      },
    })
  }

  console.log('  - 15 billets seeded for Cameron Balloons France')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
