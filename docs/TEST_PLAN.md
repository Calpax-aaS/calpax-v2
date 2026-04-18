# Plan de test exhaustif — Calpax v2

Ce document couvre toutes les features implementees (M0 a M3 + tags + bons cadeaux).
Cocher chaque item apres test. Noter les bugs/remarques en bas.

**Comptes de test (org Cameron Balloons France) :**

- ADMIN_CALPAX : `dcuenot@calpax.fr` / `Calpax-2026-Demo!`
- GERANT : `olivier@cameronfrance.com` / `Calpax-2026-Demo!`
- PILOTE : `pilote@cameronfrance.com` / `Calpax-2026-Demo!`
- EQUIPIER : `equipier@cameronfrance.com` / `Calpax-2026-Demo!`

**Comptes de test (org Demo Montgolfiere) :**

- GERANT : `demo-gerant@calpax.fr` / `Calpax-2026-Demo!`
- PILOTE : `demo-pilote@calpax.fr` / `Calpax-2026-Demo!`
- EQUIPIER : `demo-equipier@calpax.fr` / `Calpax-2026-Demo!`

---

## 1. Authentification

### 1.1 Connexion email/mot de passe

- [ ] Se connecter avec dcuenot@calpax.fr
- [ ] Se connecter avec olivier@cameronfrance.com
- [ ] Tester un mot de passe incorrect → message d'erreur
- [ ] Tester 5 mots de passe incorrects → compte verrouille 30 min
- [ ] Se deconnecter

### 1.2 Google OAuth

- [ ] Cliquer "Se connecter avec Google" sur la page login
- [ ] Verifier la redirection Google → retour sur l'app
- [ ] Depuis le profil, lier un compte Google (bouton "Lier")
- [ ] Depuis le profil, delier un compte Google (bouton "Delier")

### 1.3 Mot de passe oublie

- [ ] Sur la page login, cliquer "Mot de passe oublie"
- [ ] Saisir un email → verifier reception de l'email
- [ ] Cliquer le lien dans l'email → page de reset
- [ ] Saisir un nouveau mot de passe (min 12 caracteres)
- [ ] Verifier le metre de force du mot de passe (5 barres)
- [ ] Se connecter avec le nouveau mot de passe

### 1.4 Changement de mot de passe

- [ ] Depuis le profil, section "Changer le mot de passe"
- [ ] Saisir ancien + nouveau mot de passe
- [ ] Verifier le metre de force
- [ ] Confirmer → toast succes

---

## 2. Dashboard jour J (M3)

### 2.1 Vue GERANT/ADMIN

- [ ] La page d'accueil affiche "Vols du jour — [date]"
- [ ] S'il y a des vols aujourd'hui : cartes de vol affichees
- [ ] Chaque carte montre : creneau, ballon, pilote, equipier, site, passagers/capacite
- [ ] Le devis de masse est affiche (poids total vs charge max) avec badge vert/orange/rouge
- [ ] La meteo est affichee (vent, temperature, badge GO/NO-GO/Limite)
- [ ] Les alertes CAMO/BFCL ne montrent que les entites du jour
- [ ] Boutons d'action rapide : "Detail", "Organiser" (si PLANIFIE)
- [ ] S'il n'y a pas de vol : message "Aucun vol aujourd'hui" + lien vers le planning

### 2.2 Vue PILOTE

- [ ] Se connecter avec pilote@cameronfrance.com
- [ ] Verifier que le dashboard ne montre que les vols assignes a ce pilote
- [ ] Les vols des autres pilotes ne sont PAS visibles

### 2.3 Vue EQUIPIER

- [ ] Se connecter avec equipier@cameronfrance.com
- [ ] Verifier que le dashboard montre tous les vols du tenant (pas de filtrage equipier)

---

## 3. Gestion des ballons

### 3.1 Liste

