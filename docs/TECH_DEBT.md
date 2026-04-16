# Technical Debt

Items to address before or during P1. Each entry has a severity and a proposed fix.

---

## TD-001: NODE_TLS_REJECT_UNAUTHORIZED=0 on Vercel

**Status:** RESOLVED (2026-04-13)

Supabase CA cert stored in `SUPABASE_CA_CERT` env var. Pool uses `rejectUnauthorized: true` + `ca: cert`. `NODE_TLS_REJECT_UNAUTHORIZED=0` removed from Vercel.

---

## TD-002: react-pdf SectionTitle single-string child constraint

**Severity:** LOW — cosmetic workaround, no functional impact.

**Context:** The `SectionTitle` component in react-pdf/renderer requires its child to be a single string. Passing JSX children or concatenated expressions causes a runtime error. Worked around by using template literals everywhere a dynamic string is needed inside SectionTitle.

**Proposed fix:** Either accept a `text` prop instead of `children`, or use a `<Text>` wrapper that is always a string. Document the constraint in the component's JSX comment.

**When:** Next PDF component refactor.

**Added:** 2026-04-11

---

## TD-003: Paiement.montant stored as Float

**Severity:** LOW (downgraded) — acceptable for current scale.

**Context:** The `Paiement` and `Billet` models store `montantTtc` as Prisma `Float` (PostgreSQL `double precision`). Amounts are in EUR (not centimes). For balloon operator transactions (150-1200 EUR), Float64 precision (15 significant digits) means rounding errors only appear above ~10M EUR — well beyond our scale.

**Decision:** Keep Float for now. Migrate to `Decimal` before Mollie integration (P3) where precise payment reconciliation matters. The migration is mechanical (schema + cast all arithmetic to Decimal) but invasive (every file that does montant arithmetic needs updating).

**When:** Before Mollie integration (P3).

**Added:** 2026-04-11

---

## TD-004: Equipier, Vehicule, SiteDecollage as entities

**Status:** RESOLVED (2026-04-13)

Created 3 formal entities (Equipier, Vehicule, SiteDecollage) with CRUD pages.
Vol now uses FK references + "Autre" free-text fallback for each.
Seeded with Cameron Balloons data (2 equipiers, 2 vehicules, 3 sites).

---

## TD-005: PDF meteo page is a placeholder

**Status:** RESOLVED (Pw — 2026-04-12)

Open-Meteo data now renders on PDF page 3 with colored wind table + summary banner.

**Added:** 2026-04-11

---

## TD-006: Billet reference prefix "CBF" is hardcoded

**Status:** RESOLVED (2026-04-13)

Added `billetPrefix` field to Exploitant model. Reference generator reads from exploitant settings with fallback to first 3 chars of name. Configurable in Settings page.

**Added:** 2026-04-11

---

## TD-007: Pas de RBAC -- tous les roles ont acces a tout

**Severity:** MEDIUM
**Status:** RESOLVED (2026-04-16)

Implemente avec `lib/auth/requireRole.ts`. 11 action files proteges (billet, paiement, vol, ballon, pilote, equipier, vehicule, site, exploitant, rgpd, organisation), 6 pages protegees (equipiers, vehicules, sites, settings, rgpd, audit), sidebar adaptative par role.

**Added:** 2026-04-13

---

## TD-008: Utiliser le modele Meteo-France (AROME HD) au lieu de best_match

**Severity:** LOW -- fonctionne avec best_match, mais la precision serait meilleure.

**Context:** L'appel Open-Meteo utilise `api.open-meteo.com/v1/forecast` sans parametre `models=`, ce qui selectionne automatiquement un modele (ICON, MeteoBlue, etc.). Pour des vols en montgolfiere en France, le modele **Meteo-France AROME HD** (resolution 1.3km) serait bien plus adapte, surtout pour le vent en basse altitude. Open-Meteo expose ce modele via `https://api.open-meteo.com/v1/meteofrance` avec `models=arome_france_hd`.

