# Calpax — Backlog produit

Légende : **MVP** = priorité absolue | **V2** = phase suivante | **Plus tard** = maturité produit

---

## 🔴 MVP — Réglementaire (non négociable)

> Ces features sont obligatoires avant toute ouverture commerciale. Elles conditionnent la conformité légale de chaque exploitant utilisant Calpax.

### Documents de vol
- [ ] **PVE auto-généré** — Procès-Verbal d'Envol post-vol, pré-rempli depuis les données du vol, export PDF, archivage horodaté
- [ ] **Devis de masse automatique** — calcul poids passagers + équipage + carburant, obligatoire avant tout décollage
- [ ] **Journal de bord ballon** — carnet de route numérique par vol (distinct du carnet pilote)
- [ ] **Collecte poids passager** — saisie obligatoire à la réservation, donnée chiffrée en base (RGPD)

### Ballon et navigabilité
- [ ] **Fiche ballon** — N° immatriculation, certificat Part-21, volume, capacité homologuée, organisme CAMO rattaché
- [ ] **Alertes maintenance CAMO** — alerte 60j et 30j avant échéance du contrôle annuel. Blocage du vol si certificat expiré

### Pilotes
- [ ] **Profil pilote — licence BFCL** — licence + qualification vol commercial passagers, date expiration, heures de vol, classe de ballon autorisée
- [ ] **Alertes licence BFCL** — alerte 90j et 30j avant expiration. Blocage d'affectation si licence invalide pour la classe du ballon

### Exploitant
- [ ] **Profil exploitant — N° FR.DEC** — numéro de déclaration DSAC, affiché sur tous les documents générés (PVE, billets, factures)

### RGPD
- [ ] **Politique de confidentialité** — affichée et acceptée lors de la réservation
- [ ] **Consentement explicite** — case non pré-cochée, traçabilité horodatée
- [ ] **Conservation + suppression automatique** — 5 ans max, suppression auto après délai légal
- [ ] **Interface droits RGPD** — accès, rectification, effacement, portabilité (traitement sous 30j)
- [ ] **Chiffrement données sensibles** — poids et coordonnées chiffrés en base, accès restreint
- [ ] **DPA exploitant** — Data Processing Agreement signé avec chaque exploitant (Calpax = sous-traitant RGPD art. 28)

### Paiements
- [ ] **3DS v2** — authentification forte DSP2 pour tout paiement > 30€, géré via Mollie
- [ ] **Zéro stockage carte** — PCI-DSS strict, uniquement token PSP côté Calpax
- [ ] **Facturation automatique** — facture conforme (N° SIRET, TVA, HT/TTC) générée après chaque paiement
- [ ] **Gestion remboursements** — politique configurable par l'exploitant, remboursement via API Mollie

---

## 🟢 MVP — Fonctionnel (valeur produit)

> Ces features constituent le cœur du produit. Sans elles, Calpax n'a pas de valeur perçue pour l'exploitant.

### Planning et vols
- [ ] **Planning des vols** — vue calendrier hebdomadaire et mensuelle, remplissage en temps réel vs capacité
- [ ] **Création d'un vol** — association ballon + pilote + date + créneau (matin/soir), vérification disponibilité et conformité automatique
- [ ] **Gestion des réservations** — recherche, filtrage, regroupement, suivi état paiement, affectation passagers
- [ ] **Dashboard jour J** — vue opérationnelle : passagers confirmés, poids total, devis de masse, équipe. Accessible mobile

### Réservation et paiement passager
- [ ] **Page réservation publique** — aux couleurs de l'exploitant, sans WooCommerce. Saisie infos passagers, poids, paiement Mollie intégré
- [ ] **Billet numérique** — PDF + QR code envoyé par email à la confirmation. Infos vol, lieu RDV, CGV
- [ ] **Gestion remboursements et annulations météo** — workflow structuré : annulation → notification → report → remboursement

### Vue pilote mobile
- [ ] **Vue pilote mobile** — vols assignés, liste passagers, poids total, lieu de décollage
- [ ] **Météo vol depuis mobile** — vent basse altitude, METAR aéroport proche, radar, tableau go/no-go
- [ ] **Validation vol par pilote** — confirmation durée réelle + lieu atterrissage → déclenchement PVE automatique

### Météo opérationnelle
- [ ] **Vent sol et basse altitude** — Open-Meteo API : vitesse + direction à 10m, 80m, 120m, 300m. Évolution heure par heure. Seuil go/no-go configurable (défaut : 15 kt)
- [ ] **Radar pluie et orages** — animation temps réel sur 3h passées + prévision 2h. Rayon 50 km autour du site de décollage
- [ ] **METAR décodés** — AVWX ou CheckWX API. Aéroports dans un rayon de 50 km (code OACI configurable). Mise à jour toutes les 30 min
- [ ] **TAF heure par heure** — prévision 24-36h avec catégorie de vol (VFR / MVFR / IFR)
- [ ] **Tableau go/no-go par vol** — feu vert / orange / rouge agrégé par vol planifié. Accessible depuis le planning et la vue pilote mobile

### Tracking GPS
- [ ] **Tracking GPS temps réel — carte pilote** — position GPS via smartphone pilote, trace parcours effectué, vitesse sol, cap, altitude. Leaflet.js + OpenStreetMap + WebSocket
- [ ] **Vue équipiers sol — suivi live** — carte temps réel ballon accessible depuis lien sécurisé sur smartphone équipier, sans app
- [ ] **Lien de suivi live passagers** — lien unique envoyé par SMS/email avant le vol, partageable aux proches. Page publique sans inscription : position ballon, trace, vitesse, altitude

