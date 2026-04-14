# UI Redesign "Terre et Ciel" -- Design Spec

**Date:** 2026-04-13
**Direction:** Warm Professional -- Terre et Ciel
**Scope:** Toutes les pages, reskin uniquement (aucun changement fonctionnel)

---

## 1. Direction visuelle

Style "Terre et Ciel" : tons pierre/sable, accents terracotta, evoquant la terre vue du ciel et les champs au petit matin. Professionnel mais chaleureux, coherent avec l'univers montgolfiere.

---

## 2. Palette de couleurs

Toutes les valeurs sont exprimees en hex pour lisibilite. L'implementation utilisera OKLch dans globals.css pour coherence perceptuelle.

### Light mode

| Token                      | Hex       | Usage                                           |
| -------------------------- | --------- | ----------------------------------------------- |
| `--background`             | `#FAFAF8` | Fond de page                                    |
| `--foreground`             | `#1C1917` | Texte principal                                 |
| `--card`                   | `#FFFFFF` | Fond des cartes                                 |
| `--card-foreground`        | `#1C1917` | Texte dans les cartes                           |
| `--popover`                | `#FFFFFF` | Fond des popovers                               |
| `--popover-foreground`     | `#1C1917` | Texte des popovers                              |
| `--primary`                | `#C2410C` | Boutons, liens, accents principaux (terracotta) |
| `--primary-foreground`     | `#FFFFFF` | Texte sur primary                               |
| `--secondary`              | `#F5F5F4` | Boutons secondaires, fonds legers               |
| `--secondary-foreground`   | `#292524` | Texte sur secondary                             |
| `--muted`                  | `#F5F5F4` | Fonds attenues                                  |
| `--muted-foreground`       | `#57534E` | Texte attenue, placeholders                     |
| `--accent`                 | `#FFF7ED` | Fond accent (orange clair)                      |
| `--accent-foreground`      | `#9A3412` | Texte sur accent                                |
| `--destructive`            | `#B91C1C` | Actions destructives                            |
| `--destructive-foreground` | `#FFFFFF` | Texte sur destructive                           |
| `--border`                 | `#E7E5E4` | Bordures                                        |
| `--input`                  | `#D6D3D1` | Bordures des inputs                             |
| `--ring`                   | `#C2410C` | Focus ring (terracotta)                         |

#### Sidebar (light)

| Token                          | Hex                     |
| ------------------------------ | ----------------------- |
| `--sidebar-background`         | `#292524`               |
| `--sidebar-foreground`         | `#E7E5E4`               |
| `--sidebar-primary`            | `#C2410C`               |
| `--sidebar-primary-foreground` | `#FFFFFF`               |
| `--sidebar-accent`             | `rgba(255,255,255,0.1)` |
| `--sidebar-accent-foreground`  | `#FAFAF9`               |
| `--sidebar-border`             | `rgba(255,255,255,0.1)` |
| `--sidebar-ring`               | `#C2410C`               |
| `--sidebar-muted-foreground`   | `rgba(255,255,255,0.5)` |

#### Couleurs semantiques (light)

| Token                  | Hex       | Usage                  |
| ---------------------- | --------- | ---------------------- |
| `--success`            | `#15803D` | Confirme, paye, valide |
| `--success-foreground` | `#FFFFFF` | Texte sur success      |
| `--warning`            | `#A16207` | Alertes warning        |
| `--warning-foreground` | `#FFFFFF` | Texte sur warning      |
| `--info`               | `#1D4ED8` | Informatif, en cours   |
| `--info-foreground`    | `#FFFFFF` | Texte sur info         |

#### Chart colors (light)

| Token       | Hex       |
| ----------- | --------- |
| `--chart-1` | `#C2410C` |
| `--chart-2` | `#15803D` |
| `--chart-3` | `#D97706` |
| `--chart-4` | `#1D4ED8` |
| `--chart-5` | `#78716C` |

### Dark mode

| Token                      | Hex       |
| -------------------------- | --------- |
| `--background`             | `#1C1917` |
| `--foreground`             | `#FAFAF9` |
| `--card`                   | `#292524` |
| `--card-foreground`        | `#FAFAF9` |
| `--popover`                | `#292524` |
| `--popover-foreground`     | `#FAFAF9` |
| `--primary`                | `#EA580C` |
| `--primary-foreground`     | `#FFFFFF` |
| `--secondary`              | `#44403C` |
| `--secondary-foreground`   | `#FAFAF9` |
| `--muted`                  | `#44403C` |
| `--muted-foreground`       | `#A8A29E` |
| `--accent`                 | `#431407` |
| `--accent-foreground`      | `#FDBA74` |
| `--destructive`            | `#EF4444` |
| `--destructive-foreground` | `#FFFFFF` |
| `--border`                 | `#44403C` |
| `--input`                  | `#57534E` |
| `--ring`                   | `#EA580C` |