**Reference :** https://open-meteo.com/en/docs/meteofrance-api?hourly=temperature_2m,wind_speed_1000hPa,wind_speed_900hPa,wind_speed_925hPa,wind_speed_950hPa,wind_speed_850hPa,wind_direction_1000hPa,wind_direction_950hPa,wind_direction_925hPa,wind_direction_900hPa,wind_direction_850hPa&models=arome_france_hd,arome_france&minutely_15=wind_speed_10m,wind_speed_20m,wind_speed_50m,wind_speed_100m,wind_direction_10m,wind_direction_20m,wind_direction_50m,wind_direction_100m

**Observations cles :**

- AROME HD supporte les niveaux de pression (1000/950/925/900/850 hPa) en hourly -- ce qui correspond a ~0m/500m/750m/1000m/1500m d'altitude
- AROME HD supporte aussi le vent en minutely_15 a 10m/20m/50m/100m -- resolution 15 min
- Possibilite de combiner `arome_france_hd` + `arome_france` pour fallback
- Cela change notre approche : au lieu de vent a hauteur fixe (80m/120m/180m), on passerait a des niveaux de pression isobariques, plus pertinents pour l'aeronautique

**A explorer avant migration :**

- Mapper les niveaux de pression aux altitudes pertinentes pour la montgolfiere (~0-1500m)
- Evaluer si la resolution 15 min est utile (plus precis pour le creneau matin/soir)
- Verifier la couverture temporelle (forecast horizon -- AROME est ~48h vs 7+ jours pour best_match)
- Tester avec les coordonnees de Dole-Tavaux

**Proposed fix :**

- Changer l'endpoint vers `/v1/meteofrance` avec `models=arome_france_hd`
- Fallback sur best_match si les variables haute altitude ne sont pas disponibles
- Mettre a jour l'affichage source dans l'UI ("Meteo-France AROME HD" au lieu de "Open-Meteo best match")

**When:** P3 (ameliorations meteo).

**Added:** 2026-04-13

---

## TD-009: Tenant extension silently fails when findUnique uses select without exploitantId

**Severity:** HIGH (resolu)
**Status:** RESOLVED (2026-04-16)

Le tenant extension injecte maintenant automatiquement le champ tenant dans le `select` des `findUnique`/`findUniqueOrThrow` quand il est absent, verifie l'ownership via le post-filter, puis strip le champ du resultat final pour que l'appelant recoive exactement ce qu'il a demande. 4 tests d'integration ajoutes dans `tests/integration/tenant-isolation.spec.ts` pour couvrir les cas own-tenant, cross-tenant, et `findUniqueOrThrow`.

**Added:** 2026-04-13

---

## TD-010: Securite -- pwd.log credential dans le repo

**Severity:** CRITICAL
**Status:** RESOLVED (2026-04-14)
Fichier jamais committe (gitignored). Supprime du disque local.
**Added:** 2026-04-14

---

## TD-011: Securite -- middleware sans auth guard

**Severity:** CRITICAL
**Status:** RESOLVED (2026-04-16)

`middleware.ts` verifie maintenant le cookie de session Better Auth via `getSessionCookie` pour toutes les routes `/(app)/*` et `/(admin)/*`. Redirige vers signin si absent, avec `callbackUrl` preserve. Check optimiste au edge + `requireAuth()` reste l'authoritative check cote serveur (defense-in-depth).

**Added:** 2026-04-14

---

## TD-012: Securite -- exploitantId fallback empty string

**Severity:** CRITICAL
**Status:** RESOLVED (2026-04-14)
`requireAuth()` rejette maintenant les users sans `exploitantId` avant toute operation tenant-scoped.
**Added:** 2026-04-14

---

## TD-013: Securite -- pas de rate limiting sur magic-link

**Severity:** CRITICAL
**Status:** RESOLVED (2026-04-15)

