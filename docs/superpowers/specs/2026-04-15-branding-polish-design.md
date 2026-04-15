# Branding Polish — Login, Empty States, Dashboard

**Date:** 2026-04-15
**Scope:** 3 ameliorations visuelles, aucun changement fonctionnel

---

## 1. Page de login

### Layout

Split screen dans une card arrondie centree sur fond gris-bleu (#E8ECF0), plein ecran.

**Panneau gauche :**

- Degrade lineaire : bleu nuit (#0D3B66) -> bleu (#1A5A96 -> #3B82F6 -> #7DD3FC) -> dore (#F59E0B -> #FCD34D)
- Silhouettes de montgolfieres en SVG, blanc, opacity 15%, positionnees en haut/centre
- En bas : tagline "Volez avec Calpax. Votre flotte, votre ciel." en blanc bold 28px, sous-titre "La gestion de vols reinventee." en blanc 70% opacity

**Panneau droit :**

- Fond blanc
- Logo SVG hexagone (52px) centre
- Texte "Calpax" en 26px bold primary, sous-titre "SaaS de gestion de vols en montgolfiere" en 11px muted
- Titre "Connectez-vous a votre compte" en 18px semibold
- Champ email (label uppercase, input avec fond #F8FAFC)
- Bouton "Recevoir le lien de connexion" en primary
- Texte "Un lien magique vous sera envoye par email" en 11px muted
- Footer "Calpax 2026" en 10px

### Fichier

Modifier `app/[locale]/auth/signin/page.tsx` (ou le fichier de login existant). Page server component, pas besoin de client component.

### Responsive

Sur mobile (< 768px) : masquer le panneau gauche, afficher uniquement le formulaire en plein ecran avec le logo au-dessus.

---

## 2. Empty states

### Composant

Creer `components/empty-state.tsx` :

```tsx
type EmptyStateProps = {
  message: string
  actionLabel?: string
  actionHref?: string
}
```

- SVG de montgolfiere stylisee (~80px de haut, couleur `text-muted-foreground/30`)
- Texte `message` en `text-muted-foreground` centre
- Bouton CTA optionnel (`actionLabel` + `actionHref`) en variant `default`
- Le tout centre verticalement dans un conteneur `py-16`

### SVG

Un seul SVG reutilise partout : silhouette de montgolfiere simple (enveloppe arrondie + nacelle), en `currentColor` pour heriter de la couleur du parent.

### Pages a modifier

| Page               | Message                       | CTA                                 |
| ------------------ | ----------------------------- | ----------------------------------- |
| billets/page.tsx   | "Aucun billet pour le moment" | "Creer un billet" -> /billets/new   |
| vols/page.tsx      | "Aucun vol sur cette semaine" | "Planifier un vol" -> /vols/create  |
| ballons/page.tsx   | "Aucun ballon enregistre"     | "Ajouter un ballon" -> /ballons/new |
| pilotes/page.tsx   | "Aucun pilote enregistre"     | "Ajouter un pilote" -> /pilotes/new |
| equipiers/page.tsx | "Aucun equipier enregistre"   | "Ajouter un equipier" (inline form) |
| vehicules/page.tsx | "Aucun vehicule enregistre"   | "Ajouter un vehicule" (inline form) |
| sites/page.tsx     | "Aucun site enregistre"       | "Ajouter un site" (inline form)     |

Utiliser les cles i18n existantes (ex: `t('noBillets')`, `t('noEntries')`) pour les messages. Ajouter les cles manquantes.

### Integration

Remplacer les textes "Aucun X" existants dans les pages par `<EmptyState>`. Afficher l'EmptyState a l'interieur de la Card existante (a la place du tableau vide).

---

## 3. Dashboard enrichi

### Widget meteo du jour

**Fichier :** `app/[locale]/(app)/page.tsx`

Apres les 3 stats cards, ajouter une Card "Meteo du jour" :

- Si des vols sont prevus aujourd'hui :
  - Fetch la meteo pour la date du jour via `getWeather()`
  - Afficher un banner colore (vert/orange/rouge) avec le niveau go/no-go
  - Vent max et altitude, temperature moyenne
  - Nombre de vols concernes
- Si aucun vol aujourd'hui :
  - Texte "Aucun vol prevu aujourd'hui" en muted
- Si coordonnees GPS non configurees :
  - Texte "Configurez les coordonnees GPS dans Parametres"

Reutilise `summarizeWeather()` et `classifyWind()` de `lib/weather/classify.ts`.

### Graphique d'activite 4 semaines

Apres la table "Prochains vols", ajouter une Card "Activite" :

- Requete : `db.vol.groupBy({ by: ['date'], where: { date: { gte: 4WeeksAgo } } })` puis regrouper par semaine
- 4 colonnes (une par semaine), label "S-3", "S-2", "S-1", "Cette semaine"
- Chaque colonne = un `div` avec hauteur proportionnelle au nombre de vols
- Couleur : `bg-primary` pour les vols termines/archives, `bg-primary/30` pour les vols planifies/confirmes
- Nombre de vols affiche au-dessus de chaque barre
- Hauteur max de la barre la plus haute : 120px, les autres proportionnelles
- Pas de librairie graphique externe -- pur Tailwind

### Layout dashboard final

```
h1 "Tableau de bord"
p "Cameron Balloons France"

[Stats cards x3] (billets en attente, vols cette semaine, alertes)
[Meteo du jour]
[Prochains vols - table]
[Activite 4 semaines - bar chart]
```

---

## 4. Contraintes

- Aucun changement fonctionnel
- Aucune nouvelle dependance (pas de Chart.js, pas de lib d'illustrations)
- Responsive : login en single column sur mobile, dashboard empile naturellement
- i18n : tous les textes via `messages/fr.json` et `messages/en.json`
- Les SVG sont inline (pas de fichiers externes sauf le logo existant)
