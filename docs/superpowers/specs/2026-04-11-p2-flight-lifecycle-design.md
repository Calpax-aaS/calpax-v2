# P2 — Back-office flight lifecycle (design spec)

**Date:** 2026-04-11
**Phase:** P2 of the Calpax v2 roadmap (see `2026-04-09-calpax-roadmap-decomposition.md`)
**Goal:** reproduce Olivier's v1 workflow end-to-end in the v2 back-office. Billet with weather-deferred scheduling, partial payments, vol planning with temperature-aware devis de masse, fiche de vol PDF generation, post-flight PVE archival.
**Status:** design agreed during brainstorming session on 2026-04-11.
**Decomposition:** P2 is split into 3 sub-phases (P2a, P2b, P2c), each with its own implementation plan.

---

## 1. Decisions from brainstorming

| Sujet              | Choix                                                              | Raison                                                       |
| ------------------ | ------------------------------------------------------------------ | ------------------------------------------------------------ |
| Modele reservation | v1 fidele — billet avec fenetre + affectation manuelle billet-vol  | Vrai workflow metier, necessaire pour P3                     |
| Roles passagers    | payeur + passager(s) uniquement                                    | Suffisant pour back-office, roles supplementaires en P3+     |
| Modes paiement     | 6 modes v1 (especes, cheque, CB, virement, cheque-vacances, avoir) | Juste un enum, Olivier les utilise tous                      |
| Generation PDF     | @react-pdf/renderer                                                | Ecosysteme React, leger sur Vercel, composants reutilisables |
| Planning vols      | Grille semaine custom (7j x 2 creneaux matin/soir)                 | Colle au metier ballon, plus leger que FullCalendar          |
| Statuts vol        | 4 essentiels (PLANIFIE, CONFIRME, TERMINE, ARCHIVE) + ANNULE       | EN_PREPARATION/EN_VOL inutiles sans app pilote               |
| PVE workflow       | Deux etapes : TERMINE (saisie) puis ARCHIVE (generation PDF final) | Permet correction avant archivage definitif                  |
| Stockage PDF       | Supabase Storage (bucket prive, URL signees)                       | Evite d'alourdir la DB avec des centaines de PDF             |
| Decomposition      | 3 sous-phases (P2a/P2b/P2c)                                        | Plans plus petits, checkpoints entre chaque                  |

---

## 2. Success criteria (P2 done)

- [ ] Billet CRUD fonctionnel : creation avec typePlannif, fenetre de dates, reference auto-generee, checksum
- [ ] Passagers multiples par billet : nom, age, poids (chiffre), PMR, contact
- [ ] Paiements partiels : multi-row par billet, 6 modes, solde calcule, remboursements
- [ ] Cron rappel email : scan quotidien dateRappel, email a l'exploitant
- [ ] RGPD droits interface : acces, rectification, effacement, export des donnees passagers
- [ ] Vol CRUD : ballon + pilote + creneau + lieu decollage
- [ ] Validation creation vol : rejet si licence BFCL expiree ou CAMO ballon expire ou groupe ballon non couvert par le pilote
- [ ] Planning semaine : grille 7j x 2 creneaux (matin/soir), vols affiches avec badges
- [ ] Organisation vol : UI d'affectation billets en attente vers un vol confirme
- [ ] Devis de masse : calcul temperature-aware avec test vectors des 9 ballons Cameron
- [ ] Fiche de vol PDF : header exploitant, tableau devis de masse, liste passagers, page meteo placeholder, VISA CDB
- [ ] Post-vol : formulaire saisie (deco/atterro lieu+heure, gaz conso, anomalies)
- [ ] PVE : generation PDF final + archivage Supabase Storage + statut ARCHIVE
- [ ] Journal de bord ballon : vue filtree des vols par ballon avec statuts
- [ ] Audit trail UI : consultation audit_log par entite
- [ ] Tenant isolation sur toutes les nouvelles entites (Billet, Passager, Paiement, Vol)
- [ ] Tests : devis de masse test vectors, PDF golden-file snapshots, tenant isolation integration tests
- [ ] Deploye et verifie sur calpax.fr

---

## 3. Schema changes

### 3.1 Enums

