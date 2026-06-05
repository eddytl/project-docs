# Estimations MVP — Camerounada
> Équipe : 1 développeur full-stack
> Stack : Web app responsive (React + Node.js recommandé)
> Durée : 6 mois — ~120 jours ouvrés disponibles
> Unité : jours de développement réels (1 jour = 6h de code effectif)

---

## Hypothèses de cadrage

| Paramètre | Valeur retenue |
|---|---|
| Jours ouvrés sur 6 mois | 120 jours |
| Coefficient réalisme (réunions, bugs, révisions) | 75% |
| **Jours de code effectif disponibles** | **~90 jours** |
| Charge DevOps / infra / déploiement | 8 jours (déduits) |
| Charge tests & recette | 10 jours (déduits) |
| **Budget réel pour le développement features** | **~72 jours** |

> ⚠️ Avec 1 seul développeur, chaque estimation inclut front + back + intégration.
> Les US marquées 🔴 sont critiques au chemin critique — elles débloquent d'autres US.

---

## PHASE 1 — Fondations (Mois 1–2) — Budget alloué : 24 jours

---

### MODULE : Authentification

| ID | User Story | Complexité | Estimation | Risques |
|---|---|---|---|---|
| US-001 | Création de compte client | Moyenne | **2 j** | Vérification email, gestion erreurs |
| US-002 | Connexion | Faible | **1 j** | Gestion session, blocage tentatives |
| US-003 | Réinitialisation mot de passe | Faible | **0,5 j** | Expiration token |
| US-004 🔴 | Gestion des rôles RBAC | Élevée | **3 j** | Modèle de permissions, middleware, tests |

**Sous-total authentification : 6,5 jours**

> 🔴 US-004 est bloquante pour TOUTES les US du staff. À livrer en premier.

---

### MODULE : Dashboard client

| ID | User Story | Complexité | Estimation | Risques |
|---|---|---|---|---|
| US-005 🔴 | Vue statut de dossier | Moyenne | **2 j** | Composant progression dynamique, états multiples |
| US-006 | Résumé actions en attente | Faible | **1 j** | Logique de filtrage des tâches |

**Sous-total dashboard : 3 jours**

---

### MODULE : Gestion de dossiers

| ID | User Story | Complexité | Estimation | Risques |
|---|---|---|---|---|
| US-007 🔴 | Création dossier (Staff) | Élevée | **3 j** | Modèle de données par type de service, workflow étapes |
| US-008 | Mise à jour statut (Staff) | Moyenne | **2 j** | Historique horodaté, notes internes vs client |
| US-009 | Consultation dossier (Client) | Faible | **1 j** | Chronologie, onglets multi-services |

**Sous-total dossiers : 6 jours**

---

### MODULE : Gestion documentaire

| ID | User Story | Complexité | Estimation | Risques |
|---|---|---|---|---|
| US-010 🔴 | Upload documents (Client) | Élevée | **3 j** | Reprise upload, compression, scan mobile, gestion connexion faible |
| US-011 | Validation documentaire (Staff) | Moyenne | **2 j** | Workflow validation/rejet, aperçu fichier |
| US-012 | Vue documentaire (Client) | Faible | **1 j** | Statuts colorés, logique de re-soumission |

**Sous-total documents : 6 jours**

---

### MODULE : Notifications

| ID | User Story | Complexité | Estimation | Risques |
|---|---|---|---|---|
| US-013 | Notifications push & email | Élevée | **2,5 j** | Intégration service email (SendGrid), push web, préférences |

**Sous-total notifications : 2,5 jours**

---

### 📊 Bilan Phase 1

| Élément | Valeur |
|---|---|
| Total estimé | **24 jours** |
| Budget alloué | 24 jours |
| Marge | 0 jour ⚠️ |
| US critiques (chemin critique) | US-004, US-005, US-007, US-010 |

