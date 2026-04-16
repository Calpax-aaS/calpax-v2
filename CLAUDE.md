# Calpax — Contexte projet pour Claude Code

## Ce qu'est Calpax

SaaS 100% dédié à la gestion et planification de vols en montgolfière commerciaux.
Cible : exploitants déclarés FR.DEC (environ 150 en France, 450 en Europe).

Cycle couvert : réservations clients → paiements → organisation jour J (passagers/pilotes/équipiers) → documents réglementaires obligatoires (PVE, devis de masse) → météo opérationnelle → tracking GPS → conformité aéronautique.

**Origine** : une v1 PHP/MySQL développée il y a 20 ans tourne encore en production chez Cameron Balloons France (Olivier Cuenot, Dole — FR.DEC.059, 5+ ballons). La v2 est construite d'abord pour lui, validée avec lui, puis ouverte aux autres exploitants.

---

## Stack technique

| Couche          | Choix                                                                        |
| --------------- | ---------------------------------------------------------------------------- |
| Front           | Next.js 15 (React 19) — SSR/CSR, SEO pages réservation publiques             |
| UI              | shadcn/ui (Radix) + Tailwind CSS 4 + DM Sans, palette "Grand Bleu"           |
| Back / API      | Node.js + Prisma 7 (@prisma/adapter-pg)                                      |
| Base de données | PostgreSQL (Supabase)                                                        |
| Auth            | Better Auth v1.6.4 (email+password, magic link, Google OAuth, admin plugin)  |
| Paiements       | Mollie (EU, abonnements SaaS + paiements passagers)                          |
| Hébergement     | Vercel + Supabase (eu-central-1)                                             |
| Cartes / GPS    | Leaflet.js + OpenStreetMap (open source, 0€)                                 |
| Météo vent      | Open-Meteo API (gratuit, open source)                                        |
| Météo METAR/TAF | AVWX ou CheckWX API                                                          |
| PDF             | @react-pdf/renderer (server-side)                                            |
| Email           | Resend                                                                       |
| i18n            | next-intl (FR + EN dès le départ)                                            |
| Tests           | Vitest (unit + integration) + Playwright (E2E)                               |
| CI/CD           | GitHub Actions (lint + typecheck + unit + integration + build + E2E en prod) |

---

## Architecture multi-tenant

Chaque exploitant a son propre espace de données isolé via la colonne `exploitantId` sur toutes les tables.

**Implémentation :**

- `lib/context.ts` : `RequestContext` stocké dans `AsyncLocalStorage` (userId, exploitantId, role, impersonatedBy)
- `lib/db/tenant-extension.ts` : Prisma extension qui injecte automatiquement `exploitantId` sur toutes les queries scoped
- `lib/db/index.ts` : exporte `db` (tenant-scoped) et `adminDb` (bypass, audit only, usage restreint)
- `lib/auth/requireAuth.ts` : wrap les server actions, vérifie la session Better Auth et injecte le contexte

Un bug chez un exploitant ne doit jamais affecter les données d'un autre.

## RBAC (Role-Based Access Control)

4 rôles définis dans `lib/context.ts` :

| Rôle           | Accès                                                                           |
| -------------- | ------------------------------------------------------------------------------- |
| `ADMIN_CALPAX` | Tout + espace Super Admin (Damien)                                              |
| `GERANT`       | CRUD complet sur son tenant                                                     |
| `PILOTE`       | Lecture sur ballons/pilotes/billets, ses vols en lecture, post-vol sur ses vols |
| `EQUIPIER`     | Ses vols uniquement                                                             |

**Helpers :**

- `lib/auth/requireAuth.ts` : vérifie que l'utilisateur est authentifié
- `lib/auth/requireRole.ts` : `requireRole('ADMIN_CALPAX', 'GERANT')` throw `ForbiddenError` si le rôle ne matche pas
- Toutes les server actions et pages sensibles sont protégées
- La sidebar masque les items inaccessibles selon le rôle

## Super Admin

Route group `app/[locale]/admin/` protégé par `requireRole('ADMIN_CALPAX')`.

