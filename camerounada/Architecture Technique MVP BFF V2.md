# Architecture Technique MVP — Camerounada
> Stack : BFF (Backend for Frontend) — Vue.js 3 + Nuxt 3 + Node.js + MySQL
> Dev : 1 développeur full-stack + Claude Code
> Hébergement : Netlify (dev) → AWS (prod)
> Cible : Web responsive, optimisé connexions faibles, marché africain

---

## 1. Principe BFF — Pourquoi ce choix

L'architecture BFF crée **un backend dédié par type d'utilisateur** plutôt qu'un backend générique unique.

```
┌──────────────────┐     ┌──────────────────┐
│  App Client      │     │  App Staff/Admin  │
│  (Nuxt 3)        │     │  (Nuxt 3)         │
│  prospects +     │     │  conseillers +    │
│  clients actifs  │     │  analystes + ops  │
└────────┬─────────┘     └────────┬──────────┘
         │                        │
         ▼                        ▼
┌──────────────────┐     ┌──────────────────┐
│  BFF Client      │     │  BFF Staff       │
│  Node.js/Express │     │  Node.js/Express │
│  Port 4001       │     │  Port 4002       │
└────────┬─────────┘     └────────┬──────────┘
         │                        │
         └───────────┬────────────┘
                     ▼
         ┌───────────────────────┐
         │   Core API (partagé)  │
         │   Node.js/Express     │
         │   Port 4000           │
         │   Auth · Dossiers     │
         │   Documents · Paiem.  │
         │   Messaging · Notif.  │
         └───────────┬───────────┘
                     │
         ┌───────────▼───────────┐
         │   MySQL (1 base)      │
         │   + Redis             │
         │   + AWS S3            │
         └───────────────────────┘
```

**Ce que ça change par rapport aux microservices :**

| Microservices (v1) | BFF (v2) |
|---|---|
| 6 services indépendants | 3 apps Node.js |
| 6 bases MySQL | 1 base MySQL, modules séparés |
| Communication inter-services complexe | Appels directs en interne |
| ~20j d'infra avant le 1er écran | ~5j d'infra, démarrage immédiat |
| ECS multi-services complexe | Docker Compose → ECS simplifié |

---

## 2. Les 3 composants backend

### BFF Client — `bff-client/` (port 4001)
**Sert uniquement** : prospects + clients actifs

```
Responsabilités :
- Adapter les réponses Core API au format attendu par l'app client
- Agréger plusieurs appels Core en une seule réponse
  (ex : dashboard = dossier + docs + paiements + actions)
- Appliquer les règles d'accès clients (jamais les notes internes)
- Alléger les réponses pour connexions lentes

Routes exposées :
GET    /me/dashboard          → agrège dossier + docs + actions + paiements
GET    /me/dossier            → dossier client (sans données internes)
GET    /me/documents          → liste documents + statuts
POST   /me/documents/upload   → presigned URL S3
GET    /me/payments           → factures + statuts
POST   /me/messages           → envoyer un message
GET    /me/messages           → fil de conversation
GET    /me/appointments       → rendez-vous
POST   /me/appointments       → réserver un créneau
POST   /me/support/tickets    → créer un ticket
GET    /me/resources          → contenu éducatif filtré
GET    /prospect/questionnaire → questionnaire de qualification
POST   /prospect/score        → soumettre réponses + obtenir score
```

---

### BFF Staff — `bff-staff/` (port 4002)
**Sert uniquement** : conseillers, analystes, support, comptabilité, admin

```
Responsabilités :
- Exposer les données enrichies pour le travail opérationnel
- Appliquer le RBAC métier (analyste ≠ comptabilité ≠ admin)
- Agréger les vues complexes (pipeline CRM, file de validation)
- Exposer les actions réservées au staff

Routes exposées :
GET    /crm/pipeline          → dossiers avec filtres et alertes
GET    /crm/leads             → prospects qualifiés triés par score
POST   /crm/leads/:id/convert → convertir prospect en client
GET    /dossiers/:id/full     → dossier complet avec notes internes
PUT    /dossiers/:id/status   → changer le statut
POST   /dossiers/:id/tasks    → créer une tâche interne
GET    /documents/queue       → file de validation
PUT    /documents/:id/validate
PUT    /documents/:id/reject
GET    /payments/invoices     → toutes les factures
POST   /payments/invoices     → créer une facture
GET    /payments/overdue      → factures en retard
POST   /support/tickets/:id/assign
PUT    /support/tickets/:id/resolve
GET    /analytics/overview    → KPIs globaux
```

