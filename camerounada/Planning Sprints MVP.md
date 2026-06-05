# Planning Sprints MVP — Camerounada
> 1 développeur full-stack — Web responsive (React + Node.js)
> 12 sprints de 2 semaines — 6 mois
> 1 sprint = ~10 jours ouvrés = ~7,5 jours de code effectif (75%)

---

## Calendrier général

| Sprint | Période | Phase | Objectif principal |
|---|---|---|---|
| S1 | Semaines 1–2 | Phase 1 | Infra + Auth + RBAC |
| S2 | Semaines 3–4 | Phase 1 | Dossiers + Dashboard client |
| S3 | Semaines 5–6 | Phase 1 | Documents + Upload |
| S4 | Semaines 7–8 | Phase 1 | Validation docs + Notifications |
| S5 | Semaines 9–10 | Phase 2 | CRM interne + Tâches |
| S6 | Semaines 11–12 | Phase 2 | Paiements (factures + suivi) |
| S7 | Semaines 13–14 | Phase 2 | Paiement en ligne (intégration) |
| S8 | Semaines 15–16 | Phase 2 | Messagerie client ↔ staff |
| S9 | Semaines 17–18 | Phase 2 | Rendez-vous + Tickets support |
| S10 | Semaines 19–20 | Phase 3 | Questionnaire prospect + Scoring |
| S11 | Semaines 21–22 | Phase 3 | Consultation + Leads staff |
| S12 | Semaines 23–24 | Phase 3 | Contenu éducatif + Finitions + Recette |

---

---

## SPRINT 1 — Semaines 1–2
### Infra, authentification & RBAC
**Objectif** : Avoir une application qui tourne, avec un système d'auth solide et les rôles en place. Rien d'autre ne peut démarrer sans ça.

| Tâche | US | Jours |
|---|---|---|
| Setup projet (Next.js, base de données, hébergement, CI/CD basique) | — | 1,5 j |
| Création de compte + vérification email | US-001 | 2 j |
| Connexion + gestion de session + blocage tentatives | US-002 | 1 j |
| Réinitialisation mot de passe | US-003 | 0,5 j |
| Modèle RBAC — rôles, permissions, middleware de protection des routes | US-004 | 2,5 j |

**Total : 7,5 jours**

**Livrable démontrable** : Un utilisateur peut créer son compte, se connecter, et selon son rôle (client / conseiller / admin) il voit un espace différent.

**Critère de succès** :
- Les 5 rôles (client, conseiller, analyste, support, admin) ont des accès distincts vérifiables
- Un utilisateur non authentifié est redirigé vers la page de connexion sur toute route protégée
- L'email de vérification arrive en moins de 2 minutes

**Risque sprint** : La configuration de l'hébergement peut prendre plus de temps que prévu. Avoir l'environnement de staging prêt avant le démarrage du code.

---

## SPRINT 2 — Semaines 3–4
### Dossiers & Dashboard client
**Objectif** : Un client peut voir son dossier. Un conseiller peut créer et mettre à jour un dossier.

| Tâche | US | Jours |
|---|---|---|
| Modèle de données dossier (types de services, étapes par type) | US-007 | 1 j |
| Création dossier côté staff + assignation analyste | US-007 | 1,5 j |
| Mise à jour statut + historique horodaté + notes internes | US-008 | 2 j |
| Dashboard client — barre de progression + actions en attente | US-005 | 2 j |
| Vue chronologique dossier côté client | US-009 | 1 j |

**Total : 7,5 jours**

**Livrable démontrable** : Un conseiller crée un dossier "Permis d'études" pour un client. Le client se connecte et voit les étapes de son parcours avec le statut actuel.

**Critère de succès** :
- Les 5 types de service ont leurs étapes pré-configurées
- Le client voit uniquement les informations qui lui sont destinées (pas les notes internes)
- Chaque changement de statut est horodaté et signé par le membre du staff