Pages :

- Dashboard : stats globales + table exploitants + impersonation
- Users : liste cross-tenant (nom, email, rôle, exploitant, dernière connexion)
- Sessions : sessions actives + bouton revoquer
- Audit : audit log cross-tenant avec filtre exploitant
- Invitations : créer un user dans un exploitant

`lib/admin/impersonate.ts` permet à un ADMIN_CALPAX de se connecter en tant qu'exploitant avec audit trail complet.

---

## Schéma de données — entités core

```
Exploitant                    → tenant racine (N° FR.DEC, SIRET, N° CAMO)
  ├── Ballon                  → immatriculation, volumeM3, groupe, capacité homologuée, expiration CAMO
  ├── Pilote                  → licence BFCL (classes A/B/C/D), qualifications, groupes, expirations
  ├── Billet                  → référence (ex: CBF-2026-0001), fenêtre dates, payeur, statut, paiements
  │     ├── Passager          → nom, poids chiffré (RGPD), PMR, affectation vol
  │     └── Paiement          → mode (espèces/CB/virement/chèque), montant EUR, dates
  ├── Vol                     → date, créneau (matin/soir), ballon, pilote, statut, devis de masse
  │     └── Passager          → affectés depuis billets confirmés
  └── BilletSequence          → compteur atomique de références par exploitant
```

---

## Contraintes réglementaires non négociables (MVP)

Règlement EU 2018/395 (Part-BOP) + DGAC :