> ⚠️ Phase 1 sans marge. Recommandation : retirer US-013 (notifications) de la Phase 1 et la déplacer en début de Phase 2. Économie : 2,5 jours → marge de sécurité.

---

## PHASE 2 — Opérations internes & Paiements (Mois 3–4) — Budget alloué : 26 jours

---

### MODULE : CRM interne

| ID | User Story | Complexité | Estimation | Risques |
|---|---|---|---|---|
| US-014 | Pipeline conseiller | Élevée | **3 j** | Vue kanban ou liste, filtres, alertes dossiers bloqués |
| US-015 | Gestion des tâches internes | Moyenne | **2 j** | Assignation, notifications internes, archivage |

**Sous-total CRM : 5 jours**

---

### MODULE : Paiements

| ID | User Story | Complexité | Estimation | Risques |
|---|---|---|---|---|
| US-016 | Génération facture (Comptabilité) | Moyenne | **2 j** | Génération PDF, échéancier, envoi automatique |
| US-017 🔴 | Paiement en ligne (Client) | Très élevée | **5 j** | Intégration passerelle (Stripe ou Mobile Money), sécurité, gestion échecs |
| US-018 | Suivi paiements (Comptabilité) | Moyenne | **2 j** | Tableau de bord, filtres, relances automatiques |

**Sous-total paiements : 9 jours**

> 🔴 US-017 est la plus risquée du projet : intégration paiement + Mobile Money pour le marché africain. Prévoir 1 jour de spike technique avant de démarrer.

---

### MODULE : Messagerie

| ID | User Story | Complexité | Estimation | Risques |
|---|---|---|---|---|
| US-019 🔴 | Messagerie client ↔ conseiller | Élevée | **4 j** | Temps réel (WebSocket ou polling), file d'attente offline, pièces jointes |
| US-020 | Messagerie interne staff | Faible | **1 j** | Fil séparé, mentions @, notifications internes |

**Sous-total messagerie : 5 jours**

---

### MODULE : Rendez-vous

| ID | User Story | Complexité | Estimation | Risques |
|---|---|---|---|---|
| US-021 | Réservation rendez-vous (Client) | Moyenne | **3 j** | Gestion créneaux, calendrier conseiller, lien visio automatique, rappels |

**Sous-total rendez-vous : 3 jours**

---

### MODULE : Support / Tickets

| ID | User Story | Complexité | Estimation | Risques |
|---|---|---|---|---|
| US-022 | Création ticket (Client) | Faible | **1 j** | Formulaire, numéro de référence, confirmation |
| US-023 | Gestion tickets (Support interne) | Moyenne | **2 j** | File de tickets, statuts, alertes délai dépassé |

**Sous-total support : 3 jours**

---

### MODULE : Notifications (reporté de Phase 1)

| ID | User Story | Complexité | Estimation | Risques |
|---|---|---|---|---|
| US-013 | Notifications push & email | Élevée | **2,5 j** | (voir Phase 1) |

---

### 📊 Bilan Phase 2

| Élément | Valeur |
|---|---|
| Total estimé | **27,5 jours** |
| Budget alloué | 26 jours |
| Écart | -1,5 jour ⚠️ |
| US la plus risquée | US-017 (paiement en ligne) |

> ⚠️ Phase 2 légèrement dépassée. Options : (1) réduire US-021 rendez-vous à une version simplifiée sans lien visio automatique (-1j), ou (2) puiser sur la marge de Phase 3.

---

## PHASE 3 — Acquisition & Conversion prospects (Mois 5–6) — Budget alloué : 22 jours

---

### MODULE : Onboarding prospect

| ID | User Story | Complexité | Estimation | Risques |
|---|---|---|---|---|
| US-024 🔴 | Questionnaire de qualification | Moyenne | **3 j** | Formulaire multi-étapes, sauvegarde progressive, reprise |
| US-025 | Scoring automatique + recommandation | Élevée | **4 j** | Algorithme de scoring, logique de recommandation par programme, page résultats |
| US-026 | Réservation consultation (Prospect) | Faible | **1,5 j** | Réutilise le module rendez-vous de Phase 2, adaptation prospect |