- [ ] Page /ballons → liste des ballons avec tableau
- [ ] Colonnes : nom, immatriculation, volume, pax max, CAMO, statut
- [ ] Badge de statut CAMO (couleur selon expiration)

### 3.2 Creation

- [ ] Bouton "Nouveau ballon" → formulaire
- [ ] Remplir : nom, immatriculation, volume, pax max, pesee a vide, config gaz, ref MANEX
- [ ] Optionnel : MTOM, MLM, organisme CAMO, date expiration CAMO, certificat navigabilite
- [ ] Remplir le devis de chargement (tableau temperature → charge utile max)
- [ ] Enregistrer → toast "Ballon enregistre"

### 3.3 Detail

- [ ] Cliquer sur un ballon → page detail
- [ ] Toutes les infos affichees
- [ ] Badge CAMO avec jours restants

### 3.4 Edition

- [ ] Bouton "Modifier" → formulaire pre-rempli
- [ ] Modifier un champ → enregistrer → toast succes
- [ ] Retour sur le detail → verifier la modification

### 3.5 Journal de bord

- [ ] Sur la page detail, lien "Journal de bord"
- [ ] Liste des vols effectues avec ce ballon

### 3.6 Activation/desactivation

- [ ] Bouton toggle actif/inactif sur un ballon
- [ ] Un ballon inactif ne doit plus etre selectionnable pour creer un vol

---

## 4. Gestion des pilotes

### 4.1 Liste

- [ ] Page /pilotes → liste des pilotes
- [ ] Colonnes : nom, licence BFCL, expiration, classes, statut

### 4.2 Creation

- [ ] Formulaire : prenom, nom, email, telephone, licence BFCL, date expiration
- [ ] Classes de ballon (A/B/C/D) en cases a cocher
- [ ] Poids (chiffre en kg, sera stocke chiffre)
- [ ] Heures de vol
- [ ] Enregistrer → toast succes

### 4.3 Detail

- [ ] Infos completes
- [ ] Badge licence BFCL (jours restants, couleur)

### 4.4 Edition

- [ ] Modifier les infos → enregistrer → verifier

### 4.5 Alertes reglementaires

- [ ] Si licence BFCL expire dans < 90j → alerte WARNING
- [ ] Si licence BFCL expire dans < 30j → alerte CRITICAL
- [ ] Si licence BFCL expiree → alerte EXPIRED
- [ ] Un pilote avec licence expiree ne doit PAS pouvoir etre assigne a un vol

---

## 5. Gestion des billets

### 5.1 Liste

- [ ] Page /billets → tableau des billets
- [ ] Reference auto-generee (prefixe exploitant + annee + sequence)
- [ ] Colonnes : reference, payeur, statut, montant, date

### 5.2 Creation

- [ ] Formulaire : payeur (nom, prenom, email, telephone), montant TTC
- [ ] Type de planification (matin/soir/toute la journee/au plus vite/autre)
- [ ] Fenetre de dates (debut/fin), date validite, date rappel
- [ ] Categorie, provenance, commentaire
- [ ] Ajout de passagers (nom, poids, age, PMR, contact)
- [ ] Enregistrer → reference generee

### 5.3 Detail

- [ ] Infos billet + liste passagers
- [ ] Section paiements

### 5.4 Edition

- [ ] Modifier les infos du billet → enregistrer

### 5.5 Paiements

- [ ] Ajouter un paiement : mode (especes/CB/cheque/virement), montant, date
- [ ] Verifier le solde restant mis a jour
- [ ] Supprimer un paiement → confirmation

---

## 6. Planning des vols

### 6.1 Vue desktop (grille semaine)

- [ ] Page /vols → grille semaine avec navigation (semaine precedente/suivante)
- [ ] Vols affiches sur les bonnes dates
- [ ] Bouton "Aujourd'hui" ramene a la semaine courante

### 6.2 Vue mobile (M3)

