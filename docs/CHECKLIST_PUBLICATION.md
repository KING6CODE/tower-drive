# Tower Drive — Checklist avant publication (production Google Play)

Légende : ✅ fait et vérifié · ⚠️ fait mais à contrôler · ☐ à faire par toi · 🔒 bloquant

État du code : v1.7 (versionCode 11), package `com.king6code.towerdrive`, compte Play Console « pccode ».

## 1. Bloquants Google Play

- 🔒 ☐ **Test fermé terminé** : 12 testeurs inscrits pendant 14 jours sans interruption (le tableau de bord indiquait 3 jours le 8 octobre, donc production possible vers le 19-20 octobre au plus tôt). Ensuite : « Demander l'accès à la production » et répondre au questionnaire.
- 🔒 ☐ **Envoyer la v1.7 en test** (interne, puis fermé) : c'est la première version avec Billing 8, consentement UMP, labo, vagues minutées.
- 🔒 ☐ **Consentement AdMob (RGPD)** : le code appelle Google UMP, mais le message doit exister dans AdMob → *Confidentialité et messagerie* → créer le message « Consentement RGPD » (EEE + Royaume-Uni), l'associer à l'application. Sans message, aucun formulaire ne s'affiche.
- 🔒 ☐ **Déclaration « Sécurité des données »** (Play Console → Contenu de l'appli) :
  - Données collectées : *Identifiants d'appareil ou autres* (ID publicitaire), partagés avec Google AdMob, finalité Publicité ; *Historique d'achat* via Google Play (géré par Google).
  - Aucune donnée envoyée à un serveur de l'éditeur. Données chiffrées en transit : oui (AdMob). Demande de suppression : sans objet (données locales).
- 🔒 ☐ **Déclaration « ID publicitaire »** (Contenu de l'appli) : oui, l'appli utilise l'ID publicitaire (permission `AD_ID` présente), finalité Publicité.
- 🔒 ☐ **Politique de confidentialité en ligne** : https://king6code.github.io/tower-drive/privacy-policy.html — vérifier dans un navigateur que la page affiche bien la version du **9 octobre 2026** (achats Google Play Billing, consentement, notifications). Elle est déjà dans le dépôt ; GitHub Pages doit la republier.
- 🔒 ☐ **Questionnaire de classification (IARC)** : jeu de stratégie, violence fantastique non réaliste, achats intégrés, publicités. Public cible : **13 ans et plus** (ne pas cocher « enfants », sinon règles Families et AdMob différentes).
- 🔒 ☐ **Déclaration publicitaire** : « L'appli contient des annonces » = oui.
- 🔒 ⚠️ **Probabilités des tirages** (règle Google Play pour les objets virtuels aléatoires payants) : affichées sur l'écran Cartes (Commun 80 %, Rare 17 %, Épique 3 %, épique garanti au 150e). Les modules système (tirage de 150 gemmes) sont uniformes entre 3 modules, indiqué en toutes lettres.

## 2. Fiche Play Store

- ☐ Titre (30 car.) : « Tower Drive - Idle Defense » · description courte (80 car.) · description longue (FR + EN conseillé).
- ☐ Icône 512×512, **image de présentation 1024×500**, **au moins 4 captures** téléphone 9:16 (accueil, partie, atelier, cartes, labo, boutique).
- ☐ Catégorie Jeux → Stratégie (ou Casual), e-mail de contact public, URL de la politique de confidentialité.
- ☐ Descriptions des produits intégrés à mettre à jour (Play Console → Produits ponctuels) : `starter_pack` = « ×2 pièces, 150 gemmes, Intro Sprint niveau 2 » ; `epic_pack` = « ×3 pièces, 750 gemmes, Intro Sprint niveau 4 ». Le jeu affiche déjà ce contenu.
- ☐ Prix : vérifier les prix par pays (TVA ajoutée dans certains pays : 0,99 € devient 1,19 € en Allemagne).

## 3. AdMob

- ⚠️ ID application `ca-app-pub-8086962907043995~7504804045` et bloc rewarded `…/3230517110` : ressemblent à des identifiants de production. Vérifier dans AdMob qu'ils sont liés à `com.king6code.towerdrive` (le commentaire « ID de test » du manifeste a été retiré).
- ☐ Tester avec un appareil de test AdMob (jamais cliquer sur ses propres pubs en production).
- ☐ Si le site de l'éditeur est renseigné dans la fiche : publier un `app-ads.txt`.

## 4. Technique (déjà traité)

- ✅ Play Billing 8.0.0, 11 produits actifs, achats consommés/acquittés, restauration, anti-doublon des commandes.
- ✅ Alarme de notification du labo : plus d'alarme exacte (permission retirée, pas de déclaration spéciale, plus de plantage Android 14).
- ✅ Outils développeur (ressources infinies, « tout débloquer ») **désactivés dans l'application publiée**.
- ✅ Vagues minutées, plafond de 150 ennemis, qualité graphique adaptative, anti-blocage des vagues.
- ☐ **16 Ko de page mémoire** : vérifier dans Play Console → *App Bundle Explorer* / rapport de pré-lancement qu'aucun avertissement n'apparaît (bibliothèques natives AdMob).
- ☐ **Rapport de pré-lancement** (Play Console) : aucun plantage/ANR sur les appareils d'essai.
- ☐ Signature : bundle signé avec la clé d'importation `TowerDrive-upload.jks` (sauvegarder ce fichier et `keystore.properties` hors du dépôt, avec les mots de passe).

## 5. À tester sur un vrai téléphone (30 min)

- ☐ Compte **testeur de licence** (Play Console → Paramètres → Tests de licence) : acheter un pack de gemmes, le pack débutant, « Liaison directe », le passe de saison ; vérifier crédit, bouton « Restaurer mes achats », relance de l'appli.
- ☐ Premier lancement sur appareil neuf : tutoriel, flèches de guidage, halo sur « Dégâts », popup du pack débutant après la 2e partie, formulaire de consentement.
- ☐ Pub récompensée : revive, doublement des pièces, −1 h de recherche, gemmes quotidiennes ; sans réseau.
- ☐ Notification de fin de recherche du labo (Android 13+ : accepter la permission).
- ☐ Fluidité sur un téléphone d'entrée de gamme à un cycle élevé (150 ennemis) ; la qualité doit baisser automatiquement.
- ☐ Bouton retour, mise en veille/reprise d'une partie, rotation (portrait verrouillé).

## 6. Économie et équilibrage (état au 9 octobre)

- ✅ Rythme des débuts bon : cycle 20 au jour 1, cycle 80 vers le jour 6 (joueur régulier simulé), protocole 2 dès le cycle 80.
- ✅ Gemmes gratuites réduites (Gardiens 1 gemme, Bob 10 gemmes par partie au maximum).
- ⚠️ **Mur du cycle 80** : le joueur régulier simulé y reste plusieurs jours (Gardien boss ralenti d'un tiers). Les simulations n'utilisent ni modules, ni labos de dégâts, ni évolution complète des cartes : un vrai joueur progresse probablement plus vite. À surveiller sur les premiers vrais joueurs.
- ☐ Suivre après lancement : rétention J1/J7 (vitesse atteinte, jour du palier 2), taux de conversion du pack débutant, nombre de revives par pub.

## 7. Après publication

- ☐ Répondre aux avis, surveiller Android vitals (plantages, ANR).
- ☐ Ajouter une sauvegarde dans le cloud (la progression est locale : une réinstallation l'efface).
- ☐ Ajouter un rapport de plantages (Firebase Crashlytics) pour la v1.8.
- ☐ Reprendre les vidéos publicitaires et campagnes d'acquisition (voir mémoire projet Block Thud pour le format).
