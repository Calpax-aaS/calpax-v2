# Migration Better Auth + RBAC + Super Admin — Design Spec

**Date:** 2026-04-15
**Scope:** Migration NextAuth -> Better Auth, implementation RBAC, espace super admin

---

## 1. Migration NextAuth -> Better Auth

### Pourquoi

NextAuth v5 est en beta (5.0.0-beta.30). L'equipe Auth.js a rejoint Better Auth (sept. 2025). Better Auth est desormais recommande pour les nouveaux projets. La migration resout TD-007 (RBAC), TD-011 (middleware auth), TD-013 (rate limiting), TD LOW-001 (NextAuth beta).

### Methodes d'authentification

1. **Email + mot de passe** -- methode principale, plugin `emailAndPassword`
2. **Magic link** -- plugin `magicLink`, utilise comme "mot de passe oublie" et premier login
3. **Google OAuth** -- plugin social provider, configure via env vars (optionnel, non bloquant si pas configure)

### Schema

Better Auth gere ses propres tables (`user`, `session`, `account`, `verification`). On laisse Better Auth creer son schema via sa CLI (`npx @better-auth/cli generate`), puis on applique la migration Prisma.

Notre modele metier `User` existant sera fusionne avec la table `user` de Better Auth. Les champs metier (`role`, `exploitantId`) seront ajoutes comme champs additionnels dans la config Better Auth.

### Configuration

Fichier `lib/auth.ts` :

```ts
import { betterAuth } from 'better-auth'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import { organization, admin } from 'better-auth/plugins'

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: 'postgresql' }),
  emailAndPassword: { enabled: true },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    },
  },
  plugins: [organization(), admin()],
})
```

Client-side : `lib/auth-client.ts` avec `createAuthClient()`.

### Middleware

Better Auth fournit un middleware integre. Configurer dans `middleware.ts` pour proteger toutes les routes `/(app)/` et `/(admin)/`. Resout TD-011.

### Rate limiting

Built-in dans Better Auth. Configurable par endpoint. Resout TD-013.

### Adaptation du code existant

- `requireAuth()` : lire la session Better Auth au lieu du JWT NextAuth
- `getContext()` : extraire `userId`, `exploitantId`, `role` depuis la session Better Auth
- `signIn()` / `signOut()` : utiliser les methodes Better Auth
- Page de login : refaire pour proposer email+password + magic link + Google

### Migration des donnees

Un seul user en prod (Olivier). Script de migration :

1. Creer le user dans Better Auth avec email + mot de passe hashe
2. Creer l'organization "Cameron Balloons France" avec Olivier comme GERANT
3. Creer le user ADMIN_CALPAX (Damien)
4. Supprimer les anciennes tables NextAuth (Account, Session, VerificationToken)

### Packages a supprimer

- `next-auth`
- `@auth/prisma-adapter`

### Packages a ajouter

- `better-auth`

### Variables d'environnement

- `BETTER_AUTH_SECRET` (remplace `AUTH_SECRET`)
- `BETTER_AUTH_URL` (remplace `AUTH_URL`)
- `GOOGLE_CLIENT_ID` (nouveau, optionnel)
- `GOOGLE_CLIENT_SECRET` (nouveau, optionnel)

---

## 2. RBAC

### Roles

| Role           | Description                                               |
| -------------- | --------------------------------------------------------- |
| `ADMIN_CALPAX` | Super admin Calpax (Damien). Acces a tout + espace admin. |
| `GERANT`       | Gerant d'exploitant. Acces complet a son tenant.          |
| `PILOTE`       | Pilote. Voit ses vols, lecture seule sur le reste.        |
| `EQUIPIER`     | Equipier. Voit ses vols uniquement.                       |

### Implementation

Utiliser le plugin `organization` de Better Auth :

- Un `Exploitant` = une `Organization`
- Les roles sont definis dans la config Better Auth
- Chaque user a un role dans son organization