- [ ] Sur mobile (< md), la grille est remplacee par une liste de cartes
- [ ] Chaque carte montre les memes infos que sur le dashboard
- [ ] Le filtrage par role s'applique (PILOTE voit ses vols uniquement)

### 6.3 Creation de vol

- [ ] Bouton "Nouveau vol" → formulaire
- [ ] Selectionner : date, creneau (matin/soir), ballon, pilote
- [ ] Optionnel : equipier, vehicule, site de decollage, config gaz, quantite gaz
- [ ] Possibilite de saisir un "autre" (texte libre) pour equipier/vehicule/site
- [ ] **Validation** : ballon avec CAMO expire → rejete
- [ ] **Validation** : pilote avec licence BFCL expiree → rejete
- [ ] Enregistrer → vol cree en statut PLANIFIE

### 6.4 Detail du vol

- [ ] Page /vols/[id] → toutes les infos du vol
- [ ] Passagers assignes avec poids (dechiffre)
- [ ] Meteo (vent, temperature par altitude, go/no-go)
- [ ] Devis de masse (poids total, charge max selon temperature, marge)
- [ ] Boutons d'action selon le statut
- [ ] **Responsive** : infos empilees sur mobile, tableau passagers scrollable
- [ ] **Sticky CTA** : si vol CONFIRME, bouton "Saisie post-vol" fixe en bas sur mobile

### 6.5 Edition du vol

- [ ] Modifier ballon, pilote, date, creneau → enregistrer

### 6.6 Organisation (affectation passagers)

- [ ] Page /vols/[id]/organiser
- [ ] Liste des billets disponibles a gauche
- [ ] Affecter un billet → passagers apparaissent dans le vol
- [ ] Desaffecter un passager
- [ ] Confirmer le vol → statut passe a CONFIRME
- [ ] **Acces** : GERANT et ADMIN uniquement (pas PILOTE)

---

## 7. Post-vol wizard (M3)

### 7.1 Navigation

- [ ] Depuis le detail du vol (CONFIRME), cliquer "Saisie post-vol"
- [ ] Sur mobile, le bouton sticky en bas fonctionne
- [ ] Le wizard affiche 3 pastilles de progression

### 7.2 Etape 1 — Decollage

- [ ] Lieu de decollage pre-rempli depuis le site du vol
- [ ] Saisir l'heure de decollage
- [ ] Bouton "Suivant" desactive tant que l'heure n'est pas remplie

### 7.3 Etape 2 — Atterrissage

- [ ] Saisir lieu d'atterrissage, heure, consommation gaz, distance
- [ ] Boutons "Retour" et "Suivant"
- [ ] "Suivant" desactive tant que l'heure n'est pas remplie

### 7.4 Etape 3 — Compte-rendu

- [ ] Textarea pour anomalies (optionnel)
- [ ] Toggle "Note dans carnet de bord" (defaut : oui)
- [ ] Recapitulatif lecture seule des etapes 1 et 2
- [ ] Bouton "Valider le vol" → vol passe en TERMINE
- [ ] Redirection vers le detail du vol
- [ ] Toast de succes

### 7.5 Acces par role

- [ ] PILOTE peut acceder au post-vol sur ses propres vols
- [ ] GERANT et ADMIN peuvent acceder au post-vol de tous les vols

---

## 8. PVE et documents reglementaires

### 8.1 Fiche de vol (PDF)

- [ ] Sur un vol CONFIRME ou TERMINE, bouton "Telecharger PVE"
- [ ] Le PDF s'ouvre avec : en-tete exploitant + FR.DEC, ballon, pilote
- [ ] Devis de masse avec tableau par temperature
- [ ] Liste passagers avec poids
- [ ] Page meteo avec tableau vent

### 8.2 Archivage PVE

- [ ] Sur un vol TERMINE, bouton "Archiver comme PVE"
- [ ] Confirmation → PDF genere et stocke
- [ ] Vol passe en ARCHIVE
- [ ] Billets des passagers passent en VOLE
- [ ] Bouton "Telecharger PVE" toujours disponible sur le vol archive