Better Auth v1.6.4 a un rate limiting built-in sur tous les endpoints auth (signin, magic link, reset password). Active par defaut. Verifie par les E2E qui declenchent "Too many requests" si trop d'appels.

**Added:** 2026-04-14

---

## TD-014: Securite -- pas de HTTP security headers

**Severity:** HIGH
**Status:** RESOLVED (2026-04-14)
Ajoute X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, HSTS, X-DNS-Prefetch-Control dans `next.config.ts`. CSP reste a configurer (complexe, necessite tuning).
**Added:** 2026-04-14

---

## TD-015: Securite -- rejectUnauthorized false sans cert

**Severity:** HIGH
**Status:** RESOLVED (2026-04-14)
Ajout d'un `console.warn` en prod si cert absent. Le comportement existant est preserve (pas de throw) mais l'etat est visible dans les logs.
**Added:** 2026-04-14

---

## TD-016: Securite -- HTML non sanitise dans emails

**Severity:** HIGH
**Status:** RESOLVED (2026-04-14)
`escapeHtml()` ajoute dans `rappels.ts` et `digest.ts`. Toutes les donnees utilisateur sont echappees avant interpolation HTML.
**Added:** 2026-04-14

---

## TD-017: Securite -- weatherCache.upsert bypass tenant extension

**Severity:** HIGH
**Status:** RESOLVED (2026-04-14)
Remplace `basePrisma` par `db` dans `lib/weather/cache.ts`. Import `basePrisma` supprime.
**Added:** 2026-04-14

---

## TD-018: Securite -- audit extension swallow errors + PII en clair

**Severity:** HIGH
**Status:** RESOLVED (2026-04-14)
PII redactee dans les audit logs via `REDACT_FIELDS` set (email, telephone, adresse, poids). `console.error` remplace par `console.warn`.
**Added:** 2026-04-14

---

## TD-019: Qualite -- savePostFlight et confirmerVol sans guard de statut

**Severity:** HIGH
**Status:** RESOLVED (2026-04-14)
`savePostFlight` rejette ARCHIVE/ANNULE. `confirmerVol` n'accepte que PLANIFIE.
**Added:** 2026-04-14

---

## TD-020: Qualite -- billet updates sans transaction dans archivePve/cancelVol

**Severity:** HIGH
**Status:** RESOLVED (2026-04-14)
Remplace les boucles sequentielles par `db.billet.updateMany()` (operation atomique).
**Added:** 2026-04-14

---

## TD-021: Qualite -- checkbox noteDansCarnet toujours true

**Severity:** HIGH
**Status:** RESOLVED (2026-04-14)
Remplace `?? true` par `=== 'true'`.
**Added:** 2026-04-14

---

## TD-022: Simplification -- formatDate et safeDecrypt dupliques

**Severity:** MEDIUM
**Status:** RESOLVED (2026-04-14)
`formatDateFr()` dans `lib/format.ts`, `safeDecryptInt()` dans `lib/crypto.ts`. 6+3 definitions remplacees.
**Added:** 2026-04-14

---

## TD-023: Simplification -- createVol/updateVol duplication 40+ lignes

**Severity:** MEDIUM
**Status:** RESOLVED (2026-04-14)
Extrait `parseVolFormData()` et `resolveAutreEntities()` dans `lib/actions/vol.ts`.
**Added:** 2026-04-14

---

## TD-024: Qualite -- i18n incomplet (toasts, sidebar labels, alerts hardcodes FR)

**Severity:** MEDIUM
**Context:** Toasts de succes, labels de groupes sidebar, textes du banner alertes sont en francais hardcode hors du systeme i18n.
**Added:** 2026-04-14

---

## TD-025: Securite -- billetPrefix sans restriction de caracteres

**Severity:** MEDIUM (resolu)
**Status:** RESOLVED (2026-04-16)