```prisma
enum TypePlannif {
  MATIN
  SOIR
  TOUTE_LA_JOURNEE
  AU_PLUS_VITE
  AUTRE
  INDETERMINE
}

enum StatutBillet {
  EN_ATTENTE        // billet cree, pas encore planifie
  PLANIFIE          // affecte a un vol
  VOLE              // vol effectue
  ANNULE            // annulation (meteo, client, etc.)
  REMBOURSE         // remboursement effectue
  EXPIRE            // dateValidite depassee sans vol
}

enum StatutPaiement {
  EN_ATTENTE        // paiement pas encore recu
  PARTIEL           // acompte recu, solde restant
  SOLDE             // integralement paye
  REMBOURSE         // remboursement effectue
}

enum ModePaiement {
  ESPECES
  CHEQUE
  CB
  VIREMENT
  CHEQUE_VACANCES
  AVOIR
}

enum StatutVol {
  PLANIFIE          // cree, ballon + pilote assignes
  CONFIRME          // passagers affectes, devis de masse OK
  TERMINE           // post-vol saisi (deco/atterro/gaz)
  ARCHIVE           // PVE PDF genere et archive
  ANNULE            // vol annule
}

enum Creneau {
  MATIN
  SOIR
}
```

### 3.2 Billet

```prisma
model Billet {
  id              String         @id @default(cuid())
  exploitantId    String
  exploitant      Exploitant     @relation(fields: [exploitantId], references: [id], onDelete: Cascade)

  // Reference unique visible client (ex: "CBF-2026-0042")
  reference       String
  checksum        String         // verification digit for reference

  // Scheduling
  typePlannif     TypePlannif    @default(INDETERMINE)
  dateVolDeb      DateTime?      // debut fenetre de disponibilite
  dateVolFin      DateTime?      // fin fenetre de disponibilite
  dateValidite    DateTime?      // date limite d'utilisation (bons cadeaux)
  creneau         Creneau?       // preference matin/soir (nullable = pas de preference)

  // Payeur
  payeurCiv       String?        // civilite (M., Mme, etc.)
  payeurPrenom    String
  payeurNom       String
  payeurEmail     String?
  payeurTelephone String?
  payeurAdresse   String?
  payeurCp        String?
  payeurVille     String?

  // Status
  statut          StatutBillet   @default(EN_ATTENTE)
  statutPaiement  StatutPaiement @default(EN_ATTENTE)
  montantTtc      Int            // montant total en centimes
  enAttente       Boolean        @default(false) // flag "on hold" explicite

  // Metadata
  categorie       String?        // ex: "Touristique", "Evenementiel"
  provenance      String?        // ex: "Web", "Telephone", "Partenaire"
  lieuDecollage   String?        // preference lieu de decollage
  survol          String?        // zone souhaitee de survol
  commentaire     String?        // notes libres
  dateRappel      DateTime?      // date de rappel pour cron email

  // Relations
  passagers       Passager[]
  paiements       Paiement[]

  createdAt       DateTime       @default(now())
  updatedAt       DateTime       @updatedAt

  @@unique([exploitantId, reference])
  @@index([exploitantId])
  @@index([exploitantId, statut])
  @@index([exploitantId, dateRappel])
  @@map("billet")
}
```

**Design notes:**

- `montantTtc` en centimes (int) pour eviter les problemes de float. 15000 = 150,00 EUR.
- `reference` est unique par exploitant, generee cote serveur : `{prefixe exploitant}-{annee}-{sequence}`.
- `checksum` : Luhn ou CRC simple pour verification orale par telephone.
- Le payeur est stocke directement sur le billet (pas dans passagers) car c'est le contact commercial principal. Plus simple que de chercher le flag payeur dans les passagers.
- `dateValidite` sert pour les bons cadeaux : le billet expire si non utilise avant cette date.

### 3.3 Passager

```prisma
model Passager {
  id              String    @id @default(cuid())
  exploitantId    String
  exploitant      Exploitant @relation(fields: [exploitantId], references: [id], onDelete: Cascade)
  billetId        String
  billet          Billet    @relation(fields: [billetId], references: [id], onDelete: Cascade)

  prenom          String
  nom             String
  email           String?
  telephone       String?
  age             Int?
  poidsEncrypted  String?   // AES-256-GCM via lib/crypto
  pmr             Boolean   @default(false)

  // Vol assignment (nullable = pas encore affecte a un vol)
  volId           String?
  vol             Vol?      @relation(fields: [volId], references: [id])

  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  @@index([exploitantId])
  @@index([billetId])
  @@index([volId])
  @@map("passager")
}
```

**Design notes:**

- `volId` nullable : le passager est cree avec le billet, puis affecte a un vol lors de l'organisation. Pas de table de jonction `passager_vol` — une FK directe suffit (un passager ne vole qu'une fois par billet).
- `poidsEncrypted` : meme pattern que `Pilote.poidsEncrypted`. Chiffre en base, dechiffre dans le service layer pour le devis de masse.
- `onDelete: Cascade` depuis Billet : supprimer un billet supprime ses passagers.

### 3.4 Paiement