---

## 9. Annulation meteo (M3)

### 9.1 Alerte automatique

- [ ] Si un vol du jour a un vent prevu > seuil exploitant → bandeau orange
- [ ] Le bandeau apparait sur le dashboard (dans la carte du vol)
- [ ] Le bandeau apparait sur la page detail du vol avec bouton "Annuler (meteo)"
- [ ] Si la meteo s'ameliore, le bandeau disparait (au prochain run du cron)

### 9.2 Annulation manuelle

- [ ] Cliquer "Annuler (meteo)" → boite de confirmation
- [ ] Confirmer → vol passe en ANNULE
- [ ] Les passagers sont desaffectes
- [ ] La raison "Meteo" est enregistree sur le vol

### 9.3 Notifications email

- [ ] Le payeur/organisateur recoit un email d'annulation
- [ ] Le pilote assigne recoit un email (sauf s'il est l'annulant)
- [ ] L'equipier recoit un email (si email configure — actuellement pas de champ email sur equipier)

### 9.4 Annulation classique (non meteo)

- [ ] Bouton "Annuler le vol" sur le detail → confirmation
- [ ] Vol annule, passagers desaffectes
- [ ] Memes notifications email envoyees

---

## 10. Meteo

### 10.1 Configuration

- [ ] Page /settings → section Meteo
- [ ] Saisir latitude, longitude, seuil de vent (kt)
- [ ] Enregistrer

### 10.2 Affichage

- [ ] Sur le detail d'un vol, la section meteo affiche le vent par altitude + temperature
- [ ] Bouton "Rafraichir" force un nouveau fetch
- [ ] Classification go/no-go basee sur le seuil configure

---

## 11. Equipiers / Vehicules / Sites de decollage

### 11.1 Equipiers

- [ ] Page /equipiers → liste (nom, prenom, telephone)
- [ ] Creer un equipier
- [ ] Activer/desactiver un equipier
- [ ] **Acces** : GERANT et ADMIN uniquement

### 11.2 Vehicules

- [ ] Page /vehicules → liste (nom/description)
- [ ] Creer un vehicule
- [ ] Activer/desactiver
- [ ] **Acces** : GERANT et ADMIN uniquement

### 11.3 Sites de decollage

- [ ] Page /sites → liste (nom, coordonnees)
- [ ] Creer un site
- [ ] Activer/desactiver
- [ ] **Acces** : GERANT et ADMIN uniquement

---

## 12. Parametres exploitant

- [ ] Page /settings
- [ ] Informations generales : nom (lecture seule), N FR.DEC (lecture seule)
- [ ] Informations legales : SIRET, N CAMO
- [ ] Coordonnees : adresse, code postal, ville, pays, telephone, email, site web, contact
- [ ] Prefixe references billets (alphanumerique, max 5 car)
- [ ] Section meteo : latitude, longitude, seuil vent
- [ ] Upload logo (PNG/JPG/SVG, max 2 Mo) → logo affiche dans l'app
- [ ] Enregistrer → toast succes
- [ ] **Acces** : GERANT et ADMIN uniquement

---

## 13. RGPD

- [ ] Page /rgpd
- [ ] Recherche par nom/email → liste de personnes
- [ ] Export des donnees d'une personne (JSON/PDF)
- [ ] Anonymisation d'une personne → donnees irreversiblement anonymisees
- [ ] Confirmation requise avant anonymisation
- [ ] **Acces** : GERANT et ADMIN uniquement

---

## 14. Audit

- [ ] Page /audit → journal d'audit du tenant
- [ ] Actions tracees : creation, modification, suppression sur toutes les entites
- [ ] PII redactee dans les logs (email, telephone, poids)
- [ ] Evenements auth traces : connexion, echec, reset password, changement password, lock
- [ ] **Acces** : GERANT et ADMIN uniquement

---

