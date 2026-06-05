# User Stories MVP — Camerounada
> Format : En tant que [rôle], je veux [action], afin de [bénéfice]
> Critères d'acceptance au format Given / When / Then

---

## PHASE 1 — Fondations : Dossiers & Documents (Mois 1–2)

---

### MODULE : Authentification

---

#### US-001 — Création de compte client
**En tant que** prospect ou nouveau client,
**je veux** créer un compte avec mon email et un mot de passe,
**afin de** accéder à la plateforme Camerounada.

**Critères d'acceptance**

- **Given** je suis sur la page d'inscription
  **When** je renseigne un email valide, un mot de passe (8 caractères min, 1 majuscule, 1 chiffre) et je confirme le mot de passe
  **Then** mon compte est créé et je reçois un email de vérification

- **Given** j'ai reçu l'email de vérification
  **When** je clique sur le lien dans les 24h
  **Then** mon compte est activé et je suis redirigé vers l'onboarding

- **Given** je renseigne un email déjà utilisé
  **When** je valide le formulaire
  **Then** un message d'erreur s'affiche : "Un compte existe déjà avec cet email"

- **Given** mon mot de passe ne respecte pas les règles
  **When** je quitte le champ
  **Then** un message d'aide s'affiche en temps réel sous le champ

---

#### US-002 — Connexion
**En tant que** utilisateur enregistré,
**je veux** me connecter avec mon email et mot de passe,
**afin de** accéder à mon espace personnel.

**Critères d'acceptance**

- **Given** je suis sur la page de connexion
  **When** je saisis mes identifiants corrects
  **Then** je suis connecté et redirigé vers mon dashboard

- **Given** je saisis un mot de passe incorrect
  **When** je valide 3 fois de suite
  **Then** mon compte est temporairement bloqué (15 min) et je reçois un email d'alerte

- **Given** je coche "Rester connecté"
  **When** je ferme et rouvre l'application
  **Then** ma session est maintenue pendant 30 jours

---

#### US-003 — Réinitialisation du mot de passe
**En tant que** utilisateur ayant oublié son mot de passe,
**je veux** recevoir un lien de réinitialisation par email,
**afin de** retrouver l'accès à mon compte.

**Critères d'acceptance**

- **Given** je clique sur "Mot de passe oublié"
  **When** je saisis mon email enregistré
  **Then** je reçois un email avec un lien valide 1 heure

- **Given** le lien a expiré
  **When** je clique dessus
  **Then** un message m'indique que le lien a expiré et me propose d'en générer un nouveau

---

#### US-004 — Gestion des rôles (Admin)
**En tant que** administrateur,
**je veux** attribuer des rôles aux membres du staff (conseiller, analyste, support, comptabilité),
**afin de** contrôler les accès selon les responsabilités de chacun.

**Critères d'acceptance**

- **Given** je suis sur la fiche d'un membre du staff
  **When** je lui attribue le rôle "Analyste dossier"
  **Then** il accède uniquement aux modules de gestion documentaire et dossiers, pas aux finances ni aux paramètres système

- **Given** je modifie le rôle d'un utilisateur connecté
  **When** la modification est enregistrée
  **Then** ses permissions sont mises à jour à sa prochaine action sans déconnexion forcée

---

### MODULE : Dashboard client

---

#### US-005 — Vue du statut de dossier
**En tant que** client actif,
**je veux** voir en un coup d'œil le statut de mon dossier et les prochaines étapes,
**afin de** savoir exactement où j'en suis sans avoir à contacter mon conseiller.

**Critères d'acceptance**

- **Given** je suis connecté sur mon dashboard
  **When** la page se charge
  **Then** je vois une barre de progression avec les étapes de mon dossier (ex : Collecte docs > Validation > Soumission > Décision), l'étape actuelle surlignée et la date estimée

- **Given** mon dossier change de statut (ex : un document validé)
  **When** je consulte mon dashboard
  **Then** le changement est visible immédiatement avec la date et l'heure de mise à jour