**Risque sprint** : La modélisation des étapes par type de service est complexe. Partir sur un modèle flexible (JSON ou table d'étapes) plutôt qu'un schéma rigide.

---

## SPRINT 3 — Semaines 5–6
### Gestion documentaire — Upload & vue client
**Objectif** : Un client peut uploader ses documents depuis mobile, même avec une connexion faible.

| Tâche | US | Jours |
|---|---|---|
| Intégration stockage fichiers (Cloudinary ou S3) | — | 1 j |
| Upload document — sélection fichier, photo, scan | US-010 | 1,5 j |
| Reprise d'upload interrompu (chunked upload) | US-010 | 1 j |
| Gestion taille fichier + compression côté client | US-010 | 0,5 j |
| Vue documentaire client — liste + statuts colorés | US-012 | 1 j |
| Résumé actions en attente (documents manquants) | US-006 | 1 j |
| Lien documents ↔ dossier (document requis par étape) | US-007 | 0,5 j |

**Total : 6,5 jours — 1 jour de marge pour tests mobile**

**Livrable démontrable** : Un client uploade son passeport depuis son téléphone. Si la connexion coupe, l'upload reprend automatiquement. Il voit son document en statut "En attente de validation".

**Critère de succès** :
- Upload fonctionnel sur Android entrée de gamme avec connexion 3G faible
- Reprise d'upload testée sur coupure réseau simulée
- Fichiers > 20 Mo bloqués avec message explicite

**Risque sprint** : La reprise d'upload (chunked) est techniquement délicate. Utiliser une librairie éprouvée (tus.io ou Uppy) plutôt que de coder from scratch.

---

## SPRINT 4 — Semaines 7–8
### Validation documentaire + Notifications
**Objectif** : Un analyste peut valider ou rejeter des documents. Les clients reçoivent des notifications automatiques.

| Tâche | US | Jours |
|---|---|---|
| File de validation — aperçu document, actions valider/rejeter | US-011 | 2 j |
| Motif de rejet obligatoire + statut "À corriger" | US-011 | 0,5 j |
| Re-soumission document rejeté côté client | US-012 | 0,5 j |
| Intégration service email (SendGrid / Resend) | US-013 | 1 j |
| Notifications email sur changement statut dossier et document | US-013 | 1 j |
| Préférences notifications côté client | US-013 | 0,5 j |
| Buffer tests Phase 1 + corrections bugs remontés | — | 2 j |

**Total : 7,5 jours**

**Livrable démontrable** : Démo complète Phase 1 — parcours end-to-end d'un client qui uploade un document, un analyste qui le valide, et le client qui reçoit l'email de confirmation.

**Critère de succès** :
- Email reçu en moins de 2 minutes après validation
- Le client reçoit le motif de rejet clair et peut re-soumettre en 2 clics
- Aucun bug bloquant sur le parcours principal

**Point de validation Phase 1** : Faire tester par 2 à 3 vrais clients actuels avant de démarrer la Phase 2. Leurs retours orienteront les ajustements mineurs.

---

## SPRINT 5 — Semaines 9–10
### CRM interne + Tâches
**Objectif** : Les conseillers et analystes ont un espace de travail structuré pour piloter leurs dossiers.

| Tâche | US | Jours |
|---|---|---|
| Vue pipeline conseiller — liste dossiers avec statuts et filtres | US-014 | 2 j |
| Alertes dossiers bloqués (>7 jours sans action) | US-014 | 1 j |
| Création et assignation de tâches sur un dossier | US-015 | 1,5 j |
| Notifications internes tâches + mentions @collègue | US-015 | 1 j |
| Tableau de bord staff — vue personnelle des tâches du jour | US-015 | 1 j |
| Ajustements CRM selon retours Phase 1 | — | 1 j |

**Total : 7,5 jours**

**Livrable démontrable** : Un conseiller ouvre son CRM et voit ses 10 dossiers en cours, 2 en alerte rouge. Il crée une tâche "Relancer client pour passeport" assignée à l'analyste. L'analyste reçoit une notification.

**Critère de succès** :
- Tous les dossiers assignés à un conseiller sont visibles dans son pipeline
- Un dossier sans action depuis 7 jours est automatiquement mis en alerte
- Une tâche créée apparaît chez l'assigné dans les 30 secondes

---

## SPRINT 6 — Semaines 11–12
### Paiements — Factures & suivi comptabilité
**Objectif** : L'équipe comptabilité peut émettre des factures et suivre les paiements. Les clients voient leurs factures.

| Tâche | US | Jours |
|---|---|---|
| Modèle de données factures + échéancier | US-016 | 1 j |
| Génération PDF facture depuis le dossier | US-016 | 1,5 j |
| Envoi automatique facture au client par email | US-016 | 0,5 j |
| Tableau de bord comptabilité — statuts factures, filtres | US-018 | 2 j |
| Relance automatique email sur facture en retard | US-018 | 1 j |
| Vue factures côté client — liste + téléchargement PDF | US-017 (partiel) | 1,5 j |

**Total : 7,5 jours**

**Livrable démontrable** : La comptabilité émet une facture de 500€ pour un client. Le client la reçoit par email, la voit dans son espace. Si non payée après 3 jours, une relance automatique part.

**Critère de succès** :
- Facture PDF générée correctement avec logo, détails client, montant, échéance
- La relance automatique fonctionne sans intervention manuelle
- Le client peut télécharger sa facture depuis son espace

---

## SPRINT 7 — Semaines 13–14
### Paiement en ligne — Intégration passerelle
**Objectif** : Un client peut payer sa facture en ligne par carte ou Mobile Money.

| Tâche | US | Jours |
|---|---|---|
| Spike technique — choix et test passerelle (Paystack / CinetPay / Stripe) | US-017 | 1 j |
| Intégration paiement carte bancaire | US-017 | 2 j |
| Intégration Mobile Money (MTN / Orange) | US-017 | 2 j |
| Gestion des retours paiement (succès, échec, timeout) | US-017 | 1 j |
| Génération reçu PDF automatique après paiement | US-017 | 0,5 j |
| Tests paiement en sandbox + cas d'erreur | US-017 | 1 j |

**Total : 7,5 jours**

**Livrable démontrable** : Un client clique sur "Payer" sur sa facture, paie par Mobile Money MTN, reçoit son reçu PDF par email. Le statut facture passe à "Payée" dans le tableau de bord comptabilité.

**Critère de succès** :
- Paiement card et Mobile Money fonctionnels en environnement de test
- Reçu généré et envoyé dans les 60 secondes après confirmation
- Aucune donnée bancaire stockée côté serveur (délégué à la passerelle)

**Risque sprint** : L'intégration Mobile Money africain est souvent plus longue que prévu (documentation incomplète, temps de validation compte marchand). Démarrer les démarches administratives dès le Sprint 5.

---

## SPRINT 8 — Semaines 15–16
### Messagerie client ↔ staff
**Objectif** : Toute communication entre client et conseiller passe par l'application. WhatsApp devient optionnel.

| Tâche | US | Jours |
|---|---|---|
| Architecture messagerie (WebSocket ou polling long) | US-019 | 1 j |
| Fil de messages client ↔ conseiller (envoi, réception, horodatage) | US-019 | 2 j |
| File d'attente offline — messages envoyés sans connexion | US-019 | 1 j |
| Pièces jointes dans les messages + proposition ajout au dossier | US-019 | 1 j |
| Messagerie interne staff — fil par dossier, mentions @ | US-020 | 1 j |
| Notifications push/email sur nouveau message | US-019/020 | 0,5 j |

**Total : 6,5 jours — 1 jour de marge**

**Livrable démontrable** : Un client envoie un message "J'ai une question sur mon visa" avec une photo de son passeport. Le conseiller reçoit la notification, répond depuis son CRM. Le client reçoit la réponse en temps réel.

**Critère de succès** :
- Les messages sont reçus en temps réel (< 2 secondes) sur connexion correcte
- Les messages envoyés hors connexion sont bien transmis à la reconnexion
- Un fichier joint dans un message est proposé automatiquement comme document du dossier

---

## SPRINT 9 — Semaines 17–18
### Rendez-vous + Tickets support
**Objectif** : Finaliser les modules de coordination Phase 2. Le client peut planifier une réunion et ouvrir un ticket.

| Tâche | US | Jours |
|---|---|---|
| Gestion créneaux disponibles par conseiller | US-021 | 1 j |
| Réservation créneau côté client + confirmation automatique | US-021 | 1 j |
| Génération lien visio (Google Meet API ou lien Calendly) | US-021 | 0,5 j |
| Rappel automatique J-1 par email | US-021 | 0,5 j |
| Formulaire création ticket + numéro de référence | US-022 | 1 j |
| File de tickets staff — statuts, priorité, alertes 24h | US-023 | 2 j |
| Buffer tests Phase 2 + corrections | — | 1,5 j |

**Total : 7,5 jours**

**Livrable démontrable** : Démo complète Phase 2 — un client réserve un rendez-vous, reçoit son lien Meet, ouvre un ticket pour une question sur sa facture. Le support répond en moins de 24h.

**Point de validation Phase 2** : Faire tester l'ensemble du parcours client + staff par l'équipe interne avant de démarrer la Phase 3.

---

## SPRINT 10 — Semaines 19–20
### Questionnaire prospect + Scoring automatique
**Objectif** : Un prospect peut s'auto-qualifier et recevoir une recommandation de programme sans intervention humaine.

| Tâche | US | Jours |
|---|---|---|
| Formulaire multi-étapes questionnaire (5 étapes) | US-024 | 1,5 j |
| Sauvegarde progressive et reprise en cas de sortie | US-024 | 1 j |
| Algorithme de scoring — pondération des critères par programme | US-025 | 2 j |
| Page résultats — score, programme recommandé, explication | US-025 | 1,5 j |
| Cas profil non éligible — suggestions d'amélioration | US-025 | 0,5 j |
| CTA vers réservation consultation sur la page résultats | US-025 | 0,5 j |

**Total : 7 jours — 0,5 jour de marge**

**Livrable démontrable** : Un prospect remplit le questionnaire en 3 minutes, reçoit un score de 72/100, voit la recommandation "Permis d'études — CAQ + Visa" avec un bouton "Réserver une consultation gratuite".

**Critère de succès** :
- Le questionnaire est complétable en moins de 5 minutes sur mobile
- Le scoring couvre tous les programmes (études, travail, RP, visiteur)
- La page résultats est compréhensible par quelqu'un sans connaissance en immigration

**Attention** : L'algorithme de scoring doit être validé par un conseiller Camerounada avant mise en production. Prévoir une session de revue avec l'équipe métier.

---

## SPRINT 11 — Semaines 21–22
### Réservation consultation + Vue leads staff
**Objectif** : Le prospect peut réserver seul. Le conseiller voit ses leads qualifiés et peut les convertir en clients.

| Tâche | US | Jours |
|---|---|---|
| Réservation consultation prospect (réutilise module RDV Sprint 9) | US-026 | 1,5 j |
| Fiche prospect pré-remplie avec score et réponses questionnaire | US-026 | 1 j |
| Vue leads qualifiés staff — triés par score, statuts | US-027 | 2 j |
| Alertes prospects à relancer (>48h sans réservation) | US-027 | 1 j |
| Conversion prospect → client avec pré-création dossier | US-027 | 2 j |

**Total : 7,5 jours**

**Livrable démontrable** : Le conseiller voit 12 nouveaux leads cette semaine. Il clique sur le prospect le mieux scoré, voit ses réponses, et le convertit en client en 1 clic. Un dossier "Permis d'études" est automatiquement créé avec les données du questionnaire.

**Critère de succès** :
- La conversion prospect → client prend moins de 2 minutes
- Le dossier créé contient déjà les informations collectées lors du questionnaire
- Le conseiller peut envoyer un message de relance depuis la fiche prospect en 1 clic

---

## SPRINT 12 — Semaines 23–24
### Contenu éducatif + Finitions + Recette finale
**Objectif** : Finaliser le MVP, livrer le contenu éducatif, corriger les derniers bugs, préparer le lancement.

| Tâche | US | Jours |
|---|---|---|
| Module contenu éducatif — articles par thème, filtres, CTA | US-028 | 2 j |
| Corrections bugs et ajustements UX remontés en Phase 3 | — | 2 j |
| Tests end-to-end — parcours prospect, client, staff | — | 1,5 j |
| Optimisations performance mobile (images, lazy loading, cache) | — | 1 j |
| Préparation lancement — onboarding clients existants, communication interne | — | 1 j |

**Total : 7,5 jours**

**Livrable démontrable** : Démo complète MVP — parcours prospect → client → staff → comptabilité fonctionnel de bout en bout, sur mobile Android entrée de gamme.

**Critère de succès du MVP** :
- 100% des 28 user stories livrées et testées
- Temps de chargement page < 3 secondes sur connexion 3G
- 0 bug bloquant sur les parcours critiques
- L'équipe interne est formée et prête à migrer depuis WhatsApp

---

---

## Vue synthétique — 12 sprints

| Sprint | Semaines | US livrées | Jours estimés | Cumul US |
|---|---|---|---|---|
| S1 | 1–2 | US-001, 002, 003, 004 | 7,5 j | 4 |
| S2 | 3–4 | US-005, 006, 007, 008, 009 | 7,5 j | 9 |
| S3 | 5–6 | US-010, 012 (partiel) | 6,5 j | 11 |
| S4 | 7–8 | US-011, 012, 013 | 7,5 j | 14 |
| S5 | 9–10 | US-014, 015 | 7,5 j | 16 |
| S6 | 11–12 | US-016, 018, 017 (partiel) | 7,5 j | 19 |
| S7 | 13–14 | US-017 (complet) | 7,5 j | 20 |
| S8 | 15–16 | US-019, 020 | 6,5 j | 22 |
| S9 | 17–18 | US-021, 022, 023 | 7,5 j | 25 |
| S10 | 19–20 | US-024, 025 | 7 j | 27 |
| S11 | 21–22 | US-026, 027 | 7,5 j | 28 (- US-028) |
| S12 | 23–24 | US-028 + finitions | 7,5 j | 28 ✅ |
| **Total** | | **28 US** | **87,5 j** | |

---

## Points de synchronisation obligatoires

| Moment | Action |
|---|---|
| Fin Sprint 4 (semaine 8) | ✅ Validation Phase 1 avec 2–3 clients réels |
| Avant Sprint 7 (semaine 12) | ✅ Démarches compte marchand Mobile Money lancées |
| Fin Sprint 9 (semaine 18) | ✅ Validation Phase 2 avec l'équipe interne complète |
| Avant Sprint 10 (semaine 19) | ✅ Algorithme de scoring validé par un conseiller |
| Fin Sprint 12 (semaine 24) | ✅ Go/No-go lancement MVP |

---

*Document produit dans le cadre du projet Camerounada — MVP 6 mois*
*Version 1.0 — À réviser après chaque sprint en fonction de la vélocité réelle*