#### Sidebar (dark)

| Token                          | Hex                      |
| ------------------------------ | ------------------------ |
| `--sidebar-background`         | `#0C0A09`                |
| `--sidebar-foreground`         | `#E7E5E4`                |
| `--sidebar-primary`            | `#EA580C`                |
| `--sidebar-primary-foreground` | `#FFFFFF`                |
| `--sidebar-accent`             | `rgba(255,255,255,0.1)`  |
| `--sidebar-accent-foreground`  | `#FAFAF9`                |
| `--sidebar-border`             | `rgba(255,255,255,0.15)` |
| `--sidebar-ring`               | `#EA580C`                |
| `--sidebar-muted-foreground`   | `rgba(255,255,255,0.5)`  |

#### Couleurs semantiques (dark)

| Token                  | Hex       |
| ---------------------- | --------- |
| `--success`            | `#22C55E` |
| `--success-foreground` | `#052E16` |
| `--warning`            | `#EAB308` |
| `--warning-foreground` | `#422006` |
| `--info`               | `#3B82F6` |
| `--info-foreground`    | `#1E3A5F` |

#### Chart colors (dark)

| Token       | Hex       |
| ----------- | --------- |
| `--chart-1` | `#EA580C` |
| `--chart-2` | `#22C55E` |
| `--chart-3` | `#F59E0B` |
| `--chart-4` | `#3B82F6` |
| `--chart-5` | `#A8A29E` |

---

## 3. Typographie

| Token            | Valeur                                      |
| ---------------- | ------------------------------------------- |
| `--font-sans`    | `DM Sans` (Google Fonts, subsets: latin)    |
| `--font-heading` | `var(--font-sans)`                          |
| Heading h1       | 30px / 700                                  |
| Heading h2       | 24px / 700                                  |
| Heading h3       | 18px / 600                                  |
| Heading h4       | 16px / 600                                  |
| Body             | 14px / 400                                  |
| Small            | 12px / 400                                  |
| Label            | 11px / 500, uppercase, letter-spacing 0.5px |

Remplacement de Geist par DM Sans dans `app/layout.tsx` via `next/font/google`.

### Border radius

Inchange : base `0.625rem` (10px), echelle sm/md/lg/xl/2xl/3xl/4xl.

---

## 4. Migration composants

### Base UI vers shadcn/ui (7 composants)

| Fichier actuel                | Module Base UI                             | Remplacement shadcn/ui            |
| ----------------------------- | ------------------------------------------ | --------------------------------- |
| `components/ui/button.tsx`    | `@base-ui/react/button`                    | `npx shadcn@latest add button`    |
| `components/ui/input.tsx`     | `@base-ui/react/input`                     | `npx shadcn@latest add input`     |
| `components/ui/badge.tsx`     | `@base-ui/react/merge-props`, `use-render` | `npx shadcn@latest add badge`     |
| `components/ui/separator.tsx` | `@base-ui/react/separator`                 | `npx shadcn@latest add separator` |
| `components/ui/sheet.tsx`     | `@base-ui/react/dialog`                    | `npx shadcn@latest add sheet`     |
| `components/ui/tooltip.tsx`   | `@base-ui/react/tooltip`                   | `npx shadcn@latest add tooltip`   |
| `components/ui/sidebar.tsx`   | `@base-ui/react/merge-props`, `use-render` | `npx shadcn@latest add sidebar`   |

### Composants compatibles (pas de migration)

Ces fichiers n'utilisent pas Base UI et restent tels quels :

- `card.tsx`, `label.tsx`, `skeleton.tsx`, `table.tsx`, `textarea.tsx`

### Nouveaux composants a ajouter

| Composant      | Usage                                                        |
| -------------- | ------------------------------------------------------------ |
| `Select`       | Remplacement des `<select>` natifs dans tous les formulaires |
| `Dialog`       | Confirmations de suppression, modales                        |
| `DropdownMenu` | Actions contextuelles sur les lignes de tableaux             |
| `Tabs`         | Organisation des sections dans les pages detail              |
| `Sonner`       | Toast feedback apres actions (save, delete, erreur)          |

### Nettoyage post-migration

- Supprimer `@base-ui/react` de `package.json`
- Verifier qu'aucun import `@base-ui` ne subsiste dans le codebase

---

## 5. Composants feature -- adaptations

### Badge variants

Conserver les variants existants, realigner les couleurs sur les tokens :