### Helper

```ts
export async function requireRole(...roles: UserRole[]) {
  const ctx = getContext()
  if (!roles.includes(ctx.role)) {
    throw new ForbiddenError()
  }
}
```

### Matrice d'acces

| Page/Action                   | ADMIN_CALPAX | GERANT  | PILOTE             | EQUIPIER           |
| ----------------------------- | ------------ | ------- | ------------------ | ------------------ |
| Dashboard                     | Tout         | Tout    | Ses vols du jour   | Ses vols du jour   |
| Billets / Paiements           | Tout         | CRUD    | Lecture            | Non                |
| Vols                          | Tout         | CRUD    | Ses vols (lecture) | Ses vols (lecture) |
| Ballons / Pilotes             | Tout         | CRUD    | Lecture            | Non                |
| Equipiers / Vehicules / Sites | Tout         | CRUD    | Non                | Non                |
| Parametres / RGPD             | Tout         | CRUD    | Non                | Non                |
| Audit                         | Tout         | Lecture | Non                | Non                |
| Profil                        | Le sien      | Le sien | Le sien            | Le sien            |
| Super Admin                   | Tout         | Non     | Non                | Non                |

### Sidebar adaptative

La sidebar masque les items inaccessibles selon le role. Les groupes entiers disparaissent si aucun item n'est accessible (ex: "Administration" disparait pour PILOTE).

---

## 3. Espace super admin

### Route group

`app/[locale]/(admin)/` -- separe de `(app)/`, protege par `requireRole('ADMIN_CALPAX')`.

Layout propre avec sidebar admin distincte (ou la meme sidebar avec section "Admin" en plus).

### Pages

#### Dashboard admin (`/(admin)/page.tsx`)

- Liste des exploitants : nom, FR.DEC, nombre de users, nombre de vols total
- Stats globales : total exploitants, total users, total vols

#### Users (`/(admin)/users/page.tsx`)

- Liste cross-tenant de tous les users
- Colonnes : nom, email, role, exploitant, derniere connexion, statut (actif/desactive)
- Actions : desactiver un user, changer son role

#### Invitations (`/(admin)/invitations/page.tsx`)

- Formulaire : email + exploitant (select) + role (select)
- Better Auth envoie l'email d'invitation
- Liste des invitations en cours (pending/accepted)

#### Sessions (`/(admin)/sessions/page.tsx`)

- Sessions actives via l'API Better Auth
- Colonnes : user, email, IP, user agent, debut, derniere activite
- Action : revoquer une session

#### Audit log (`/(admin)/audit/page.tsx`)

- Reutilise le composant audit existant mais sans filtre tenant (cross-tenant)
- Filtrage par exploitant, type d'entite, action, date

#### Impersonation

- Bouton "Se connecter en tant que" sur chaque exploitant dans le dashboard admin
- Utilise la fonction `impersonate()` existante
- Banner visible quand on est en mode impersonation, avec bouton "Revenir a mon compte"

---

## 4. Contraintes

- La migration doit etre backward-compatible avec les donnees existantes
- Pas de downtime : la migration se fait en une seule release
- Les tests d'integration et E2E doivent etre adaptes
- Le seed script doit creer les users via Better Auth
- Les variables d'environnement doivent etre mises a jour sur Vercel et dans le CI

---

## 5. Decomposition

Ce spec couvre 3 sous-projets a implementer sequentiellement :

1. **P1 : Migration Better Auth** -- installer, configurer, migrer auth, adapter login, adapter requireAuth/getContext, migrer le user Olivier, supprimer NextAuth
2. **P2 : RBAC** -- implementer la matrice d'acces, proteger pages et actions, sidebar adaptative
3. **P3 : Super Admin** -- creer les pages admin, dashboard, users, invitations, sessions, audit cross-tenant, impersonation UI

Chaque sous-projet fait l'objet de son propre plan d'implementation.