Regex `^[A-Z0-9]+$/i` ajoutee au schema Zod `exploitantSchema.billetPrefix`. 8 tests unitaires couvrent accept alphanumerique (majuscules, minuscules, chiffres), reject ponctuation (CSV injection `=CMD`), virgule, espaces, et longueur > 5.

**Added:** 2026-04-14

---

## TD-026: Securite -- retention RGPD 5 ans non implementee

**Severity:** MEDIUM
**Context:** CLAUDE.md specifie suppression auto apres 5 ans, aucun cron n'existe pour ca.
**Added:** 2026-04-14

---

## TD-027: Auth -- NextAuth beta remplace par Better Auth

**Severity:** HIGH (resolu)
**Status:** RESOLVED (2026-04-15)

Migration de NextAuth v5.0.0-beta.30 vers Better Auth v1.6.4. L'equipe Auth.js a rejoint Better Auth (sept. 2025), qui est desormais recommande pour les nouveaux projets. Beneficies :

- Email+password natif (remplacement du magic link comme methode principale)
- Magic link toujours disponible pour reset password
- Google OAuth configure (credentials a ajouter quand pret)
- Admin plugin pour super admin
- Rate limiting built-in (resout TD-013)
- Middleware auth integre disponible
- Types TypeScript inferes automatiquement depuis la config
- Schema Prisma migre (User, Session, Account, Verification)

**Added:** 2026-04-15

---

## TD-028: Super Admin -- espace de gestion transverse

**Severity:** HIGH (resolu)
**Status:** RESOLVED (2026-04-16)

Route group `app/[locale]/admin/` protege par `requireRole('ADMIN_CALPAX')`. Pages : dashboard (stats + exploitants), users cross-tenant, sessions actives avec revocation, audit cross-tenant avec filtre exploitant, invitations (creation user). Banner d'impersonation. Sidebar admin + lien dans sidebar principale visible uniquement pour ADMIN_CALPAX.

**Added:** 2026-04-16

---

## TD-029: Auth -- mot de passe oublie et changement mot de passe

**Severity:** MEDIUM (resolu)
**Status:** RESOLVED (2026-04-16)

Flow complet :

- Page login : toggle "Mot de passe oublie ?" -> envoi lien reset via Resend (`authClient.requestPasswordReset`)
- Page `/auth/reset-password` : saisie nouveau mot de passe depuis token email (`authClient.resetPassword`)
- `sendResetPassword` callback ajoute dans `lib/auth.ts`
- Section "Changer le mot de passe" dans le profil (`ChangePasswordForm` client component)
- i18n FR + EN complet

**Added:** 2026-04-16

---

## TD-030: Auth -- 2FA / TOTP

**Severity:** LOW -- utile pour ADMIN_CALPAX, optionnel pour les autres.

**Context:** Better Auth fournit un plugin `twoFactor` avec TOTP (Google Authenticator, 1Password, etc.). Pas critique pour l'instant mais recommande pour les comptes ADMIN_CALPAX.

**Proposed fix:** Activer le plugin dans `lib/auth.ts`, ajouter UI de setup dans profil, forcer pour ADMIN_CALPAX.

**When:** Avant ouverture multi-exploitant.

**Added:** 2026-04-16

---

## TD-031: Auth -- Passkeys / WebAuthn

**Severity:** LOW -- meilleure UX que mot de passe a long terme.

**Context:** Better Auth supporte les passkeys via plugin. Permettrait login sans mot de passe via biometrie ou cle USB.

**Proposed fix:** Activer le plugin passkey, ajouter UI d'enregistrement dans profil.

**When:** V2 / ouverture publique.

**Added:** 2026-04-16

---

## TD-032: Auth -- Session management UI dans profil

**Severity:** LOW -- deja possible via admin, pas exposee cote user.

**Context:** L'utilisateur ne voit pas ses propres sessions actives (navigateur, mobile, etc.) et ne peut pas les revoquer individuellement. Seul ADMIN_CALPAX voit toutes les sessions de tous les users.