| Variant       | Light            | Dark             | Usage                                        |
| ------------- | ---------------- | ---------------- | -------------------------------------------- |
| `default`     | `primary` bg     | `primary` bg     | Statut actif (PLANIFIE, CONFIRME)            |
| `secondary`   | `secondary` bg   | `secondary` bg   | Statut neutre (VOLE)                         |
| `outline`     | Bordure `border` | Bordure `border` | Statut en attente (EN_ATTENTE)               |
| `destructive` | `destructive` bg | `destructive` bg | Statut negatif (ANNULE, REMBOURSE, EXPIRE)   |
| `success`     | `success` bg     | `success` bg     | Nouveau variant -- paye, confirme            |
| `warning`     | `warning` bg     | `warning` bg     | Nouveau variant -- alerte, expiration proche |

### Alerts banner

Remplacer les couleurs Tailwind hardcodees par les tokens semantiques :

| Severite | Background                               | Texte  |
| -------- | ---------------------------------------- | ------ |
| EXPIRED  | `destructive` / `destructive-foreground` | Rouge  |
| CRITICAL | `warning` bg variant                     | Orange |
| WARNING  | `accent`                                 | Ambre  |

### Week grid (planning vols)

Bordures de statut alignees sur les tokens :

| Statut vol | Token couleur                  |
| ---------- | ------------------------------ |
| PLANIFIE   | `primary` (terracotta)         |
| CONFIRME   | `success` (vert)               |
| EN_VOL     | `info` (bleu)                  |
| TERMINE    | `muted-foreground` (stone-400) |
| ANNULE     | `destructive` (rouge)          |

### ExpiryBadge

Utiliser les variants `warning` et `destructive` du Badge au lieu de couleurs hardcodees.

---

## 6. Pages -- structure redesign

### Layout global (`app/[locale]/(app)/layout.tsx`)

- Sidebar shadcn/ui avec fond stone-900 (light) / stone-950 (dark)
- Logo "Calpax" en couleur `sidebar-primary` (terracotta)
- Fond de page `background` token
- Padding main content : `p-6` (inchange)

### Dashboard (`page.tsx`)

Refonte complete (actuellement minimal) :

```
+--------------------------------------------------+
| Stats cards (3-4 en row)                         |
| [En attente: 12] [Vols semaine: 5] [Alertes: 3] |
+--------------------------------------------------+
| Prochains vols (liste des 5 prochains)           |
| Card avec date, ballon, pilote, nb passagers     |
+--------------------------------------------------+
| Alertes reglementaires (si existantes)           |
| Expiry badges avec liens vers entites            |
+--------------------------------------------------+
```

### Pages listing (billets, vols, ballons, pilotes, equipiers, vehicules, sites)

```
+--------------------------------------------------+
| h1 Titre                        [+ Nouveau]     |
+--------------------------------------------------+
| Table shadcn/ui                                   |
| - Header avec labels uppercase                    |
| - Rows avec hover bg-muted/50                     |
| - Badges statut avec variants semantiques         |
| - DropdownMenu actions par ligne (voir, editer,  |
|   supprimer)                                      |
+--------------------------------------------------+
```

### Pages detail (billet/[id], vol/[id], ballon/[id], pilote/[id])

```
+--------------------------------------------------+
| h1 Titre               [Editer] [Supprimer]     |
+--------------------------------------------------+
| Tabs: Infos | Passagers | Meteo | Documents      |
+--------------------------------------------------+
| Tab content dans Card                             |
| Sections avec h3 + grille de donnees              |
+--------------------------------------------------+
```

### Pages formulaire (edit, new, create)

- Inputs shadcn/ui `Input` avec `Label` uppercase
- Selects shadcn/ui `Select` au lieu des `<select>` natifs
- Boutons : primary (save) + outline (annuler)
- Toast `Sonner` apres save/erreur
- `Dialog` de confirmation avant suppression

### Pages utilitaires (settings, audit, rgpd)

Meme traitement Card + Table que les pages listing.

---

## 7. Contraintes et non-objectifs

### Contraintes

- **Reskin uniquement** : aucun changement de logique metier, schemas Prisma, actions serveur, ou API
- **Accessibilite** : contraste WCAG AA minimum sur toutes les combinaisons texte/fond
- **Performance** : DM Sans chargee via `next/font/google` avec preload (comme Geist actuellement)
- **Compatibilite** : tous les formulaires existants (react-hook-form + zod) doivent continuer a fonctionner
- **i18n** : aucun changement aux fichiers de traduction (`messages/fr.json`, `messages/en.json`) sauf si un label UI change

### Non-objectifs

- Pas de nouvelles fonctionnalites
- Pas de refonte de la navigation (memes items sidebar)
- Pas de changement d'architecture (SSR/CSR, routing, etc.)
- Pas de nouveau systeme d'animations ou transitions