**Sous-total onboarding : 8,5 jours**

---

### MODULE : Scoring & leads (Staff)

| ID | User Story | Complexité | Estimation | Risques |
|---|---|---|---|---|
| US-027 | Vue leads qualifiés (Conseiller) | Moyenne | **3 j** | Liste triée par score, statuts, relance en un clic, conversion automatique en dossier |

**Sous-total leads : 3 jours**

---

### MODULE : Contenu éducatif

| ID | User Story | Complexité | Estimation | Risques |
|---|---|---|---|---|
| US-028 | Accès contenu éducatif | Faible | **2 j** | CMS simple ou articles statiques, filtres par thème, CTA |

**Sous-total contenu : 2 jours**

---

### 📊 Bilan Phase 3

| Élément | Valeur |
|---|---|
| Total estimé | **13,5 jours** |
| Budget alloué | 22 jours |
| **Marge disponible** | **+8,5 jours** 🟢 |

> 🟢 Phase 3 confortable. Les 8,5 jours de marge absorbent les dépassements des Phases 1 et 2, et laissent du temps pour les finitions UX et les retours utilisateurs.

---

## Vue consolidée — 28 User Stories sur 6 mois

| Phase | US | Estimation | Budget | Écart |
|---|---|---|---|---|
| Phase 1 — Fondations | 13 | 24 j | 24 j | 0 j ⚠️ |
| Phase 2 — Opérations | 12 | 27,5 j | 26 j | -1,5 j ⚠️ |
| Phase 3 — Conversion | 5 | 13,5 j | 22 j | +8,5 j 🟢 |
| **DevOps / Infra** | — | 8 j | — | — |
| **Tests & recette** | — | 10 j | — | — |
| **TOTAL** | **28** | **83 j** | **90 j** | **+7 j** 🟢 |

> ✅ Le projet tient sur 6 mois avec 1 dev full-stack, à condition de respecter l'ordre des phases et de ne pas ajouter de scope en cours de route.

---

## Chemin critique — US à ne jamais retarder

```
US-004 (RBAC)
  └── US-007 (Création dossier)
        └── US-005 (Dashboard client)
              └── US-010 (Upload documents)
                    └── US-011 (Validation docs)
                          └── US-019 (Messagerie)
                                └── US-017 (Paiements)
                                      └── US-024 (Questionnaire prospect)
                                            └── US-025 (Scoring)
```

Un retard sur l'une de ces US décale tout ce qui suit. Elles doivent être les premières démarrées dans chaque phase.

---

## Recommandations pour 1 dev full-stack

1. **Utiliser un starter kit** (Next.js + Prisma + Auth.js) pour ne pas construire l'infra from scratch — économie estimée : 5 à 8 jours.

2. **Externaliser les services complexes** plutôt que les coder :
   - Email : SendGrid ou Resend (pas de serveur mail custom)
   - Paiements : Stripe + intégration Mobile Money via agrégateur (Paystack ou CinetPay)
   - Visio rendez-vous : lien Google Meet généré via API Calendar
   - Upload fichiers : Cloudinary ou AWS S3 avec reprise native

3. **Ne pas construire le CMS du contenu éducatif** — utiliser Notion ou un Google Doc en lecture seule pour les premières semaines. Économie : 1 jour.

4. **Livrer par blocs démontrables** toutes les 2 semaines pour valider les choix UX avant d'aller trop loin.

5. **Freeze du scope dès le démarrage de la Phase 2** — toute nouvelle demande va dans un backlog V2, pas dans le MVP.

---

*Document produit dans le cadre du projet Camerounada — MVP 6 mois*
*Prochaine étape recommandée : découpage en sprints de 2 semaines*