```prisma
model Paiement {
  id                String       @id @default(cuid())
  exploitantId      String
  exploitant        Exploitant   @relation(fields: [exploitantId], references: [id], onDelete: Cascade)
  billetId          String
  billet            Billet       @relation(fields: [billetId], references: [id], onDelete: Cascade)

  modePaiement      ModePaiement
  montantTtc        Int          // en centimes
  datePaiement      DateTime     // date du paiement
  dateEncaissement  DateTime?    // date d'encaissement effectif (cheques)
  commentaire       String?

  createdAt         DateTime     @default(now())
  updatedAt         DateTime     @updatedAt

  @@index([exploitantId])
  @@index([billetId])
  @@map("paiement")
}
```

**Design notes:**

- `datePaiement` vs `dateEncaissement` : important pour les cheques (date remise vs date encaissement). CB/especes : les deux sont identiques.
- Montant en centimes, coherent avec Billet.
- Un remboursement est un paiement avec montant negatif (simple, pas de table separee).

### 3.5 Vol

```prisma
model Vol {
  id              String     @id @default(cuid())
  exploitantId    String
  exploitant      Exploitant @relation(fields: [exploitantId], references: [id], onDelete: Cascade)

  date            DateTime   @db.Date
  creneau         Creneau
  statut          StatutVol  @default(PLANIFIE)

  // Equipage
  ballonId        String
  ballon          Ballon     @relation(fields: [ballonId], references: [id])
  piloteId        String
  pilote          Pilote     @relation(fields: [piloteId], references: [id])
  equipier        String?    // nom de l'equipier sol (texte libre pour P2)
  vehicule        String?    // vehicule de recuperation (texte libre pour P2)

  // Gaz
  configGaz       String?    // config gaz specifique si differente du ballon
  qteGaz          Int?       // quantite gaz embarque en kg

  // Lieu
  lieuDecollage   String?

  // Post-vol (saisi apres le vol, etape TERMINE)
  decoLieu        String?
  decoHeure       DateTime?
  atterLieu       String?
  atterHeure      DateTime?
  distance        Int?       // distance parcourue en km (estimee)
  gasConso        Int?       // consommation gaz en kg
  anomalies       String?    // texte libre, anomalies constatees
  noteDansCarnet  Boolean    @default(false)

  // PVE archive
  pvePdfUrl       String?    // Supabase Storage URL du PDF archive
  pveArchivedAt   DateTime?  // date d'archivage

  // Passagers affectes
  passagers       Passager[]

  createdAt       DateTime   @default(now())
  updatedAt       DateTime   @updatedAt

  @@unique([exploitantId, date, creneau, ballonId])
  @@index([exploitantId])
  @@index([exploitantId, date])
  @@map("vol")
}
```

**Design notes:**

- `@@unique([exploitantId, date, creneau, ballonId])` : un ballon ne peut pas faire deux vols le meme jour au meme creneau.
- `equipier` et `vehicule` en texte libre pour P2. En v1 ce sont des entites, mais la complexite ne se justifie pas maintenant — on formalisera si Olivier le demande.
- `date` avec `@db.Date` : pas besoin de l'heure dans la date du vol (le creneau suffit).
- `pvePdfUrl` : URL Supabase Storage du PDF archive. Null tant que le vol n'est pas en ARCHIVE.
- Les champs post-vol (`decoLieu`, `decoHeure`, etc.) sont null tant que le vol n'est pas TERMINE.

### 3.6 Relations ajoutees aux modeles existants

```prisma
// Ajouter a Exploitant
billets     Billet[]
paiements   Paiement[]
passagers   Passager[]
vols        Vol[]

// Ajouter a Ballon
vols        Vol[]

// Ajouter a Pilote
vols        Vol[]
```

### 3.7 TENANT_FILTER update

```ts
export const TENANT_FILTER: Record<string, string> = {
  Exploitant: 'id',
  User: 'exploitantId',
  AuditLog: 'exploitantId',
  Ballon: 'exploitantId',
  Pilote: 'exploitantId',
  Billet: 'exploitantId',
  Passager: 'exploitantId',
  Paiement: 'exploitantId',
  Vol: 'exploitantId',
}
```

---

## 4. P2a — Billets, passagers, paiements

### 4.1 Billet reference generation

```ts
// lib/billet/reference.ts

function generateReference(prefix: string, sequence: number): string
// Format: "{PREFIX}-{YYYY}-{SEQ:4}" ex: "CBF-2026-0042"
// prefix = exploitant configurable (default: 3 premieres lettres du nom)
// sequence = auto-increment par exploitant par annee

function computeChecksum(reference: string): string
// Luhn mod 10 sur les caracteres numeriques de la reference
// Sert a la verification orale par telephone
```