**Proposed fix:** Ajouter une Card "Sessions actives" dans la page profil avec liste + bouton "Deconnecter cet appareil".

**Added:** 2026-04-16

---

## TD-033: Auth -- "Se souvenir de moi" option

**Severity:** LOW -- UX mineure.

**Context:** Actuellement sessions 7 jours par defaut. Certains users voudraient "Se souvenir de moi" pour rester connectes 30 jours.

**Proposed fix:** Checkbox sur la page login, impacte la duree de session Better Auth.

**Added:** 2026-04-16

---

## TD-034: Auth -- Desactiver un user sans le supprimer

**Severity:** MEDIUM (resolu)
**Status:** RESOLVED (2026-04-16)

Utilise les champs natifs du plugin Better Auth admin (`banned`, `banReason`, `banExpires`) ajoutes au modele `User`. Le plugin bloque automatiquement la creation de session pour un user banne (hook `session.create.before`) et revoque ses sessions actives lors du ban. Action serveur `toggleUserBan` dans `lib/actions/admin.ts` qui delegue a `auth.api.banUser/unbanUser`. Colonne "Statut" + bouton Activer/Desactiver dans `/admin/users`. 3 tests d'integration dans `tests/integration/user-ban.spec.ts`.

**Added:** 2026-04-16

---

## TD-035: Tests E2E RBAC

**Severity:** LOW -- couvert par l'implementation mais pas par des tests automatises.

**Context:** Verifier automatiquement qu'un PILOTE ne peut pas acceder a /settings, qu'un EQUIPIER ne voit que ses vols, etc. Actuellement teste uniquement via ensureSeedData sans assertions RBAC.

**Proposed fix:** Ajouter des tests Playwright qui se connectent avec pilote@ et equipier@ et verifient les restrictions.

**Added:** 2026-04-16

---

## TD-036: Auth -- middleware audit sur impersonation

**Severity:** LOW -- deja partiellement fait.

**Context:** `lib/admin/impersonate.ts` fait du tracking via `impersonatedBy` dans RequestContext, propage dans audit log. A verifier que c'est correctement logge et visible dans l'audit UI.

**Proposed fix:** Ajouter une colonne "Impersonne par" visible dans la page audit admin.

**Added:** 2026-04-16

---

## TD-037: Auth -- audit log des evenements auth + lockout apres 5 echecs

**Severity:** HIGH (resolu)
**Status:** RESOLVED (2026-04-13)

Evenements auth captures via `hooks.before/after` Better Auth (path-based) + `databaseHooks` non requis :

- `SIGN_IN` (apres `/sign-in/*` succes, quand `newSession` est set)
- `SIGN_IN_FAILED` (apres `/sign-in/email` sans `newSession`)
- `SIGN_OUT` (apres `/sign-out`)
- `PASSWORD_RESET` (apres `/reset-password` token flow)
- `PASSWORD_CHANGED` (apres `/change-password` authentifie)
- `ACCOUNT_LOCKED` (emis par le flow failed quand la cible est atteinte)

Entries stockees dans `audit_log` avec `entityType='AUTH'` et `entityId = userId` (ou email pour les echecs). `exploitantId` resolu depuis le user quand connu, null sinon.

Lockout :

- Nouveau modele `FailedLoginAttempt` (email, ipAddress, userAgent, createdAt, index sur (email, createdAt))
- Nouveau champ `User.lockedUntil DateTime?`
- Policy : 5 echecs dans 15 min -> lock 30 min (`lib/auth/audit.ts` `LOCKOUT_POLICY`)
- Hook `before /sign-in/email` rejette avec APIError FORBIDDEN + code `ACCOUNT_LOCKED` si `lockedUntil > now`
- Compteur efface sur sign-in reussi
- Lock stale (`lockedUntil < now`) auto-efface par `getActiveLock`

Tests : 11 specs dans `tests/integration/auth-audit.spec.ts`.

**Added:** 2026-04-13