---

### Core API — `core-api/` (port 4000)
**Jamais exposé directement** à l'extérieur — uniquement appelé par les deux BFF

```
Responsabilités :
- Toute la logique métier centralisée
- Accès direct à la base de données MySQL
- Gestion des fichiers S3
- Envoi des emails et notifications
- Calcul du scoring prospect

Modules internes :
├── auth/          JWT, RBAC, sessions
├── users/         Création, profils, rôles
├── dossiers/      CRUD, étapes, historique
├── documents/     Upload, validation, archivage
├── payments/      Factures, paiements, reçus
├── messaging/     Conversations, messages temps réel
├── notifications/ Email, push, in-app, queue Redis
├── scoring/       Algorithme qualification prospects
└── appointments/  Créneaux, réservations, rappels
```

---

## 3. Frontend — 2 applications Nuxt 3

### App Client — `apps/client/`
```
pages/
├── index.vue              -- landing / onboarding prospect
├── auth/login.vue
├── auth/register.vue
├── prospect/
│   ├── questionnaire.vue  -- formulaire multi-étapes
│   └── resultats.vue      -- score + recommandations
├── dashboard/index.vue
├── dossier/index.vue
├── documents/index.vue
├── paiements/index.vue
├── messages/index.vue
├── rendez-vous/index.vue
├── support/index.vue
└── ressources/index.vue

composables/
├── useClientApi.ts        -- appels vers BFF Client
├── useAuth.ts
├── useUpload.ts           -- chunked upload avec reprise
└── useSocket.ts           -- messagerie temps réel
```

### App Staff — `apps/staff/`
```
pages/
├── auth/login.vue
├── crm/
│   ├── pipeline.vue       -- vue kanban / liste dossiers
│   └── leads.vue          -- prospects qualifiés
├── dossiers/
│   ├── index.vue
│   └── [id].vue           -- détail dossier + notes internes
├── documents/validation.vue
├── paiements/
│   ├── factures.vue
│   └── suivi.vue
├── support/tickets.vue
├── calendrier/index.vue
└── admin/
    ├── utilisateurs.vue
    └── parametres.vue

composables/
├── useStaffApi.ts         -- appels vers BFF Staff
├── useAuth.ts
└── useCRM.ts
```

---

## 4. Structure du projet

```
camerounada/
├── apps/
│   ├── client/            (Nuxt 3 — espace client + prospect)
│   └── staff/             (Nuxt 3 — espace staff + admin)
├── backend/
│   ├── core-api/          (Node.js + Express — logique métier)
│   ├── bff-client/        (Node.js + Express — BFF client)
│   └── bff-staff/         (Node.js + Express — BFF staff)
├── packages/
│   ├── shared-types/      (interfaces TypeScript partagées)
│   └── shared-utils/      (fonctions utilitaires communes)
├── infra/
│   ├── docker-compose.yml
│   └── nginx/
├── .github/
│   └── workflows/
│       ├── ci.yml
│       └── deploy.yml
└── turbo.json
```

---

## 5. Base de données — 1 MySQL, préfixes par domaine

```sql
-- 1 seule base MySQL avec préfixes par domaine

-- Domaine auth
auth_users
auth_roles
auth_permissions
auth_role_permissions
auth_sessions
auth_refresh_tokens

-- Domaine dossiers
dos_dossiers
dos_steps
dos_history
dos_tasks
dos_task_assignments

-- Domaine documents
doc_documents
doc_validations

-- Domaine paiements
pay_invoices
pay_invoice_items
pay_payments
pay_receipts

-- Domaine messaging
msg_conversations
msg_messages
msg_attachments

-- Domaine notifications
notif_notifications
notif_preferences
notif_logs

-- Domaine prospects
pro_questionnaires
pro_responses
pro_scores
```

> Une seule base simplifie le backup, les migrations et le dev local.
> Les préfixes reproduisent la séparation logique sans la complexité multi-base.

---

## 6. Infrastructure

