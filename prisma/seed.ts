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
      update: { emailVerified: true },
      create: {
        email: u.email,
        name: u.name,
        role: u.role,
        exploitantId: cameronBalloons.id,
        emailVerified: true,
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

  // ---------------------------------------------------------------------------
  // Link pilotes to user accounts (required for PILOTE role filtering)
  // ---------------------------------------------------------------------------
  const piloteOlivier = await prisma.pilote.findFirst({
    where: { licenceBfcl: 'BFCL-CBF-001' },
  })
  if (piloteOlivier) {
    await prisma.pilote.update({
      where: { id: piloteOlivier.id },
      data: { userId: ownerUser.id },
    })
  }

  const piloteDemo = await prisma.user.findUnique({ where: { email: 'pilote@cameronfrance.com' } })
  const piloteEric = await prisma.pilote.findFirst({ where: { licenceBfcl: 'BFCL-CBF-002' } })
  if (piloteDemo && piloteEric) {
    await prisma.pilote.update({
      where: { id: piloteEric.id },
      data: { userId: piloteDemo.id },
    })
  }

  console.log('  - Pilotes linked to user accounts')

  // ---------------------------------------------------------------------------
  // Seed 8 vols for testing (today, past, future, various statuses)
  // ---------------------------------------------------------------------------
  const allBallons = await prisma.ballon.findMany({
    where: { exploitantId: cameronBalloons.id },
    orderBy: { immatriculation: 'asc' },
  })
  const allPilotes = await prisma.pilote.findMany({
    where: { exploitantId: cameronBalloons.id },
    orderBy: { licenceBfcl: 'asc' },
  })
  const allEquipiers = await prisma.equipier.findMany({
    where: { exploitantId: cameronBalloons.id },
  })
  const allSites = await prisma.siteDecollage.findMany({
    where: { exploitantId: cameronBalloons.id },
  })
  const allVehicules = await prisma.vehicule.findMany({
    where: { exploitantId: cameronBalloons.id },
  })

  // Helper: date relative to today
  function relDate(daysFromNow: number): Date {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    d.setDate(d.getDate() + daysFromNow)
    return d
  }

  const existingVols = await prisma.vol.count({
    where: { exploitantId: cameronBalloons.id },
  })

  if (existingVols === 0 && allBallons.length >= 3 && allPilotes.length >= 2) {
    const b0 = allBallons[0]! // F-HCBF
    const b1 = allBallons[1]! // F-HCDS
    const b2 = allBallons[2]! // F-HCPJ
    const b3 = allBallons[3]! // F-HFCC
    const b6 = allBallons[6]! // F-GVGD
    const b7 = allBallons[7]! // F-HACK
    const p0 = allPilotes[0]! // Olivier
    const p1 = allPilotes[1]! // Eric
    const p2 = allPilotes.length > 2 ? allPilotes[2]! : p0 // Max (or Olivier)
    const eq0 = allEquipiers[0]
    const site0 = allSites[0]
    const site1 = allSites.length > 1 ? allSites[1] : site0
    const veh0 = allVehicules[0]

    const volsData = [
      // Vol 1: TODAY MATIN — Olivier — PLANIFIE (dashboard test)
      {
        date: relDate(0),
        creneau: 'MATIN' as const,
        ballonId: b6.id,
        piloteId: p0.id,
        equipierId: eq0?.id,
        siteDecollageId: site0?.id,
        vehiculeId: veh0?.id,
        statut: 'PLANIFIE' as const,
      },
      // Vol 2: TODAY SOIR — Eric (pilote demo) — CONFIRME (post-vol test)
      {
        date: relDate(0),
        creneau: 'SOIR' as const,
        ballonId: b3.id,
        piloteId: p1.id,
        equipierId: eq0?.id,
        siteDecollageId: site1?.id,
        vehiculeId: veh0?.id,
        statut: 'CONFIRME' as const,
      },
      // Vol 3: YESTERDAY MATIN — Olivier — TERMINE (archive PVE test)
      {
        date: relDate(-1),
        creneau: 'MATIN' as const,
        ballonId: b7.id,
        piloteId: p0.id,
        siteDecollageId: site0?.id,
        statut: 'TERMINE' as const,
        decoLieu: 'Dole-Tavaux',
        decoHeure: new Date('2026-04-16T06:15:00'),
        atterLieu: 'Parcey',
        atterHeure: new Date('2026-04-16T07:30:00'),
        gasConso: 85,
        distance: 12,
        noteDansCarnet: true,
      },
      // Vol 4: 3 DAYS AGO — Eric — ARCHIVE (historique)
      {
        date: relDate(-3),
        creneau: 'SOIR' as const,
        ballonId: b2.id,
        piloteId: p1.id,
        siteDecollageId: site0?.id,
        statut: 'ARCHIVE' as const,
        decoLieu: 'Dole-Tavaux',
        decoHeure: new Date('2026-04-14T18:00:00'),
        atterLieu: 'Brevans',
        atterHeure: new Date('2026-04-14T19:15:00'),
        gasConso: 60,
        distance: 8,
        noteDansCarnet: true,
      },
      // Vol 5: TOMORROW MATIN — Olivier — PLANIFIE (futur)
      {
        date: relDate(1),
        creneau: 'MATIN' as const,
        ballonId: b0.id,
        piloteId: p0.id,
        equipierId: eq0?.id,
        siteDecollageId: site0?.id,
        statut: 'PLANIFIE' as const,
      },
      // Vol 6: IN 3 DAYS SOIR — Eric — PLANIFIE (futur)
      {
        date: relDate(3),
        creneau: 'SOIR' as const,
        ballonId: b1.id,
        piloteId: p1.id,
        siteDecollageId: site1?.id,
        statut: 'PLANIFIE' as const,
      },
      // Vol 7: 5 DAYS AGO — Max — ANNULE (annulation test)
      {
        date: relDate(-5),
        creneau: 'MATIN' as const,
        ballonId: b6.id,
        piloteId: p2.id,
        statut: 'ANNULE' as const,
        cancelReason: 'Météo',
        meteoAlert: false,
      },
      // Vol 8: TODAY MATIN — meteo alert test (vent fort)
      {
        date: relDate(0),
        creneau: 'MATIN' as const,
        ballonId: b0.id,
        piloteId: p2.id,
        siteDecollageId: site0?.id,
        statut: 'PLANIFIE' as const,
        meteoAlert: true,
      },
    ]

    for (const volData of volsData) {
      // Check unique constraint (exploitantId, date, creneau, ballonId)
      const existing = await prisma.vol.findFirst({
        where: {
          exploitantId: cameronBalloons.id,
          date: volData.date,
          creneau: volData.creneau,
          ballonId: volData.ballonId,
        },
      })
      if (!existing) {
        await prisma.vol.create({
          data: {
            ...volData,
            exploitantId: cameronBalloons.id,
          },
        })
      }
    }

    // Assign some passagers to today's vols
    const todayVols = await prisma.vol.findMany({
      where: {
        exploitantId: cameronBalloons.id,
        date: relDate(0),
        statut: { not: 'ANNULE' },
      },
      orderBy: { creneau: 'asc' },
    })

    const unassignedPassagers = await prisma.passager.findMany({
      where: { exploitantId: cameronBalloons.id, volId: null },
      take: 6,
    })

    // Assign first 3 passagers to vol 1 (today matin), next 2 to vol 2 (today soir)
    if (todayVols.length >= 2 && unassignedPassagers.length >= 5) {
      for (let i = 0; i < 3 && i < unassignedPassagers.length; i++) {
        await prisma.passager.update({
          where: { id: unassignedPassagers[i]!.id },
          data: { volId: todayVols[0]!.id },
        })
      }
      for (let i = 3; i < 5 && i < unassignedPassagers.length; i++) {
        await prisma.passager.update({
          where: { id: unassignedPassagers[i]!.id },
          data: { volId: todayVols[1]!.id },
        })
      }
    }

    console.log('  - 8 vols seeded (2 today, 2 future, 2 past, 1 cancelled, 1 meteo alert)')
    console.log("  - Passagers assigned to today's vols")
  } else if (existingVols > 0) {
    console.log(`  - Skipped vol seeding (${existingVols} vols already exist)`)
  }

  // ===========================================================================
  // DEMO ORG — "Demo Montgolfière" (FR.DEC.DEMO)
  // Separate test/demo tenant for Olivier to explore features without touching
  // the real Cameron Balloons data (which will receive the v1 import).
  // ===========================================================================

  const demoOrg = await prisma.exploitant.upsert({
    where: { frDecNumber: 'FR.DEC.DEMO' },
    update: {},
    create: {
      name: 'Demo Montgolfière',
      frDecNumber: 'FR.DEC.DEMO',
      siret: '12345678900000',
      numCamo: 'OSAC',
      adresse: '1 rue du Ballon',
      codePostal: '39100',
      ville: 'Dole',
      contactName: 'Olivier Demo',
      billetPrefix: 'DEM',
      meteoLatitude: 47.0833,
      meteoLongitude: 5.4833,
      meteoSeuilVent: 15,
    },
  })

  // Demo users
  const demoUsers = [
    { email: 'demo-gerant@calpax.fr', name: 'Olivier Demo', role: 'GERANT' as const },
    { email: 'damien@cameronfrance.com', name: 'Damien Cuenot', role: 'PILOTE' as const },
    { email: 'demo-pilote@calpax.fr', name: 'Pierre Pilote', role: 'PILOTE' as const },
    { email: 'demo-equipier@calpax.fr', name: 'Lucas Equipier', role: 'EQUIPIER' as const },
  ]

  const demoUserRecords: Record<string, { id: string }> = {}
  for (const u of demoUsers) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: {
        email: u.email,
        name: u.name,
        role: u.role,
        exploitantId: demoOrg.id,
        emailVerified: true,
      },
    })
    demoUserRecords[u.email] = user

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

  // Demo ballons (3)
  const demoBallons = [
    {
      immatriculation: 'F-DEMO1',
      nom: 'Grand Bleu (Z-105)',
      volumeM3: 3000,
      peseeAVide: 370,
      configGaz: '4xCB2990 : 4x23 kg',
      manexAnnexRef: 'Demo Annexe 1',
      nbPassagerMax: 4,
      performanceChart: {
        '10': 480,
        '15': 420,
        '20': 365,
        '25': 310,
        '30': 256,
        '34': 214,
      },
      camoExpiryDate: new Date('2027-06-01'),
    },
    {
      immatriculation: 'F-DEMO2',
      nom: 'Petit Prince (Z-77)',
      volumeM3: 2200,
      peseeAVide: 340,
      configGaz: '4xCB2990 : 4x23 kg',
      manexAnnexRef: 'Demo Annexe 2',
      nbPassagerMax: 2,
      performanceChart: {
        '10': 287,
        '15': 244,
        '20': 201,
        '25': 161,
        '30': 121,
        '34': 91,
      },
      camoExpiryDate: new Date('2026-05-10'), // WARNING ~23j
    },
    {
      immatriculation: 'F-DEMO3',
      nom: 'Jura Explorer (Z-225)',
      volumeM3: 6400,
      peseeAVide: 750,
      configGaz: '4xCB2903 : 4x36 kg',
      manexAnnexRef: 'Demo Annexe 3',
      nbPassagerMax: 12,
      performanceChart: {
        '10': 1090,
        '15': 965,
        '20': 842,
        '25': 723,
        '30': 607,
        '34': 518,
      },
      camoExpiryDate: new Date('2027-01-01'),
    },
  ]

  const demoBallonRecords = []
  for (const b of demoBallons) {
    const existing = await prisma.ballon.findFirst({
      where: { exploitantId: demoOrg.id, immatriculation: b.immatriculation },
    })
    if (!existing) {
      demoBallonRecords.push(
        await prisma.ballon.create({
          data: { ...b, exploitantId: demoOrg.id, camoOrganisme: 'OSAC', actif: true },
        }),
      )
    } else {
      demoBallonRecords.push(existing)
    }
  }

  // Demo pilotes (3)
  const demoPiloteRecords = []
  const demoPilotesData = [
    {
      prenom: 'Olivier',
      nom: 'Demo',
      poids: 85,
      telephone: '0600000001',
      email: 'demo-gerant@calpax.fr',
      licenceBfcl: 'BFCL-DEMO-001',
      qualificationCommerciale: true,
      classeA: true,
      groupeA1: true,
      groupeA2: true,
      groupeA3: true,
      heuresDeVol: 1500,
      dateExpirationLicence: new Date('2027-12-31'),
      userId: demoUserRecords['demo-gerant@calpax.fr']?.id,
    },
    {
      prenom: 'Damien',
      nom: 'Cuenot',
      poids: 99,
      telephone: '0680344117',
      email: 'damien@cameronfrance.com',
      licenceBfcl: 'BFCL-DEMO-003',
      qualificationCommerciale: true,
      classeA: true,
      groupeA1: true,
      groupeA2: true,
      groupeA3: true,
      heuresDeVol: 200,
      dateExpirationLicence: new Date('2027-06-15'),
      userId: demoUserRecords['damien@cameronfrance.com']?.id,
    },
    {
      prenom: 'Pierre',
      nom: 'Pilote',
      poids: 78,
      telephone: '0600000002',
      email: 'demo-pilote@calpax.fr',
      licenceBfcl: 'BFCL-DEMO-002',
      qualificationCommerciale: true,
      classeA: true,
      groupeA1: true,
      groupeA2: true,
      heuresDeVol: 600,
      dateExpirationLicence: new Date('2026-05-20'), // WARNING ~33j
      userId: demoUserRecords['demo-pilote@calpax.fr']?.id,
    },
  ]

  for (const p of demoPilotesData) {
    const { poids, telephone, email, userId, ...rest } = p
    const existing = await prisma.pilote.findFirst({ where: { licenceBfcl: p.licenceBfcl } })
    const data = {
      ...rest,
      exploitantId: demoOrg.id,
      poidsEncrypted: encrypt(String(poids)),
      ...(telephone ? { telephone } : {}),
      ...(email ? { email } : {}),
      ...(userId ? { userId } : {}),
      actif: true,
    }
    if (existing) {
      demoPiloteRecords.push(await prisma.pilote.update({ where: { id: existing.id }, data }))
    } else {
      demoPiloteRecords.push(await prisma.pilote.create({ data }))
    }
  }

  // Demo equipier + vehicule + site
  const demoEq = await prisma.equipier.findFirst({
    where: { exploitantId: demoOrg.id, prenom: 'Lucas' },
  })
  const demoEquipier =
    demoEq ??
    (await prisma.equipier.create({
      data: { prenom: 'Lucas', nom: 'Equipier', telephone: '0600000003', exploitantId: demoOrg.id },
    }))

  const demoVeh = await prisma.vehicule.findFirst({
    where: { exploitantId: demoOrg.id, nom: 'Renault Master Demo' },
  })
  const demoVehicule =
    demoVeh ??
    (await prisma.vehicule.create({
      data: { nom: 'Renault Master Demo', immatriculation: 'XX-000-XX', exploitantId: demoOrg.id },
    }))

  const demoSiteRec = await prisma.siteDecollage.findFirst({
    where: { exploitantId: demoOrg.id, nom: 'Terrain Demo Dole' },
  })
  const demoSite =
    demoSiteRec ??
    (await prisma.siteDecollage.create({
      data: {
        nom: 'Terrain Demo Dole',
        adresse: 'Route de Tavaux, 39100 Dole',
        latitude: 47.0389,
        longitude: 5.4275,
        exploitantId: demoOrg.id,
      },
    }))

  // Demo billets (6) with passagers + paiements
  const demoBilletCount = await prisma.billet.count({ where: { exploitantId: demoOrg.id } })
  if (demoBilletCount === 0) {
    await prisma.billetSequence.upsert({
      where: { exploitantId_year: { exploitantId: demoOrg.id, year: 2026 } },
      update: { lastSeq: 6 },
      create: { exploitantId: demoOrg.id, year: 2026, lastSeq: 6 },
    })

    const demoBilletsData = [
      {
        seq: 1,
        typePlannif: 'MATIN' as const,
        dateVolDeb: relDate(0),
        dateVolFin: relDate(5),
        payeurPrenom: 'Jean',
        payeurNom: 'Dupont',
        payeurEmail: 'jean.dupont@example.com',
        payeurTelephone: '0612345678',
        payeurVille: 'Dole',
        montantTtc: 450,
        categorie: 'Touristique',
        provenance: 'Telephone',
        passagers: [
          { prenom: 'Jean', nom: 'Dupont', age: 45, poids: 82, pmr: false },
          { prenom: 'Marie', nom: 'Dupont', age: 42, poids: 60, pmr: false },
        ],
        paiements: [{ mode: 'CB' as const, montant: 450, date: relDate(-5) }],
      },
      {
        seq: 2,
        typePlannif: 'SOIR' as const,
        dateVolDeb: relDate(0),
        dateVolFin: relDate(7),
        payeurPrenom: 'Sophie',
        payeurNom: 'Martin',
        payeurEmail: 'sophie.martin@example.com',
        payeurTelephone: '0687654321',
        payeurVille: 'Besancon',
        montantTtc: 680,
        categorie: 'Touristique',
        provenance: 'Web',
        passagers: [
          { prenom: 'Sophie', nom: 'Martin', age: 35, poids: 58, pmr: false },
          { prenom: 'Lucas', nom: 'Martin', age: 38, poids: 82, pmr: false },
          { prenom: 'Emma', nom: 'Martin', age: 12, poids: 40, pmr: false },
        ],
        paiements: [{ mode: 'CB' as const, montant: 340, date: relDate(-3) }],
      },
      {
        seq: 3,
        typePlannif: 'MATIN' as const,
        dateVolDeb: relDate(2),
        dateVolFin: relDate(10),
        payeurPrenom: 'Philippe',
        payeurNom: 'Moreau',
        payeurEmail: 'p.moreau@example.com',
        payeurTelephone: '0654321098',
        payeurVille: 'Lyon',
        montantTtc: 900,
        categorie: 'Evenementiel',
        provenance: 'Entreprise',
        commentaire: 'Team building — 4 personnes',
        passagers: [
          { prenom: 'Philippe', nom: 'Moreau', age: 45, poids: 90, pmr: false },
          { prenom: 'Claire', nom: 'Dubois', age: 28, poids: 55, pmr: false },
          { prenom: 'Julien', nom: 'Garcia', age: 41, poids: 88, pmr: false },
          { prenom: 'Isabelle', nom: 'Petit', age: 36, poids: 60, pmr: false },
        ],
        paiements: [{ mode: 'VIREMENT' as const, montant: 900, date: relDate(-1) }],
      },
      {
        seq: 4,
        typePlannif: 'AU_PLUS_VITE' as const,
        dateVolDeb: relDate(-5),
        dateVolFin: relDate(30),
        payeurPrenom: 'Monique',
        payeurNom: 'Blanc',
        payeurEmail: null,
        payeurTelephone: '0634567890',
        payeurVille: 'Poligny',
        montantTtc: 450,
        categorie: 'Touristique',
        provenance: 'Telephone',
        commentaire: 'Bon cadeau — pas de date fixe',
        passagers: [
          { prenom: 'Monique', nom: 'Blanc', age: 65, poids: 68, pmr: false },
          { prenom: 'Gerard', nom: 'Blanc', age: 68, poids: 80, pmr: false },
        ],
        paiements: [{ mode: 'CHEQUE' as const, montant: 450, date: relDate(-10) }],
      },
      {
        seq: 5,
        typePlannif: 'SOIR' as const,
        dateVolDeb: relDate(5),
        dateVolFin: relDate(15),
        payeurPrenom: 'Robert',
        payeurNom: 'Mercier',
        payeurEmail: null,
        payeurTelephone: '0656789012',
        payeurVille: 'Dole',
        montantTtc: 225,
        categorie: 'Touristique',
        provenance: 'Bouche a oreille',
        passagers: [{ prenom: 'Robert', nom: 'Mercier', age: 72, poids: 75, pmr: true }],
        paiements: [{ mode: 'ESPECES' as const, montant: 100, date: relDate(-2) }],
      },
      {
        seq: 6,
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
        dateRappel: relDate(3),
        commentaire: 'Rappeler pour fixer les dates',
        passagers: [
          { prenom: 'Eric', nom: 'Rousseau', age: 44, poids: 95, pmr: false },
          { prenom: 'Sandrine', nom: 'Rousseau', age: 42, poids: 65, pmr: false },
        ],
        paiements: [],
      },
    ]

    for (const b of demoBilletsData) {
      const reference = formatReference('DEM', 2026, b.seq)
      const checksum = computeLuhnChecksum(reference)
      await prisma.billet.create({
        data: {
          exploitantId: demoOrg.id,
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
          statut: 'EN_ATTENTE',
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
              exploitantId: demoOrg.id,
              prenom: p.prenom,
              nom: p.nom,
              age: p.age,
              poidsEncrypted: encrypt(String(p.poids)),
              pmr: p.pmr,
            })),
          },
          paiements: {
            create: b.paiements.map((p) => ({
              exploitantId: demoOrg.id,
              modePaiement: p.mode,
              montantTtc: p.montant,
              datePaiement: p.date,
            })),
          },
        },
      })
    }
  }

  // Demo vols (6)
  const demoVolCount = await prisma.vol.count({ where: { exploitantId: demoOrg.id } })
  if (demoVolCount === 0 && demoBallonRecords.length >= 3 && demoPiloteRecords.length >= 2) {
    const dp0 = demoPiloteRecords[0]! // Olivier Demo
    const dp1 = demoPiloteRecords[1]! // Pierre Pilote
    const db0 = demoBallonRecords[0]! // Grand Bleu
    const db1 = demoBallonRecords[1]! // Petit Prince
    const db2 = demoBallonRecords[2]! // Jura Explorer

    const demoVolsData = [
      // Today MATIN — Olivier — PLANIFIE
      {
        date: relDate(0),
        creneau: 'MATIN' as const,
        ballonId: db0.id,
        piloteId: dp0.id,
        equipierId: demoEquipier.id,
        siteDecollageId: demoSite.id,
        vehiculeId: demoVehicule.id,
        statut: 'PLANIFIE' as const,
      },
      // Today SOIR — Pierre — CONFIRME (test post-vol)
      {
        date: relDate(0),
        creneau: 'SOIR' as const,
        ballonId: db2.id,
        piloteId: dp1.id,
        equipierId: demoEquipier.id,
        siteDecollageId: demoSite.id,
        statut: 'CONFIRME' as const,
      },
      // Yesterday — Olivier — TERMINE (test archive PVE)
      {
        date: relDate(-1),
        creneau: 'MATIN' as const,
        ballonId: db0.id,
        piloteId: dp0.id,
        siteDecollageId: demoSite.id,
        statut: 'TERMINE' as const,
        decoLieu: 'Terrain Demo Dole',
        decoHeure: new Date(Date.now() - 86400000 + 6 * 3600000),
        atterLieu: 'Parcey',
        atterHeure: new Date(Date.now() - 86400000 + 7.5 * 3600000),
        gasConso: 70,
        distance: 10,
        noteDansCarnet: true,
      },
      // Tomorrow — Pierre — PLANIFIE
      {
        date: relDate(1),
        creneau: 'SOIR' as const,
        ballonId: db1.id,
        piloteId: dp1.id,
        siteDecollageId: demoSite.id,
        statut: 'PLANIFIE' as const,
      },
      // In 3 days — Olivier — PLANIFIE
      {
        date: relDate(3),
        creneau: 'MATIN' as const,
        ballonId: db2.id,
        piloteId: dp0.id,
        equipierId: demoEquipier.id,
        siteDecollageId: demoSite.id,
        vehiculeId: demoVehicule.id,
        statut: 'PLANIFIE' as const,
      },
      // Today — meteo alert
      {
        date: relDate(0),
        creneau: 'MATIN' as const,
        ballonId: db1.id,
        piloteId: dp1.id,
        siteDecollageId: demoSite.id,
        statut: 'PLANIFIE' as const,
        meteoAlert: true,
      },
    ]

    for (const v of demoVolsData) {
      const existing = await prisma.vol.findFirst({
        where: { exploitantId: demoOrg.id, date: v.date, creneau: v.creneau, ballonId: v.ballonId },
      })
      if (!existing) {
        await prisma.vol.create({ data: { ...v, exploitantId: demoOrg.id } })
      }
    }

    // Assign passagers to today's demo vols
    const demoTodayVols = await prisma.vol.findMany({
      where: { exploitantId: demoOrg.id, date: relDate(0), statut: { not: 'ANNULE' } },
      orderBy: { creneau: 'asc' },
    })
    const demoUnassigned = await prisma.passager.findMany({
      where: { exploitantId: demoOrg.id, volId: null },
      take: 5,
    })
    if (demoTodayVols.length >= 2 && demoUnassigned.length >= 4) {
      for (let i = 0; i < 2 && i < demoUnassigned.length; i++) {
        await prisma.passager.update({
          where: { id: demoUnassigned[i]!.id },
          data: { volId: demoTodayVols[0]!.id },
        })
      }
      for (let i = 2; i < 4 && i < demoUnassigned.length; i++) {
        await prisma.passager.update({
          where: { id: demoUnassigned[i]!.id },
          data: { volId: demoTodayVols[1]!.id },
        })
      }
    }
  }

  console.log('')
  console.log('Demo org "Demo Montgolfière" (FR.DEC.DEMO):')
  console.log('  - 3 users: demo-gerant / demo-pilote / demo-equipier @calpax.fr')
  console.log('  - 3 ballons, 2 pilotes, 1 equipier, 1 vehicule, 1 site')
  console.log('  - 6 billets with passagers + paiements')
  console.log('  - 6 vols (2 today, 1 yesterday TERMINE, 2 future, 1 meteo alert)')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