Sequence stockee dans une table `BilletSequence(exploitantId, year, lastSeq)` avec increment atomique (`UPDATE ... SET lastSeq = lastSeq + 1 RETURNING lastSeq`). Pas de count+1 (race condition sous concurrence). Le `@@unique([exploitantId, reference])` sur Billet sert de filet de securite.

### 4.2 Billet CRUD UI

**Liste billets** (`app/[locale]/(app)/billets/page.tsx`)

- Tableau : reference, payeur (nom), nb passagers, montant TTC, statut billet, statut paiement, dates, typePlannif
- Filtres : statut, typePlannif, plage de dates
- Tri par date de creation (desc par defaut)
- Badge couleur par statut (vert=vole, orange=en attente, rouge=annule, gris=expire)
- Bouton "Nouveau billet"

**Creation/edition billet** (`app/[locale]/(app)/billets/[id]/edit/page.tsx`)

- Section payeur : civ, prenom, nom, email, telephone, adresse
- Section planification : typePlannif (select), dateVolDeb, dateVolFin, creneau (optionnel), dateValidite, lieuDecollage, survol
- Section passagers : tableau editable inline (ajouter/supprimer des lignes). Colonnes : prenom, nom, age, poids, PMR (checkbox), email, telephone. Le payeur peut etre coche "est aussi passager" pour eviter la double saisie.
- Section metadata : categorie, provenance, montantTtc, commentaire, dateRappel
- Bouton "Enregistrer"

**Detail billet** (`app/[locale]/(app)/billets/[id]/page.tsx`)

- Vue lecture seule avec toutes les sections
- Historique paiements en bas
- Bouton "Ajouter un paiement"
- Bouton "Modifier"
- Lien vers le vol affecte (si planifie)

### 4.3 Passager : chiffrement poids

Meme pattern que `Pilote.poidsEncrypted` :

```ts
// lib/passager/crypto.ts
function encryptPoids(kg: number): string // encrypt(kg.toString())
function decryptPoids(encrypted: string): number // parseInt(decrypt(encrypted))
```

Le formulaire affiche un champ number normal. Le chiffrement est transparent cote serveur.

### 4.4 Paiement CRUD

Pas de page dediee — les paiements sont geres depuis la page detail du billet.

**Formulaire ajout paiement** (modal ou section inline) :

- Mode de paiement (select : 6 options)
- Montant (EUR, converti en centimes)
- Date de paiement
- Date d'encaissement (optionnel, pour cheques)
- Commentaire

**Logique statut paiement :**

```ts
function computeStatutPaiement(
  billet: { montantTtc: number },
  paiements: { montantTtc: number }[],
): StatutPaiement {
  const totalPaye = paiements.reduce((sum, p) => sum + p.montantTtc, 0)
  if (totalPaye <= 0) return 'EN_ATTENTE'
  if (totalPaye >= billet.montantTtc) return 'SOLDE'
  return 'PARTIEL'
}
```

Recalcule automatiquement a chaque ajout/suppression de paiement. Stocke sur le billet pour requetes rapides.

**Remboursements :** un paiement avec montant negatif. Le mode de paiement indique le canal de remboursement.

### 4.5 Cron rappel email

- **Trigger:** Vercel Cron, tous les jours a 07:00 UTC
- **Endpoint:** `app/api/cron/rappels/route.ts`
- **Auth:** `CRON_SECRET` (meme pattern que le digest P1)
- **Logique:**
  1. `SELECT billets WHERE dateRappel = today AND statut IN (EN_ATTENTE, PLANIFIE)`
  2. Grouper par exploitant
  3. Envoyer un email par exploitant via Resend
  4. Sujet : `[Calpax] {n} billets a recontacter aujourd'hui`
  5. Corps : tableau HTML avec reference, payeur nom+tel, commentaire, lien vers le billet
- **Logging:** count sent/skipped via `logger`

```json
// vercel.json — ajouter a la liste crons existante
{
  "path": "/api/cron/rappels",
  "schedule": "0 7 * * *"
}
```

### 4.6 RGPD droits interface

Page `app/[locale]/(app)/rgpd/page.tsx` :

- **Recherche passager** : par nom, email ou telephone
- **Droit d'acces** : afficher toutes les donnees d'un passager (y compris poids dechiffre)
- **Droit de rectification** : lien vers l'edition du billet/passager
- **Droit d'effacement** : supprimer un passager et anonymiser ses references dans les paiements et vols. Attention : ne pas supprimer les donnees necessaires a l'archivage reglementaire (PVE archives). Les passagers lies a des vols ARCHIVE sont anonymises (prenom/nom → "SUPPRIME", poids → null) mais pas supprimes.
- **Droit de portabilite** : export JSON des donnees d'un passager (billets, paiements, vols)
- **Log de traitement** : chaque action RGPD est tracee dans `audit_log`