- **Given** une action est requise de ma part (ex : document manquant)
  **When** j'ouvre le dashboard
  **Then** un bandeau d'alerte rouge/orange est visible en haut avec un lien direct vers l'action à faire

---

#### US-006 — Résumé des actions en attente
**En tant que** client actif,
**je veux** voir la liste des actions que je dois accomplir,
**afin de** ne rien oublier et éviter les retards sur mon dossier.

**Critères d'acceptance**

- **Given** des documents sont requis de ma part
  **When** j'ouvre le dashboard
  **Then** chaque document manquant apparaît comme une tâche avec : nom du document, date limite, et bouton "Uploader"

- **Given** j'ai complété toutes les actions
  **When** j'ouvre le dashboard
  **Then** un message de confirmation s'affiche : "Tout est à jour — votre conseiller prend le relais"

---

### MODULE : Gestion de dossiers

---

#### US-007 — Création de dossier client (Staff)
**En tant que** conseiller immigration,
**je veux** créer un nouveau dossier client après signature du contrat,
**afin de** initialiser le suivi structuré du parcours d'immigration.

**Critères d'acceptance**

- **Given** je suis sur le CRM interne
  **When** je crée un dossier pour un client existant en sélectionnant le type de service (études / travail / RP / visiteur)
  **Then** le dossier est créé avec les étapes pré-remplies correspondant au type de service choisi

- **Given** le dossier est créé
  **When** je l'assigne à un analyste
  **Then** l'analyste reçoit une notification et le dossier apparaît dans sa file de travail

- **Given** je crée un dossier
  **When** la création est confirmée
  **Then** le client reçoit une notification : "Votre dossier a été ouvert — découvrez les premières étapes"

---

#### US-008 — Mise à jour du statut de dossier (Staff)
**En tant que** analyste ou conseiller,
**je veux** mettre à jour le statut d'un dossier étape par étape,
**afin de** garder le client informé en temps réel et tracer chaque avancement.

**Critères d'acceptance**

- **Given** je suis sur la page d'un dossier
  **When** je passe le statut à l'étape suivante (ex : "Soumission effectuée")
  **Then** le changement est enregistré avec un horodatage, le client est notifié automatiquement, et l'historique est mis à jour

- **Given** je veux ajouter un commentaire interne
  **When** je saisis une note marquée "interne"
  **Then** la note est visible par le staff uniquement, jamais par le client

- **Given** un dossier est bloqué (ex : attente biométrie)
  **When** je passe le statut à "En attente"
  **Then** une raison est obligatoire et le client voit le message correspondant sans détail technique

---

#### US-009 — Consultation du dossier (Client)
**En tant que** client actif,
**je veux** consulter l'historique complet de mon dossier,
**afin de** comprendre ce qui a été fait et ce qui reste à faire.

**Critères d'acceptance**

- **Given** j'accède à l'onglet "Mon dossier"
  **When** la page se charge
  **Then** je vois la chronologie de toutes les actions passées avec date, description et par qui (ex : "Document passeport validé par l'équipe Camerounada — 12 mai")

- **Given** mon dossier comporte plusieurs services
  **When** je navigue dans mon dossier
  **Then** chaque service (ex : CAQ + Visa) est présenté dans un onglet distinct avec sa propre progression

---

### MODULE : Gestion documentaire

---

#### US-010 — Upload de documents (Client)
**En tant que** client actif,
**je veux** uploader mes documents directement depuis mon téléphone,
**afin de** soumettre les pièces requises rapidement, même avec une connexion limitée.

**Critères d'acceptance**

- **Given** un document est requis dans mon dossier
  **When** je clique sur "Ajouter un document"
  **Then** je peux choisir un fichier depuis ma galerie, prendre une photo ou scanner directement depuis l'app

- **Given** ma connexion est faible et l'upload s'interrompt
  **When** je reviens sur l'app
  **Then** l'upload reprend automatiquement depuis le dernier point d'arrêt (reprise progressive)