## 15. Profil utilisateur

- [ ] Page /profil
- [ ] Section identite (nom, email, role)
- [ ] Section exploitant (nom, N FR.DEC)
- [ ] Section comptes lies (Google — lier/delier)
- [ ] Section changer mot de passe

---

## 16. Super Admin

### 16.1 Acces

- [ ] Lien "Super Admin" visible uniquement pour ADMIN_CALPAX
- [ ] Les autres roles ne voient pas le lien et ne peuvent pas acceder aux pages /admin/\*

### 16.2 Dashboard admin

- [ ] Stats globales (nombre d'exploitants, d'utilisateurs)
- [ ] Table des exploitants
- [ ] Bouton "Impersonner" → se connecter en tant qu'exploitant

### 16.3 Users

- [ ] Liste cross-tenant de tous les utilisateurs
- [ ] Colonnes : nom, email, role, exploitant, derniere connexion, statut
- [ ] Bouton "Desactiver" → utilisateur ne peut plus se connecter
- [ ] Bouton "Reactiver" → utilisateur peut se reconnecter
- [ ] Un admin ne peut pas se desactiver lui-meme

### 16.4 Sessions

- [ ] Liste des sessions actives
- [ ] Bouton "Revoquer" → session supprimee

### 16.5 Audit

- [ ] Journal d'audit cross-tenant
- [ ] Filtre par exploitant

### 16.6 Invitations

- [ ] Formulaire : email, nom, exploitant, role
- [ ] Creer → email d'invitation envoye
- [ ] L'utilisateur recoit un lien pour definir son mot de passe

---

## 17. RBAC (test croise par role)

### 17.1 PILOTE (pilote@cameronfrance.com)

- [ ] Voit : accueil, billets, vols, ballons, pilotes
- [ ] Ne voit PAS : equipiers, vehicules, sites, parametres, RGPD, audit
- [ ] Dashboard : ne voit que ses propres vols
- [ ] Planning vols : ne voit que ses propres vols
- [ ] Peut acceder au post-vol sur ses vols
- [ ] Ne peut PAS creer/modifier des vols
- [ ] Ne peut PAS organiser (affecter passagers)
- [ ] Ne peut PAS archiver un PVE
- [ ] Ne peut PAS annuler un vol

### 17.2 EQUIPIER (equipier@cameronfrance.com)

- [ ] Voit : accueil, vols
- [ ] Ne voit PAS : billets, ballons, pilotes, equipiers, vehicules, sites, parametres, RGPD, audit
- [ ] Dashboard : voit tous les vols du tenant

### 17.3 GERANT (olivier@cameronfrance.com)

- [ ] Voit tout sauf Super Admin
- [ ] Peut creer/modifier/annuler des vols
- [ ] Peut organiser (affecter passagers)
- [ ] Peut archiver PVE
- [ ] Peut gerer billets, paiements
- [ ] Peut gerer equipiers, vehicules, sites
- [ ] Peut modifier les parametres
- [ ] Ne voit PAS le lien "Super Admin"

---

## 18. Tags sur billets

### 18.1 Gestion des tags (Settings)

- [ ] Page /settings → section "Tags" en bas de page
- [ ] Aucun tag par defaut → message "Aucun tag"
- [ ] Saisir un nom + choisir une couleur → cliquer "Ajouter"
- [ ] Le tag apparait comme badge colore
- [ ] Creer plusieurs tags (ex: "Standard", "Evenementiel", "Vol exclusif", "Bon cadeau")
- [ ] Tenter de creer un doublon → erreur "Un tag avec ce nom existe deja"
- [ ] Supprimer un tag → confirmation → tag supprime
- [ ] **Acces** : GERANT et ADMIN uniquement

### 18.2 Tags sur les billets

- [ ] Page detail billet → les tags assignes s'affichent comme badges colores
- [ ] Apres migration V1 : verifier que les billets ont bien les tags importes (volParticularite + categorie)