### 4.7 Sidebar update

Ajouter au menu sidebar :

| Label (FR) | Label (EN) | Route      | Icon   |
| ---------- | ---------- | ---------- | ------ |
| Billets    | Tickets    | `/billets` | Ticket |

Position : apres "Pilotes", avant "Parametres".

### 4.8 Zod schemas

```ts
// lib/schemas/billet.ts
const billetCreateSchema = z.object({
  typePlannif: z.nativeEnum(TypePlannif),
  dateVolDeb: z.date().optional(),
  dateVolFin: z.date().optional(),
  dateValidite: z.date().optional(),
  creneau: z.nativeEnum(Creneau).optional(),
  payeurCiv: z.string().optional(),
  payeurPrenom: z.string().min(1),
  payeurNom: z.string().min(1),
  payeurEmail: z.string().email().optional(),
  payeurTelephone: z.string().optional(),
  payeurAdresse: z.string().optional(),
  payeurCp: z.string().optional(),
  payeurVille: z.string().optional(),
  montantTtc: z.number().int().nonnegative(), // centimes
  categorie: z.string().optional(),
  provenance: z.string().optional(),
  lieuDecollage: z.string().optional(),
  survol: z.string().optional(),
  commentaire: z.string().optional(),
  dateRappel: z.date().optional(),
  passagers: z.array(passagerSchema).min(1),
})

// lib/schemas/passager.ts
const passagerSchema = z.object({
  prenom: z.string().min(1),
  nom: z.string().min(1),
  email: z.string().email().optional(),
  telephone: z.string().optional(),
  age: z.number().int().positive().optional(),
  poids: z.number().positive().optional(),
  pmr: z.boolean().default(false),
})

// lib/schemas/paiement.ts
const paiementCreateSchema = z.object({
  modePaiement: z.nativeEnum(ModePaiement),
  montantTtc: z.number().int(), // peut etre negatif (remboursement)
  datePaiement: z.date(),
  dateEncaissement: z.date().optional(),
  commentaire: z.string().optional(),
})
```

---

## 5. P2b — Vols et organisation

### 5.1 Vol creation avec validation

**Formulaire creation vol** (`app/[locale]/(app)/vols/create/page.tsx`) :

- Date (date picker)
- Creneau (matin/soir)
- Ballon (select parmi ballons actifs du tenant)
- Pilote (select parmi pilotes actifs du tenant)
- Equipier (texte libre)
- Vehicule (texte libre)
- Lieu de decollage (texte libre)
- Config gaz (pre-rempli depuis le ballon, editable)
- Qte gaz (kg)

**Validation a la creation :**

```ts
// lib/vol/validation.ts

type VolCreateValidation =
  | {
      valid: true
    }
  | {
      valid: false
      errors: string[]
    }

function validateVolCreation(input: {
  ballon: Ballon
  pilote: Pilote
  date: Date
  creneau: Creneau
  existingVols: Vol[] // vols du meme jour pour detecter les conflits
}): VolCreateValidation
```

Regles :

1. `isBallonFlightReady(ballon)` doit etre valid (P1 helper)
2. `isPiloteAssignable(pilote, getBallonGroupe(ballon.volumeM3))` doit etre valid (P1 helpers)
3. Pas de doublon `[date, creneau, ballonId]` (unicite DB mais check client-side aussi)
4. Pas de doublon pilote sur le meme creneau (un pilote ne peut pas voler sur 2 ballons en meme temps)

Les erreurs sont affichees dans le formulaire. Le bouton "Creer" est desactive tant qu'il y a des erreurs.

### 5.2 Planning semaine

**Page** : `app/[locale]/(app)/vols/page.tsx`

**Layout :**

- Navigation semaine : boutons prev/next + date picker pour sauter a une semaine
- Grille : 7 colonnes (lundi → dimanche), 2 lignes (matin, soir)
- Chaque cellule affiche les vols du creneau :
  - Carte vol : nom ballon + couleur, pilote (initiales), nb passagers / capacite max, badge statut
  - Clic sur une carte → navigation vers le detail du vol