### Dev (Netlify + Docker local)

```
Netlify
├── App Client  → client.camerounada.com
└── App Staff   → staff.camerounada.com

Docker Compose (local)
├── core-api      :4000
├── bff-client    :4001
├── bff-staff     :4002
├── mysql         :3306
├── redis         :6379
└── minio         :9000   (S3 local)
```

### Prod (AWS)

```
Route 53 → CloudFront
├── client.camerounada.com → Netlify (Nuxt 3 client)
└── staff.camerounada.com  → Netlify (Nuxt 3 staff)

ALB (Application Load Balancer)
├── /api/client/* → ECS Task : bff-client
├── /api/staff/*  → ECS Task : bff-staff
└── /internal/*   → ECS Task : core-api (VPC privé uniquement)

RDS MySQL (Single-AZ MVP → Multi-AZ V2)
ElastiCache Redis
S3 + CloudFront (documents)
SES (emails)
Secrets Manager
CloudWatch + Sentry
```

---

## 7. Sécurité

```
Authentification
- JWT émis par Core API via BFF
- Access token 15min + refresh token httpOnly 30j
- RBAC vérifié dans chaque BFF selon le contexte

Isolation des espaces
- BFF Client : impossible d'accéder aux routes staff
- BFF Staff  : RBAC granulaire par rôle métier
- Core API   : non exposé Internet, VPC privé uniquement

Documents
- Presigned URLs S3 (expiration 15min)
- Upload direct S3 (fichiers ne transitent pas par le serveur)
- Chiffrement at-rest AES-256

Inter-services
- BFF → Core API via INTERNAL_API_KEY
- Tous dans le même VPC AWS en prod
```

---

## 8. Stack récapitulatif

| Couche | Technologie | Justification |
|---|---|---|
| Frontend client | Vue.js 3 + Nuxt 3 | SSR, PWA, optimisé connexions lentes |
| Frontend staff | Vue.js 3 + Nuxt 3 | Même stack, app séparée |
| BFF Client | Node.js + Express + TypeScript | Agrégation + filtrage clients |
| BFF Staff | Node.js + Express + TypeScript | Agrégation + RBAC staff |
| Core API | Node.js + Express + TypeScript | Logique métier centralisée |
| ORM | Prisma | Migrations, typage TypeScript, MySQL |
| Base de données | MySQL 8.0 (RDS en prod) | 1 base, préfixes par domaine |
| Cache / Queue | Redis 7 (ElastiCache en prod) | Sessions, pub/sub, BullMQ |
| Stockage fichiers | AWS S3 + CloudFront | Upload direct, CDN, sécurité |
| Emails | SendGrid / Resend | Délivrabilité, sandbox dev |
| Paiements | Stripe + CinetPay | International + Mobile Money |
| Monorepo | Turborepo | Builds incrémentaux partagés |
| Conteneurs | Docker + ECS Fargate | Scale auto sans ops overhead |
| CI/CD | GitHub Actions + Netlify | Deploy auto, preview branches |
| Monitoring | CloudWatch + Sentry | Logs, alertes, erreurs frontend |

---

## 9. Ce que Claude Code gère le mieux dans cette architecture

```
SCAFFOLDING INITIAL (Sprint 1)
├── Structure complète Turborepo (apps + backend + packages)
├── 3 apps Node.js Express avec TypeScript
├── 2 apps Nuxt 3 avec routing et middleware auth
└── docker-compose.yml complet opérationnel

CORE API
├── Schéma Prisma complet depuis les specs
├── CRUD controllers par domaine
├── Middleware RBAC réutilisable
└── Service notifications (email + push + queue)

BFF — AGRÉGATIONS
├── Endpoint dashboard (agrège 4 appels Core en 1)
├── Pipeline CRM avec filtres et alertes
└── Conversion prospect → client avec pré-remplissage dossier

TÂCHES COMPLEXES
├── Chunked upload avec reprise (tus.io)
├── Intégration CinetPay Mobile Money
├── Génération PDF factures (PDFKit)
├── Algorithme scoring prospect
└── WebSocket messagerie temps réel (Socket.io)
```

---

*Document produit dans le cadre du projet Camerounada — MVP 6 mois*
*Version 2.0 — Architecture BFF (remplace v1 microservices)*