- **Given** je téléverse un fichier
  **When** l'upload est terminé
  **Then** le statut du document passe à "En attente de validation" et je reçois une confirmation

- **Given** je tente d'uploader un fichier supérieur à 20 Mo
  **When** je sélectionne le fichier
  **Then** un message m'indique la limite et me propose de compresser ou de contacter le support

---

#### US-011 — Validation documentaire (Staff)
**En tant que** analyste dossier,
**je veux** valider ou rejeter les documents uploadés par les clients,
**afin de** m'assurer que chaque pièce est conforme avant soumission.

**Critères d'acceptance**

- **Given** un document vient d'être uploadé
  **When** j'ouvre la file de validation
  **Then** le document apparaît avec un aperçu, le nom du client, le type de document attendu et la date d'upload

- **Given** je valide un document
  **When** je clique sur "Valider"
  **Then** le statut passe à "Validé", le client est notifié, et le document est archivé dans le dossier

- **Given** je rejette un document
  **When** je clique sur "Rejeter" en ajoutant un motif obligatoire
  **Then** le client reçoit une notification avec le motif et le document revient en statut "À corriger"

---

#### US-012 — Vue documentaire globale (Client)
**En tant que** client actif,
**je veux** voir la liste de tous mes documents avec leur statut,
**afin de** savoir ce qui est validé, ce qui est rejeté et ce qui manque.

**Critères d'acceptance**

- **Given** j'accède à l'onglet "Documents"
  **When** la page se charge
  **Then** je vois chaque document avec son statut coloré : Validé (vert), En attente (orange), À corriger (rouge), Non fourni (gris)

- **Given** un document est rejeté
  **When** je clique dessus
  **Then** je vois le motif de rejet et un bouton "Renvoyer" pré-rempli avec le nom du document

---

### MODULE : Notifications

---

#### US-013 — Notifications push & email
**En tant que** client actif,
**je veux** recevoir des notifications à chaque changement sur mon dossier,
**afin de** rester informé sans avoir à consulter l'application en permanence.

**Critères d'acceptance**

- **Given** mon dossier change de statut
  **When** la mise à jour est enregistrée
  **Then** je reçois une notification push (si activée) ET un email dans les 2 minutes

- **Given** un document est validé ou rejeté
  **When** l'analyste confirme l'action
  **Then** je reçois une notification spécifique avec le nom du document et l'action à faire si rejet

- **Given** je veux gérer mes préférences
  **When** j'accède aux paramètres de notification
  **Then** je peux activer/désactiver chaque type de notification (dossier, documents, paiements, rendez-vous) indépendamment

---

---

## PHASE 2 — Opérations internes & Paiements (Mois 3–4)

---

### MODULE : CRM interne

---

#### US-014 — Pipeline conseiller
**En tant que** conseiller immigration,
**je veux** visualiser l'ensemble de mes clients actifs et leur avancement,
**afin de** prioriser mes actions et ne laisser aucun dossier sans suivi.

**Critères d'acceptance**

- **Given** j'accède à mon espace CRM
  **When** la page se charge
  **Then** je vois mes dossiers groupés par statut (À démarrer / En cours / En attente / Finalisés) avec le nom du client, le type de service et le délai estimé

- **Given** un dossier est bloqué depuis plus de 7 jours
  **When** j'affiche ma liste
  **Then** le dossier est mis en évidence avec une alerte visuelle