- Cellule vide : bouton "+" pour creer un vol a cette date/creneau
- Indicateurs visuels :
  - Vert : vol confirme avec passagers
  - Bleu : vol planifie sans passagers
  - Gris : vol annule (barre)
  - Dore : vol termine (en attente d'archivage)

**Vue complementaire :** liste des vols (tableau) avec filtres date/statut/ballon pour les recherches. Toggle entre vue planning et vue liste.

### 5.3 Organisation vol (affectation billets)

**Page** : `app/[locale]/(app)/vols/[id]/organiser/page.tsx`

C'est le coeur operationnel — l'ecran ou Olivier affecte les billets en attente a un vol concret.

**Layout deux colonnes :**

- **Colonne gauche : billets disponibles**
  - Liste des billets avec `statut = EN_ATTENTE` dont la fenetre de dates inclut la date du vol et dont le creneau correspond (ou pas de preference)
  - Filtrable par nom payeur, reference
  - Chaque billet affiche : reference, payeur, nb passagers, poids total, typePlannif, fenetre
  - Bouton "Affecter" par billet → deplace les passagers du billet vers le vol

- **Colonne droite : vol en cours d'organisation**
  - Info vol : date, creneau, ballon, pilote
  - Liste passagers deja affectes avec poids
  - **Devis de masse live** : calcul en temps reel du poids total vs capacite max a la temperature selectionnee
  - Indicateur de capacite restante (barre de progression)
  - Bouton "Retirer" par passager pour desaffecter

**Logique d'affectation :**

1. Clic "Affecter" sur un billet → `UPDATE passagers SET volId = vol.id WHERE billetId = billet.id`
2. Billet passe en `PLANIFIE`
3. Recalcul devis de masse
4. Si poids total depasse la capacite max a la temperature selectionnee → warning (pas bloquant, l'exploitant decide)
5. Quand l'exploitant est satisfait → bouton "Confirmer le vol" → statut passe en `CONFIRME`

### 5.4 Devis de masse

```ts
// lib/vol/devis-masse.ts

type DevisMasseInput = {
  ballon: {
    peseeAVide: number // kg
    performanceChart: Record<string, number> // temp°C → max payload kg
    configGaz: string
  }
  pilotePoids: number // kg (dechiffre)
  passagers: { poids: number }[] // kg (dechiffres)
  temperatureCelsius: number // OAT prevue ou saisie
  qteGaz: number // kg gaz embarque
  equipementSupp?: number // kg equipement supplementaire (optionnel)
}

type DevisMasseResult = {
  poidsAVide: number // pesee a vide ballon
  poidsGaz: number // gaz embarque
  poidsPilote: number
  poidsPassagers: number // somme poids passagers
  poidsEquipement: number // equipement supplementaire
  poidsTotal: number // somme de tout
  chargeUtileMax: number // depuis performanceChart a la temperature donnee
  margeRestante: number // chargeUtileMax - poidsTotal (negatif = surcharge)
  estSurcharge: boolean
  temperatureUtilisee: number
}

function calculerDevisMasse(input: DevisMasseInput): DevisMasseResult
```

**Interpolation temperature :** si la temperature saisie est entre deux entrees du chart (ex: 22,5°C), on prend l'entree superieure (23°C) par securite (charge utile plus faible a temperature plus haute). C'est conservateur — conforme a la pratique.

**Test vectors (non-negotiable TDD) :** extraire les cas de test depuis les 9 ballons Cameron seedes en P1. Pour chaque ballon, au moins 3 temperatures (10°C, 20°C, 34°C) avec des configurations passagers connues.

### 5.5 Zod schemas

```ts
// lib/schemas/vol.ts
const volCreateSchema = z.object({
  date: z.date(),
  creneau: z.nativeEnum(Creneau),
  ballonId: z.string().cuid(),
  piloteId: z.string().cuid(),
  equipier: z.string().optional(),
  vehicule: z.string().optional(),
  lieuDecollage: z.string().optional(),
  configGaz: z.string().optional(),
  qteGaz: z.number().int().positive().optional(),
})

const volPostFlightSchema = z.object({
  decoLieu: z.string().min(1),
  decoHeure: z.date(),
  atterLieu: z.string().min(1),
  atterHeure: z.date(),
  distance: z.number().int().nonnegative().optional(),
  gasConso: z.number().int().nonnegative().optional(),
  anomalies: z.string().optional(),
  noteDansCarnet: z.boolean().default(true),
})
```

### 5.6 Sidebar update

| Label (FR) | Label (EN) | Route   | Icon  |
| ---------- | ---------- | ------- | ----- |
| Vols       | Flights    | `/vols` | Plane |

Position : apres "Billets", avant "Parametres".

---

## 6. P2c — Documents reglementaires

### 6.1 Fiche de vol PDF (@react-pdf/renderer)

**Structure du document** (reproduit la v1) :

**Page 1 — En-tete + Equipage + Passagers + Devis de masse**

1. **Header**
   - Nom exploitant + N FR.DEC
   - Logo exploitant (si disponible)
   - "FICHE DE VOL" titre
   - Date + creneau

2. **Ballon**
   - Nom + immatriculation
   - Volume + type (ex: "Z-105 (3000 m3)")

3. **Equipage**
   - Pilote : nom + licence BFCL
   - Equipier : nom
   - Vehicule : nom

4. **Liste passagers**
   - Tableau : N | Nom | Age | Poids (kg) | PMR
   - Billet reference en sous-titre par groupe de passagers

5. **Devis de masse**
   - Tableau performance chart complet du ballon (10°C → 34°C)
   - Ligne surlignee pour la temperature OAT selectionnee
   - Recap : pesee a vide, gaz, pilote, passagers, total, marge
   - Indicateur CONFORME / SURCHARGE

**Page 2 — VISA CDB (a remplir par le pilote sur papier)**

6. **Decollage**
   - Lieu : ******\_\_\_\_******
   - Heure : \_**\_:\_\_**

7. **Atterrissage**
   - Lieu : ******\_\_\_\_******
   - Heure : \_**\_:\_\_**

8. **Consommation gaz** : **\_\_\_\_** kg

9. **Distance parcourue** : **\_\_\_\_** km

10. **Anomalies / Observations :**
    - (zone de texte vide)

11. **Signature CDB** : ******\_\_\_\_******
    - Date : ******\_\_\_\_******

**Page 3 — Meteo (placeholder Pw)**

12. **Placeholder meteo**
    - Texte : "Page meteo — sera generee par le module meteo (Pw)"
    - En P2, cette page est un espace reserve. En Pw, elle sera remplacee par les donnees Open-Meteo (vent a 10m/80m/120m/300m, OAT, previsions horaires)

### 6.2 Generation et acces

```ts
// lib/pdf/fiche-vol.ts

async function generateFicheVolPdf(volId: string): Promise<Buffer>
// 1. Fetch vol + ballon + pilote + passagers + exploitant
// 2. Dechiffrer poids passagers + poids pilote
// 3. Calculer devis de masse
// 4. Render via @react-pdf/renderer
// 5. Return PDF buffer

// Server action
async function downloadFicheVol(volId: string): Promise<Response>
// Generate PDF, return as download response
```

**Acces :** bouton "Telecharger fiche de vol" sur la page detail du vol (statut >= CONFIRME).

### 6.3 Post-vol : saisie compte-rendu

**Page** : `app/[locale]/(app)/vols/[id]/post-vol/page.tsx`

Formulaire :

- Lieu de decollage (texte)
- Heure de decollage (time picker)
- Lieu d'atterrissage (texte)
- Heure d'atterrissage (time picker)
- Consommation gaz (kg)
- Distance parcourue (km, optionnel)
- Anomalies (textarea)
- Checkbox "Note dans le carnet de bord"

**Action :** "Enregistrer" → vol passe en `TERMINE`. Les champs post-vol sont persistes sur le model Vol.

### 6.4 Finalisation PVE (archivage)

**Page detail vol** (`app/[locale]/(app)/vols/[id]/page.tsx`) — quand statut = TERMINE :

Bouton "Archiver comme PVE" :

1. Genere le PDF final (fiche de vol + donnees post-vol remplies — plus de zones vides, tout est complete)
2. Upload vers Supabase Storage : `pve/{exploitantId}/{volId}.pdf`
3. Stocke l'URL dans `Vol.pvePdfUrl` + `Vol.pveArchivedAt`
4. Statut → `ARCHIVE`
5. Les passagers des billets affectes passent `Billet.statut → VOLE`

**PDF PVE final :** identique a la fiche de vol mais les zones VISA CDB sont remplies avec les donnees saisies (lieu/heure deco/atterro, gaz conso, anomalies). La mention "PROCES-VERBAL D'ENVOL" remplace "FICHE DE VOL" dans le titre. Horodatage d'archivage en bas de page.

### 6.5 Supabase Storage setup

- Bucket : `pve` (prive, authenticated read/write)
- Path convention : `{exploitantId}/{volId}.pdf`
- RLS : lecture/ecriture restreinte au tenant proprietaire
- URL signee (expiration 1h) pour le telechargement depuis le back-office

### 6.6 Journal de bord ballon

**Page** : `app/[locale]/(app)/ballons/[id]/journal/page.tsx`

Vue filtree des vols pour un ballon specifique, ordonnee par date desc :

- Tableau : date, creneau, pilote, statut, lieu deco, lieu atterro, distance, gaz conso, anomalies, PVE (lien PDF)
- Badge statut colore
- Filtres : plage de dates, statut
- Stats resume en haut : nb vols total, nb heures de vol estimees, gaz total consomme

Lien depuis la page detail ballon : "Voir le journal de bord".

### 6.7 Audit trail UI

**Page** : `app/[locale]/(app)/audit/page.tsx`

Surface l'`audit_log` existant (P0) avec une UI consultable :

- Filtres : entity type (select), entity id (recherche), date range, user
- Tableau : date, utilisateur, entite, action (CREATE/UPDATE/DELETE), champ modifie, avant, apres
- Pagination (50 lignes par page)
- Lien contextuel depuis chaque page detail (ballon, pilote, billet, vol) : "Voir l'historique des modifications"

### 6.8 Sidebar update

| Label (FR) | Label (EN) | Route    | Icon    |
| ---------- | ---------- | -------- | ------- |
| Audit      | Audit      | `/audit` | History |

Position : apres "Parametres" (section "Administration").

---

## 7. Dependances sur P0/P1

P2 utilise directement :

| Composant P0/P1                | Utilisation P2                                                                              |
| ------------------------------ | ------------------------------------------------------------------------------------------- |
| `lib/db/tenant-extension.ts`   | Extend TENANT_FILTER avec Billet, Passager, Paiement, Vol                                   |
| `lib/db/audit-extension.ts`    | Audit automatique des mutations Billet, Passager, Paiement, Vol                             |
| `lib/crypto.ts`                | Chiffrement poids passagers (meme pattern que Pilote)                                       |
| `lib/regulatory/validation.ts` | `isBallonFlightReady()` + `isPiloteAssignable()` + `getBallonGroupe()` a la creation de vol |
| `lib/auth/requireAuth.ts`      | Wraps tous les server components et actions P2                                              |
| `lib/context.ts`               | Tenant context pour les queries                                                             |
| `Ballon.performanceChart`      | Lookup dans le devis de masse                                                               |
| `Ballon.volumeM3`              | Derive le groupe via `getBallonGroupe()` pour validation pilote                             |
| `Pilote.poidsEncrypted`        | Dechiffre pour le devis de masse                                                            |
| `lib/email/digest.ts`          | Pattern reutilise pour le cron rappels                                                      |
| Alert system (P1)              | Les alertes CAMO/BFCL restent visibles dans le banner                                       |

---

## 8. Tests non-negociables (TDD)

### Devis de masse (P2b)

- Test vectors pour les 9 ballons Cameron seedes : 3 temperatures chacun (10°C, 20°C, 34°C), configuration passagers variable
- Test surcharge detectee
- Test interpolation temperature (prend la superieure)
- Test avec poids pilote + passagers dechiffres

### Fiche de vol PDF (P2c)

- Golden-file snapshot tests : generer un PDF pour un vol type, comparer le buffer/structure au snapshot
- Test avec donnees completes et donnees partielles (passager sans poids, pas d'equipier)

### Tenant isolation (toutes sous-phases)

- Integration test : exploitant A ne peut pas voir/modifier les billets/passagers/paiements/vols de B
- Test sur chaque operation CRUD

### Validation vol (P2b)

- Pilote avec licence expiree → rejet
- Ballon avec CAMO expire → rejet
- Pilote sans qualification groupe ballon → rejet
- Doublon date/creneau/ballon → rejet
- Doublon pilote meme creneau → rejet

### Paiements (P2a)

- Calcul statutPaiement : EN_ATTENTE, PARTIEL, SOLDE
- Remboursement (montant negatif)
- Multi-paiements par billet

### RGPD (P2a)

- Anonymisation passager lie a un vol ARCHIVE
- Export JSON donnees passager
- Traitement audit_log pour chaque action RGPD

---

## 9. Explicitement NOT dans P2

- Page booking publique (P3)
- Integration Mollie (P3)
- Facturation PDF (P3)
- Billet numerique PDF + QR code (P3)
- App pilote mobile / login pilote (M3)
- Meteo reelle — Open-Meteo, METAR/TAF, radar (Pw, M4)
- GPS tracking (M5)
- Bons cadeaux UI (P3+ — le data model les supporte via dateValidite)
- Drag & drop sur le planning (M3)
- Notifications SMS (V2)
- Statistiques / reporting (plus tard)
- Entites formalisees pour equipier et vehicule (plus tard, si demande)

---

## 10. Ordre d'execution

```
P2a (schema + billets + passagers + paiements + cron + RGPD)
  → checkpoint : CRUD billet fonctionnel, paiements partiels OK, cron teste
P2b (vols + planning + organisation + devis de masse)
  → checkpoint : vol cree avec validation, planning semaine, devis de masse test vectors OK
P2c (fiche de vol PDF + PVE + journal de bord + audit trail)
  → checkpoint : PDF genere, PVE archive, journal consultable
```

Chaque sous-phase a son propre plan d'implementation (`writing-plans`). On ne demarre P2b qu'apres le checkpoint P2a, et P2c qu'apres P2b.

---

## 11. Next step

Run the `writing-plans` skill to produce the implementation plan for **P2a** (first sub-phase).