- **PVE** (Procès-Verbal d'Envol) : obligatoire après chaque vol commercial. Auto-généré depuis les données du vol, export PDF, archivage.
- **Devis de masse** : calcul automatique poids passagers + équipage + carburant. Obligatoire avant tout décollage.
- **Journal de bord ballon** : carnet de route numérique par vol.
- **Fiche ballon** : immatriculation, certificat navigabilité Part-21, organisme CAMO. Alerte 60j et 30j avant expiration.
- **Profil pilote BFCL** : licence + qualification vol commercial passagers. Alerte 90j et 30j avant expiration. Blocage d'affectation si licence invalide.
- **N° FR.DEC exploitant** : affiché sur tous les documents générés.

---

## Contraintes RGPD (MVP)

- Consentement explicite avant collecte (case non pré-cochée)
- Poids passager = donnée sensible → chiffrement en base, accès restreint pilote + exploitant
- Conservation données : 5 ans maximum, suppression automatique
- Interface droits RGPD (accès, rectification, effacement, portabilité)
- DPA (Data Processing Agreement) signé avec chaque exploitant client — Calpax est sous-traitant RGPD art. 28
- Directive PNR : probablement hors champ pour les montgolfières (vols locaux, sans route ni numéro de vol IATA) — à confirmer avec le client zéro

---

## Contraintes paiements (MVP)

- 3DS v2 obligatoire (DSP2) pour tout paiement > 30€ — géré nativement par Mollie
- Zéro stockage données carte côté Calpax (PCI-DSS) — uniquement token de transaction PSP
- Facture automatique conforme (N° SIRET, TVA, montant HT/TTC)

---

## Périmètre MVP — ce qui est dedans

### Réglementaire (non négociable)

- PVE auto-généré + archivage PDF
- Devis de masse automatique
- Journal de bord ballon
- Fiche ballon + alertes maintenance CAMO
- Profil pilote + alertes licence BFCL
- N° FR.DEC sur tous les documents
- RGPD complet (consentement, droits, DPA, chiffrement)
- Paiements conformes (3DS v2, zéro stockage carte, facturation)

### Fonctionnel (valeur produit)

- Planning des vols hebdo/mensuel
- Création vol (ballon + pilote + date + capacité)
- Gestion réservations et affectation passagers
- Page réservation publique + paiement Mollie intégré
- Dashboard jour J (passagers + devis de masse)
- Billet numérique PDF + QR code + email de confirmation
- Vue pilote mobile (vols assignés + liste passagers)
- Validation vol par pilote → déclenchement PVE automatique
- Gestion remboursements (annulation météo)
- Multi-tenant (1 espace isolé par exploitant)
- Météo : vent sol + basse altitude heure par heure (Open-Meteo)
- Météo : METAR et TAF aéroports proches décodés (AVWX/CheckWX)
- Météo : radar pluie/orages temps réel
- Tableau go/no-go météo par vol planifié
- Tracking GPS temps réel — carte pilote (HTML5 Geolocation + WebSocket + Leaflet)
- Vue équipiers sol — suivi ballon en live
- Lien de suivi live partageable aux proches des passagers (page publique, sans inscription)

## Ce qui n'est PAS dans le MVP

- Portail passager autonome (V2)
- Bons cadeaux (V2)
- Notifications SMS (V2)
- Alertes météo automatiques (V2)
- Checklist pré-vol digitale (V2)
- Carnet de vol pilote (V2)
- Replay parcours GPS (V2)
- Export GPX/KML (Expert / V2)
- API publique (Plus tard)
- Statistiques / reporting (Plus tard)
- Tracker GPS hardware nacelle (Plus tard)

---

## Pricing (pour référence)

| Formule | Prix      | Cible                                 |
| ------- | --------- | ------------------------------------- |
| Starter | 79€/mois  | 1 ballon, exploitant indépendant      |
| Pro     | 149€/mois | 1-3 ballons, saison active            |
| Expert  | 249€/mois | 4+ ballons, structure professionnelle |

Le client zéro (Cameron Balloons France, 5+ ballons) est en segment **Expert**.

---

## Conventions de code

- TypeScript strict partout
- Prisma pour toutes les requêtes BDD — pas de SQL brut sauf cas exceptionnel justifié
- Variables d'environnement pour toutes les clés API (Mollie, AVWX, Open-Meteo, Resend, Better Auth)
- Toujours utiliser `db` (tenant-scoped) au lieu de `basePrisma` pour les queries standard
- `basePrisma` uniquement pour les usages cross-tenant légitimes (super admin, cron digest) — ESLint restreint les imports
- Toutes les server actions doivent être wrappées dans `requireAuth(async () => { ... })`
- Pour les mutations sensibles, ajouter `requireRole('ADMIN_CALPAX', 'GERANT')` dans le callback
- Les données sensibles (poids passagers, coordonnées) sont chiffrées en base — utiliser la lib de chiffrement définie dans `/lib/crypto.ts`
- Les PII dans les audit logs sont automatiquement redactées (email, téléphone, poids, etc. — voir `REDACT_FIELDS` dans `lib/db/audit-extension.ts`)
- Les PDF (PVE, billets, factures) sont générés côté serveur uniquement
- `lib/format.ts` : `formatDateFr()` pour tous les formats de date fr-FR
- `lib/crypto.ts` : `encrypt`, `decrypt`, `safeDecryptInt` pour PII
- Les helpers d'i18n : toutes les chaînes UI via `messages/fr.json` et `messages/en.json`

## Environnement

Variables obligatoires (voir `.env.example`) :

- `DATABASE_URL` : connexion Postgres (pooled)
- `DATABASE_URL_DIRECT` : connexion directe (migrations)
- `BETTER_AUTH_SECRET` : `openssl rand -base64 32`
- `BETTER_AUTH_URL` : URL de l'app (ex: `https://calpax.fr`)
- `NEXT_PUBLIC_APP_URL` : même que BETTER_AUTH_URL
- `ENCRYPTION_KEY` : 64 chars hex pour AES-256-GCM
- `RESEND_API_KEY` : pour magic link et emails transactionnels
- `SUPABASE_CA_CERT` : certificat CA Supabase (pour TLS en prod)

Optionnelles :

- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` : OAuth Google
- `SENTRY_DSN`, `SENTRY_AUTH_TOKEN` : monitoring
- `CRON_SECRET` : pour protéger les endpoints Vercel Cron

---

## Backlog complet

Voir `BACKLOG.md` pour la liste exhaustive des features avec priorités.
