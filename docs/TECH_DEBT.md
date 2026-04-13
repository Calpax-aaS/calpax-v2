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

**Severity:** MEDIUM -- pas bloquant pour le client zero (Olivier = GERANT) mais requis avant ouverture multi-utilisateur.

**Context:** 4 roles existent dans le schema Prisma (`ADMIN_CALPAX`, `GERANT`, `PILOTE`, `EQUIPIER`) et le role est propage via `RequestContext` (AsyncLocalStorage). Cependant `requireAuth()` verifie uniquement que l'utilisateur est connecte, sans jamais controler le role. Toutes les pages, actions serveur et API sont accessibles a tous les roles. Un EQUIPIER voit exactement les memes ecrans qu'un GERANT (billets, paiements, parametres, RGPD, audit).

**Proposed fix:**

- Ajouter un helper `requireRole(...roles: UserRole[])` qui s'appuie sur `getContext().role`
- Proteger les pages et server actions sensibles (billets, paiements, parametres, RGPD, audit)
- Adapter la sidebar pour masquer les items inaccessibles selon le role
- Definir la matrice d'acces par role avec Olivier

**When:** Avant ouverture a d'autres utilisateurs que le gerant (P3/P4).

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

**Severity:** HIGH -- cause des bugs silencieux (page blanche, donnees introuvables).

**Context:** Le post-filter du tenant extension pour `findUnique` compare `result[field]` avec `ctx.exploitantId`. Si le `select` ne contient pas le champ tenant (`exploitantId`), `result[field]` est `undefined` et le filtre retourne `null` silencieusement, comme si l'entite n'existait pas. Bug decouvert sur la page post-vol (2026-04-13).

**Proposed fix:** Dans le tenant extension, pour les `UNIQUE_READ_OPS`, forcer l'inclusion du champ tenant dans le `select` si un `select` est present. Ou a defaut, throw une erreur explicite si `result[field]` est `undefined` (ce qui signifie que le select a omis le champ tenant).

**When:** Prioritaire -- a corriger rapidement.

**Added:** 2026-04-13