---

## 19. Bons cadeaux

### 19.1 Creation d'un bon cadeau

- [ ] Page edition billet → toggle "Bon cadeau" (Switch)
- [ ] Quand active : section conditionnelle apparait avec date cadeau, destinataire, organisateur
- [ ] Remplir : date cadeau, destinataire nom + email, organisateur nom + email + telephone
- [ ] Enregistrer → toast succes
- [ ] Quand desactive : les champs disparaissent

### 19.2 Affichage bon cadeau

- [ ] Page detail billet → si estBonCadeau=true, section "Bon cadeau" affichee
- [ ] Date du cadeau affichee
- [ ] Destinataire (nom + email) affiche
- [ ] Organisateur (nom + email + telephone) affiche

### 19.3 Billet normal (non cadeau)

- [ ] Toggle desactive par defaut
- [ ] Pas de section bon cadeau sur le detail
- [ ] Les champs destinataire/organisateur ne sont pas envoyes au serveur

---

## 20. Donnees migrees V1

### 20.1 Volumes (apres migration)

- [ ] Verifier le nombre de billets (~3 900)
- [ ] Verifier le nombre de passagers (~11 000)
- [ ] Verifier le nombre de paiements (~2 900)
- [ ] Verifier le nombre de vols (~1 370)
- [ ] Verifier les ballons (9 actifs + historiques inactifs)
- [ ] Verifier les pilotes (4 principaux + imports)

### 20.2 Integrite des donnees

- [ ] Ouvrir un billet migre → reference V1 conservee
- [ ] Verifier montant TTC + statut paiement coherent
- [ ] Verifier les passagers du billet (noms, poids chiffre)
- [ ] Verifier les paiements associes (mode, montant, date)
- [ ] Verifier les tags importes (categorie + particularite de vol)

### 20.3 Vols migres

- [ ] Ouvrir un vol archive → infos post-vol presentes (lieu deco/atter, heures, gaz)
- [ ] Verifier l'assignation des passagers aux vols
- [ ] Verifier que le ballon et le pilote sont correctement lies
- [ ] Telecharger un PVE pour un vol archive → PDF genere correctement

### 20.4 Bons cadeaux migres

- [ ] Verifier qu'un billet detecte comme bon cadeau a estBonCadeau=true
- [ ] Verifier que le destinataire est different du payeur

---

## 21. Responsive mobile

- [ ] Navigation : hamburger menu visible sur mobile, sidebar en drawer
- [ ] Dashboard : cartes empilees sur mobile
- [ ] Planning vols : liste de cartes au lieu de grille semaine
- [ ] Detail vol : infos empilees, tableau passagers scrollable horizontalement
- [ ] Post-vol wizard : inputs larges, boutons pleine largeur
- [ ] Admin : drawer menu avec fermeture auto au clic lien

---

## 22. i18n (FR/EN)

- [ ] Switcher de langue dans le footer de la sidebar
- [ ] Verifier que la page d'accueil est traduite
- [ ] Verifier que les toasts de succes sont traduits
- [ ] Verifier qu'au moins une page complete (billets ou vols) est coherente en EN

---

## 23. Alertes reglementaires

- [ ] Si un ballon a un CAMO expirant dans < 60j → alerte WARNING dans le banner
- [ ] Si un ballon a un CAMO expirant dans < 30j → alerte CRITICAL
- [ ] Si un ballon a un CAMO expire → alerte EXPIRED
- [ ] Meme logique pour les pilotes (BFCL : 90j/30j/expire)
- [ ] Les alertes s'ouvrent en Sheet (panneau lateral) avec le detail
- [ ] Sur le dashboard jour J, seules les alertes des entites du jour sont affichees

---

## Bugs / Remarques

| #   | Page / Feature | Description | Severite |
| --- | -------------- | ----------- | -------- |
|     |                |             |          |
|     |                |             |          |
|     |                |             |          |