### Infrastructure
- [ ] **Multi-tenant** — 1 espace de données isolé par exploitant (tenant_id sur toutes les tables)
- [ ] **Auth exploitant** — inscription, connexion, gestion compte (NextAuth.js)

---

## 🟡 V2 — Phase suivante

> Ces features apportent de la valeur significative mais ne bloquent pas le lancement. À construire après validation du MVP avec Olivier.

### Réglementaire
- [ ] **Checklist sécurité pré-vol** — BOP.BAS.190 complétée par le pilote sur mobile avant décollage, horodatée (conformité DSAC)
- [ ] **Suivi récence pilotes** — BFCL.160 : calcul automatique heures de vol récentes + alerte si récence insuffisante
- [ ] **Profil équipiers sol** — formation, disponibilités, affectation vol (membres d'équipage selon EU 2018/395)
- [ ] **Suivi incidents / DSAC** — centralisation événements sécurité, aide à la notification DSAC
- [ ] **Abonnements récurrents Mollie** — DSP2 : auth forte uniquement au 1er abonnement

### Passagers
- [ ] **Portail passager autonome** — consulter son vol, modifier ses infos, demander un report météo, télécharger son billet
- [ ] **Certificat d'ascension** — document souvenir personnalisé (nom, date, lieu, pilote, durée), PDF après vol

### Pilotes
- [ ] **Carnet de vol personnel** — chaque vol enregistré automatiquement, export pour démarches DGAC (renouvellement licence, récence)
- [ ] **Checklist pré-vol digitale** — voir section réglementaire ci-dessus

### Exploitants
- [ ] **Notifications email + SMS automatiques** — confirmation, rappel J-1, annulation météo, confirmation report
- [ ] **Bons cadeaux** — émission, suivi, utilisation. Ventes Noël / anniversaires
- [ ] **Workflow annulations météo** — annulation → notification → proposition report → remboursement si pas de report
- [ ] **Portail partenaires / revendeurs** — tableau de bord pour revendeurs de billets, suivi ventes autonome
- [ ] **Alertes météo automatiques** — notification push/email si dégradation dans les 3h avant un vol planifié (vent > seuil, orage, METAR IFR)
- [ ] **Historique météo par vol** — archivage conditions au moment de chaque vol (PVE + audits DSAC)

### GPS
- [ ] **Estimation zone d'atterrissage** — calcul depuis position + vitesse + cap + données vent Open-Meteo
- [ ] **Replay parcours après vol** — trace GPS complète en replay animé, partageable en lien public, intégrable au certificat d'ascension

### Directive PNR (conditionnel)
- [ ] **Interface transmission UIP** — à ajouter uniquement si confirmation que la directive PNR s'applique aux montgolfières (très probablement hors champ — à valider avec Olivier puis DSAC)

---

## ⚪ Plus tard — Maturité produit

> Features avancées pour les grandes structures ou la croissance du produit. Ne pas construire avant d'avoir des clients payants qui en font la demande explicite.

- [ ] **Statistiques et reporting** — dashboard analytics : vols, taux remplissage, CA mensuel/annuel, pyramide d'âges passagers
- [ ] **API publique** — pour intégration sur site existant, widgets planning embarquables
- [ ] **Export GPX / KML** — export trace GPS format GPX ou KML (Google Earth, Garmin)
- [ ] **Tracker GPS hardware nacelle** — intégration trackers GSM/GPRS standard envoyant position en NMEA ou JSON via API Calpax
- [ ] **Déclaration manifestation** — rappel automatique 45j avant + aide au formulaire préfectoral
- [ ] **Gestion affrètement** — un exploitant peut affrèter un autre (EU 2018/395)
- [ ] **Marque blanche complète** — page réservation 100% aux couleurs de l'exploitant, domaine personnalisé
- [ ] **Internationalisation complète** — DE, ES, IT, NL (FR + EN dès le MVP)
- [ ] **Connecteurs marketplaces** — Sport Découverte, coffrets cadeaux tiers

---

## 🏗️ Infrastructure et dette technique

- [ ] **Tests E2E** — Playwright sur les tunnels critiques (réservation, paiement, génération PVE)
- [ ] **Tests unitaires** — calcul devis de masse, génération PVE, logique alertes licences
- [ ] **Monitoring** — Sentry (erreurs) + logs structurés
- [ ] **Backup PostgreSQL** — automatique quotidien, rétention 30j
- [ ] **Rate limiting API** — protection endpoints publics (page réservation)

---

## ✅ Décisions techniques prises

- PostgreSQL + Prisma (pas d'ORM custom, pas de SQL brut sauf exception justifiée)
- Mollie comme PSP principal (couverture EU, abonnements SaaS + paiements passagers)
- Open-Meteo pour les données vent (gratuit, open source, pas de clé API)
- Leaflet.js + OpenStreetMap pour les cartes (open source, 0€)
- AVWX ou CheckWX pour METAR/TAF (freemium, niveau de base suffisant pour MVP)
- WebSocket pour le tracking GPS temps réel
- Vercel + Supabase pour l'hébergement (gratuit pour démarrer, scalable)

---

## 📋 À valider avec Olivier avant de coder

- [ ] Format exact du PVE attendu par la DSAC (comparer avec ce qu'il génère aujourd'hui en v1)
- [ ] Format exact du devis de masse (calculs spécifiques à sa flotte ?)
- [ ] Codes OACI des aéroports proches de ses sites de décollage (pour METAR/TAF)
- [ ] Directive PNR : a-t-il une obligation de transmission de données passagers aux autorités ?
- [ ] Workflows d'annulation météo : comment il gère aujourd'hui, ce qu'il voudrait automatiser
- [ ] Accès v1 PHP/MySQL pour extraction des données historiques (migration)