- **Given** je filtre par type de service (ex : permis d'études)
  **When** j'applique le filtre
  **Then** seuls les dossiers correspondants s'affichent

---

#### US-015 — Gestion des tâches internes
**En tant que** membre du staff,
**je veux** créer et assigner des tâches liées à un dossier,
**afin de** coordonner le travail entre conseillers, analystes et support sans passer par email ou WhatsApp.

**Critères d'acceptance**

- **Given** je suis sur un dossier
  **When** je crée une tâche avec un titre, une date limite et un assigné
  **Then** la tâche apparaît dans la liste du dossier ET dans le tableau de bord de l'assigné

- **Given** la date limite d'une tâche approche (J-1)
  **When** l'assigné se connecte
  **Then** une notification interne lui rappelle la tâche en attente

- **Given** une tâche est complétée
  **When** je la marque comme terminée
  **Then** elle passe en "Archivé" avec l'horodatage et le nom de l'exécutant

---

### MODULE : Paiements

---

#### US-016 — Génération de facture (Comptabilité)
**En tant que** membre de l'équipe comptabilité,
**je veux** générer une facture pour un client depuis son dossier,
**afin de** formaliser le paiement dû et l'envoyer directement depuis la plateforme.

**Critères d'acceptance**

- **Given** je suis sur un dossier client
  **When** je crée une facture en sélectionnant le service, le montant et l'échéance
  **Then** la facture est générée en PDF, liée au dossier et envoyée automatiquement au client par email et notification

- **Given** je génère une facture avec paiement en plusieurs fois
  **When** je définis l'échéancier
  **Then** chaque tranche apparaît comme une ligne distincte avec sa date d'échéance

---

#### US-017 — Paiement en ligne (Client)
**En tant que** client actif,
**je veux** payer ma facture directement depuis l'application,
**afin de** régler mes frais facilement, depuis le Cameroun ou l'étranger.

**Critères d'acceptance**

- **Given** une facture est disponible dans mon espace
  **When** je clique sur "Payer"
  **Then** je suis redirigé vers une page de paiement sécurisée avec les options disponibles (carte bancaire, Mobile Money)

- **Given** mon paiement est accepté
  **When** la transaction est confirmée
  **Then** je reçois un reçu PDF par email, le statut de la facture passe à "Payée" et mon dossier est mis à jour

- **Given** mon paiement échoue
  **When** la transaction est refusée
  **Then** un message clair s'affiche avec la raison et un bouton "Réessayer"

---

#### US-018 — Suivi des paiements (Comptabilité)
**En tant que** membre de l'équipe comptabilité,
**je veux** voir l'état de toutes les factures (payées, en attente, en retard),
**afin de** gérer les relances et avoir une vue financière claire.

**Critères d'acceptance**

- **Given** j'accède au module paiements
  **When** la page se charge
  **Then** je vois un tableau avec toutes les factures triées par statut, montant, client et date d'échéance

- **Given** une facture est en retard de plus de 3 jours
  **When** j'affiche la liste
  **Then** elle est marquée "En retard" et un bouton "Relancer" envoie un email de rappel automatique au client

---

### MODULE : Messagerie

---

#### US-019 — Messagerie client ↔ conseiller
**En tant que** client actif,
**je veux** envoyer et recevoir des messages directement avec mon conseiller dans l'application,
**afin de** centraliser toutes mes communications sans utiliser WhatsApp.

**Critères d'acceptance**

- **Given** j'accède à l'onglet "Messages"
  **When** la page se charge
  **Then** je vois mon historique de conversation avec l'équipe Camerounada, avec les messages horodatés

- **Given** j'envoie un message
  **When** la connexion est lente
  **Then** le message est mis en file d'attente et envoyé dès que la connexion est rétablie, avec un indicateur visuel "En attente d'envoi"

- **Given** mon conseiller répond
  **When** je ne suis pas dans l'application
  **Then** je reçois une notification push et un email

- **Given** je joins un fichier dans un message
  **When** le fichier est envoyé
  **Then** il est accessible depuis le fil de conversation ET automatiquement proposé comme document à ajouter au dossier

---

#### US-020 — Messagerie interne (Staff)
**En tant que** membre du staff,
**je veux** échanger des messages internes liés à un dossier,
**afin de** coordonner avec mes collègues sans sortir de la plateforme.

**Critères d'acceptance**

- **Given** je suis sur un dossier
  **When** j'ouvre l'onglet "Notes & discussions internes"
  **Then** je vois les échanges entre membres du staff sur ce dossier, invisibles du client

- **Given** je mentionne un collègue avec @prenom
  **When** je valide le message
  **Then** il reçoit une notification interne avec le contexte du dossier

---

### MODULE : Rendez-vous

---

#### US-021 — Réservation de rendez-vous (Client)
**En tant que** client actif,
**je veux** réserver un rendez-vous avec mon conseiller depuis l'application,
**afin de** planifier nos échanges sans aller-retour par WhatsApp.

**Critères d'acceptance**

- **Given** j'accède à "Mes rendez-vous"
  **When** je clique sur "Prendre un rendez-vous"
  **Then** je vois les créneaux disponibles de mon conseiller sur les 7 prochains jours

- **Given** je sélectionne un créneau
  **When** je confirme
  **Then** je reçois une confirmation par email avec un lien visio (Google Meet ou Zoom) et le rendez-vous apparaît dans mon dashboard

- **Given** je dois annuler un rendez-vous
  **When** je l'annule plus de 2h avant
  **Then** le créneau se libère automatiquement et mon conseiller est notifié

---

### MODULE : Support / Tickets

---

#### US-022 — Création de ticket support (Client)
**En tant que** client actif,
**je veux** créer un ticket de support pour signaler un problème ou poser une question,
**afin de** obtenir une réponse structurée sans perdre le fil dans des échanges informels.

**Critères d'acceptance**

- **Given** j'accède à "Support"
  **When** je crée un ticket avec un titre, une description et une catégorie (Document / Paiement / Dossier / Autre)
  **Then** le ticket est créé avec un numéro de référence et je reçois une confirmation

- **Given** mon ticket est pris en charge
  **When** un agent du support l'ouvre
  **Then** je reçois une notification "Votre demande est en cours de traitement"

- **Given** mon ticket est résolu
  **When** l'agent le clôture
  **Then** je reçois une notification avec la résolution et un lien pour rouvrir si nécessaire

---

#### US-023 — Gestion des tickets (Support interne)
**En tant que** agent support,
**je veux** voir et gérer tous les tickets ouverts par les clients,
**afin de** traiter les demandes par priorité et dans les délais.

**Critères d'acceptance**

- **Given** j'accède au module support
  **When** la page se charge
  **Then** je vois les tickets triés par statut (Nouveau / En cours / Résolu) et par date de création

- **Given** un ticket est ouvert depuis plus de 24h sans réponse
  **When** j'affiche la liste
  **Then** il est marqué "Urgent" avec une alerte visuelle

---

---

## PHASE 3 — Acquisition & Conversion prospects (Mois 5–6)

---

### MODULE : Onboarding prospect

---

#### US-024 — Questionnaire de qualification
**En tant que** prospect,
**je veux** répondre à un questionnaire rapide sur mon profil,
**afin de** savoir si je suis éligible à un programme d'immigration et quel service correspond à ma situation.

**Critères d'acceptance**

- **Given** je viens de créer mon compte
  **When** l'onboarding démarre
  **Then** je suis guidé à travers un questionnaire en 5 étapes max : identité, niveau d'études, expérience, langue, objectif

- **Given** je réponds aux questions
  **When** je passe d'une étape à l'autre
  **Then** une barre de progression me montre où j'en suis et je peux revenir à l'étape précédente

- **Given** je quitte l'application en cours de questionnaire
  **When** je reviens
  **Then** je reprends là où je me suis arrêté, mes réponses sont sauvegardées

---

#### US-025 — Scoring automatique et recommandation
**En tant que** prospect,
**je veux** recevoir une recommandation de programme automatique après le questionnaire,
**afin de** comprendre rapidement ce qui est possible pour moi.

**Critères d'acceptance**

- **Given** j'ai complété le questionnaire
  **When** je valide la dernière étape
  **Then** je vois une page de résultats avec : mon score d'éligibilité, le ou les programmes recommandés, et une explication courte de chaque recommandation

- **Given** mon profil est éligible
  **When** je consulte mes résultats
  **Then** un bouton "Réserver une consultation gratuite" est mis en avant

- **Given** mon profil n'est pas directement éligible
  **When** je consulte mes résultats
  **Then** je vois les étapes pour améliorer mon éligibilité (ex : "Améliorer votre score IELTS") et je suis invité à consulter le contenu éducatif

---

#### US-026 — Réservation de consultation (Prospect)
**En tant que** prospect qualifié,
**je veux** réserver une consultation avec un conseiller Camerounada,
**afin de** discuter de mon dossier et commencer le processus.

**Critères d'acceptance**

- **Given** je suis sur la page de résultats du questionnaire
  **When** je clique sur "Réserver une consultation"
  **Then** je vois les créneaux disponibles (en ligne) sur les 5 prochains jours ouvrables

- **Given** je choisis un créneau
  **When** je confirme
  **Then** je reçois un email de confirmation avec le lien visio, le nom du conseiller assigné et un rappel J-1

- **Given** j'ai réservé une consultation
  **When** le conseiller consulte son CRM
  **Then** il voit mon profil, mon score et mes réponses au questionnaire avant notre échange

---

### MODULE : Scoring & leads (Staff)

---

#### US-027 — Vue des leads qualifiés (Conseiller)
**En tant que** conseiller immigration,
**je veux** voir la liste des prospects qualifiés et leurs scores,
**afin de** prioriser mes consultations et maximiser le taux de conversion.

**Critères d'acceptance**

- **Given** j'accède à l'espace "Prospects"
  **When** la page se charge
  **Then** je vois les prospects triés par score décroissant, avec le nom, le programme recommandé, la date d'inscription et le statut (Non contacté / Consultation planifiée / Converti)

- **Given** un prospect a un score élevé mais n'a pas encore réservé
  **When** cela fait plus de 48h
  **Then** le prospect est marqué "À relancer" et je peux envoyer un message depuis la fiche

- **Given** je convertis un prospect en client
  **When** je clique sur "Convertir en client"
  **Then** un dossier est automatiquement pré-créé avec les informations du questionnaire importées

---

### MODULE : Contenu éducatif

---

#### US-028 — Accès au contenu éducatif (Prospect & Client)
**En tant que** prospect ou client,
**je veux** accéder à des guides et articles sur les programmes d'immigration,
**afin de** mieux comprendre les démarches et les préparer en autonomie.

**Critères d'acceptance**

- **Given** j'accède à la section "Ressources"
  **When** la page se charge
  **Then** je vois des contenus organisés par thème (Permis d'études / Travail / RP / IELTS) avec une estimation du temps de lecture

- **Given** je suis un prospect
  **When** j'accède à un article
  **Then** je peux le lire sans restriction ; en bas de l'article, un CTA m'invite à réserver une consultation

- **Given** je suis un client
  **When** j'accède aux ressources
  **Then** les contenus liés à mon type de dossier sont mis en avant en premier

---

---

## Récapitulatif — Comptage des user stories

| Phase | Module | Nb US |
|---|---|---|
| Phase 1 | Authentification | 4 |
| Phase 1 | Dashboard client | 2 |
| Phase 1 | Gestion de dossiers | 3 |
| Phase 1 | Gestion documentaire | 3 |
| Phase 1 | Notifications | 1 |
| Phase 2 | CRM interne | 2 |
| Phase 2 | Paiements | 3 |
| Phase 2 | Messagerie | 2 |
| Phase 2 | Rendez-vous | 1 |
| Phase 2 | Support / Tickets | 2 |
| Phase 3 | Onboarding prospect | 2 |
| Phase 3 | Scoring & recommandation | 2 |
| Phase 3 | Réservation consultation | 1 |
| Phase 3 | Leads (Staff) | 1 |
| Phase 3 | Contenu éducatif | 1 |
| **Total** | | **28 user stories** |

---

*Document produit dans le cadre du projet Camerounada — MVP 6 mois*
*À compléter avec les estimations de complexité (story points) et la priorisation par sprint*
