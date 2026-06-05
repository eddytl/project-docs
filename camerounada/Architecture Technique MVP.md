# Architecture Technique MVP — Camerounada
> Stack : Microservices — Vue.js (Nuxt 3) + Node.js + MySQL
> Dev : 1 développeur full-stack + Claude Code
> Hébergement : Vercel (dev) → AWS (prod)
> Cible : Web responsive, optimisé connexions faibles, marché africain

---

## 1. Vue d'ensemble — Carte des services

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENTS                                  │
│         Browser (Vue.js/Nuxt 3) — Web responsive                │
└──────────────────────────┬──────────────────────────────────────┘
                           │ HTTPS
┌──────────────────────────▼──────────────────────────────────────┐
│                    API GATEWAY                                   │
│         (Nuxt 3 server routes / Kong sur AWS)                   │
│   Auth middleware · Rate limiting · Routing · Logging           │
└───┬──────────┬──────────┬──────────┬──────────┬─────────────────┘
    │          │          │          │          │
    ▼          ▼          ▼          ▼          ▼
┌───────┐ ┌───────┐ ┌───────┐ ┌───────┐ ┌───────────┐
│  SVC  │ │  SVC  │ │  SVC  │ │  SVC  │ │    SVC    │
│ Auth  │ │Dossier│ │  Doc  │ │Paiem. │ │  Notif.   │
└───┬───┘ └───┬───┘ └───┬───┘ └───┬───┘ └─────┬─────┘
    │         │         │         │           │
    ▼         ▼         ▼         ▼           ▼
┌───────┐ ┌───────┐ ┌───────┐ ┌───────┐ ┌───────────┐
│  DB   │ │  DB   │ │  DB   │ │  DB   │ │  Queue    │
│ auth  │ │dossier│ │  doc  │ │paiem. │ │  (Redis)  │
└───────┘ └───────┘ └───────┘ └───────┘ └───────────┘
```

---

## 2. Les 6 microservices

### Service 1 — Auth Service
**Responsabilité** : Authentification, sessions, RBAC, gestion des utilisateurs

```
Endpoints principaux :
POST   /auth/register
POST   /auth/login
POST   /auth/logout
POST   /auth/refresh-token
POST   /auth/forgot-password
POST   /auth/reset-password
GET    /auth/me
PUT    /auth/roles/:userId

Stack interne :
- Node.js + Express
- JWT (access token 15min + refresh token 30j)
- bcrypt pour les mots de passe
- Base MySQL : auth_db
  Tables : users, roles, permissions, role_permissions, sessions
```

**Modèle RBAC simplifié :**
```sql
users           (id, email, password_hash, role_id, is_verified, created_at)
roles           (id, name, description)           -- client, conseiller, analyste, support, admin
permissions     (id, resource, action)            -- ex: dossier:read, document:validate
role_permissions(role_id, permission_id)
```

---

### Service 2 — Dossier Service
**Responsabilité** : Gestion des dossiers clients, étapes, statuts, historique, tâches internes

```
Endpoints principaux :
POST   /dossiers
GET    /dossiers/:id
PUT    /dossiers/:id/status
GET    /dossiers/:id/history
POST   /dossiers/:id/tasks
GET    /dossiers                    (liste filtrée par conseiller)
GET    /dossiers/prospects          (leads qualifiés)
POST   /dossiers/convert-prospect   (prospect → client)

Stack interne :
- Node.js + Express
- Base MySQL : dossier_db
  Tables : dossiers, dossier_steps, dossier_history, tasks, task_assignments
```

**Modèle de données clé :**
```sql
dossiers (
  id, client_id, conseiller_id, analyste_id,
  type,           -- etudes | travail | rp | visiteur | coaching
  status,         -- en_attente | en_cours | bloque | soumis | decision | clos
  current_step,
  metadata JSON,  -- données questionnaire prospect importées
  created_at, updated_at
)

dossier_steps (
  id, dossier_id, step_name, step_order,
  status,         -- pending | active | completed | skipped
  completed_at, completed_by
)

dossier_history (
  id, dossier_id, action, old_value, new_value,
  performed_by, is_internal,   -- false = visible client
  created_at
)
```

---

### Service 3 — Document Service
**Responsabilité** : Upload, stockage, validation, archivage des documents

```
Endpoints principaux :
POST   /documents/upload            (génère une presigned URL S3)
PUT    /documents/:id/validate
PUT    /documents/:id/reject
GET    /documents/dossier/:dossierId
GET    /documents/:id/download

Stack interne :
- Node.js + Express
- Stockage : AWS S3 (prod) / Cloudinary (dev)
- Upload chunked via tus.io (reprise sur coupure)
- Génération presigned URLs (upload direct S3, jamais via le serveur)
- Base MySQL : document_db
  Tables : documents, document_validations
```

**Flux upload optimisé connexion faible :**
```
Client                Service Doc              S3
  │                       │                    │
  ├─ POST /upload ────────►│                    │
  │  (nom, type, taille)   │                    │
  │◄─ presigned_url ───────┤                    │
  │                        │                    │
  ├─ PUT chunks ───────────┼───────────────────►│
  │  (upload direct S3)    │                    │
  │◄────────────────────────────────── 200 OK ──┤
  │                        │                    │
  ├─ POST /confirm ────────►│                    │
  │  (s3_key)              ├─ update DB ────────┤
  │◄─ document_id ─────────┤                    │
```

**Modèle de données :**
```sql
documents (
  id, dossier_id, client_id,
  name, type,         -- passeport | diplome | releve | contrat | autre
  s3_key, s3_bucket,
  file_size, mime_type,
  status,             -- uploading | pending | validated | rejected | archived
  uploaded_at
)

document_validations (
  id, document_id, validator_id,
  action,             -- validated | rejected
  reason,             -- obligatoire si rejected
  created_at
)
```

---

### Service 4 — Payment Service
**Responsabilité** : Factures, paiements en ligne, reçus, relances

```
Endpoints principaux :
POST   /payments/invoices
GET    /payments/invoices/:id
GET    /payments/invoices/client/:clientId
POST   /payments/checkout             (initie paiement Stripe/CinetPay)
POST   /payments/webhook              (reçoit confirmation passerelle)
GET    /payments/receipts/:id/pdf

Stack interne :
- Node.js + Express
- Stripe (carte bancaire internationale)
- CinetPay ou Paystack (Mobile Money MTN/Orange)
- PDFKit (génération PDF factures et reçus)
- Base MySQL : payment_db
  Tables : invoices, invoice_items, payments, receipts
```

**Modèle de données :**
```sql
invoices (
  id, dossier_id, client_id,
  total_amount, currency,     -- XAF ou EUR
  status,                     -- draft | sent | partial | paid | overdue | cancelled
  due_date, sent_at, paid_at
)

payments (
  id, invoice_id,
  amount, currency,
  method,                     -- card | mtn_money | orange_money
  gateway,                    -- stripe | cinetpay | paystack
  gateway_ref,
  status,                     -- pending | success | failed | refunded
  metadata JSON,
  created_at
)
```

**Gestion webhook (critique) :**
```javascript
// Toujours vérifier la signature webhook avant de traiter
POST /payments/webhook
→ Vérifier signature (Stripe-Signature header)
→ Mettre à jour statut paiement
→ Émettre event → Notification Service
→ Générer reçu PDF
→ Répondre 200 dans < 5 secondes (sinon retry passerelle)
```

---

### Service 5 — Messaging Service
**Responsabilité** : Messagerie temps réel client ↔ staff, messagerie interne, pièces jointes

```
Endpoints principaux :
GET    /messages/conversations/:dossierId
POST   /messages/send
GET    /messages/unread
PUT    /messages/:id/read

WebSocket :
ws://  /messages/ws              (connexion temps réel)

Stack interne :
- Node.js + Express + Socket.io
- Redis (pub/sub pour les events temps réel)
- File d'attente offline (messages stockés si déconnecté)
- Base MySQL : messaging_db
  Tables : conversations, messages, message_attachments
```

**Architecture temps réel :**
```
Client A (connecté)           Redis Pub/Sub         Client B (connecté)
     │                             │                       │
     ├── socket.emit('send') ──────►│                       │
     │                             ├── publish ────────────►│
     │                             │                       ├── socket.on('receive')
     │                             │                       │
     │   (Client C déconnecté — message stocké en DB, livré à reconnexion)
```

**Modèle de données :**
```sql
conversations (
  id, dossier_id, type,    -- client_staff | internal
  created_at
)

messages (
  id, conversation_id, sender_id,
  content, is_internal,    -- true = staff only
  status,                  -- sent | delivered | read
  sent_at, delivered_at, read_at
)
```

---

### Service 6 — Notification Service
**Responsabilité** : Orchestration de toutes les notifications (email, push, in-app)

```
Endpoints principaux :
POST   /notifications/send           (usage interne entre services)
GET    /notifications/user/:userId
PUT    /notifications/:id/read
PUT    /notifications/preferences    (préférences utilisateur)

Stack interne :
- Node.js + Express
- Redis Queue (BullMQ) pour traitement asynchrone
- SendGrid ou Resend (emails)
- Web Push API (notifications push navigateur)
- Base MySQL : notification_db
  Tables : notifications, notification_preferences, notification_logs
```

**Flux de notification inter-services :**
```
Dossier Service        Notification Service       Utilisateur
     │                        │                        │
     ├─ HTTP POST ────────────►│                        │
     │  /notifications/send    │                        │
     │  { user_id,             ├─ Queue job ────────────┤
     │    type: 'status_change'│                        │
     │    data: {...} }        ├─ Email (SendGrid) ─────►│
     │                         ├─ Push (Web Push) ──────►│
     │                         ├─ In-app ───────────────►│
```

**Types de notifications gérés :**
```
DOSSIER    : status_changed, step_completed, action_required
DOCUMENT   : uploaded, validated, rejected, correction_needed
PAYMENT    : invoice_sent, payment_received, payment_overdue
MESSAGE    : new_message, new_internal_mention
MEETING    : meeting_confirmed, meeting_reminder_24h, meeting_cancelled
SUPPORT    : ticket_opened, ticket_assigned, ticket_resolved
PROSPECT   : qualification_complete, consultation_confirmed
```

---

## 3. Frontend — Nuxt 3 App

```
apps/
└── web/                          (Nuxt 3 — Vue.js)
    ├── pages/
    │   ├── auth/                 -- pages publiques (login, register)
    │   ├── client/               -- espace client (dashboard, dossier, docs)
    │   ├── staff/                -- espace staff (CRM, validation, tasks)
    │   ├── admin/                -- espace admin (users, config)
    │   └── prospect/             -- onboarding, questionnaire, résultats
    ├── components/
    │   ├── ui/                   -- composants de base (Button, Card, Badge...)
    │   ├── dossier/              -- composants dossier
    │   ├── document/             -- composants upload/validation
    │   ├── messaging/            -- composants messagerie
    │   └── payment/              -- composants paiement
    ├── composables/
    │   ├── useAuth.ts            -- gestion session côté client
    │   ├── useApi.ts             -- clients HTTP vers chaque service
    │   └── useSocket.ts          -- client Socket.io
    ├── middleware/
    │   └── auth.ts               -- protection des routes par rôle
    └── nuxt.config.ts
```

**Optimisations connexion faible (priorité marché africain) :**
```javascript
// nuxt.config.ts
export default defineNuxtConfig({
  ssr: true,                          // SSR natif pour perf initiale
  image: { formats: ['webp', 'avif'] }, // images compressées
  experimental: { payloadExtraction: false },
  vite: { build: { cssMinify: true } }
})

// Stratégies appliquées :
// • Service Worker (PWA via @vite-pwa/nuxt) — cache assets statiques
// • Lazy loading composants non critiques via defineAsyncComponent()
// • Skeleton screens pendant les chargements
// • Pagination côté serveur (jamais de listes infinies)
// • Debounce sur les appels API (300ms via useDebounce)
// • Optimistic updates sur les actions courantes
```

---

## 4. Structure du monorepo

```
camerounada/
├── apps/
│   └── web/                      (Nuxt 3 frontend — Vue.js)
├── services/
│   ├── auth/                     (Auth Service — port 3001)
│   ├── dossier/                  (Dossier Service — port 3002)
│   ├── document/                 (Document Service — port 3003)
│   ├── payment/                  (Payment Service — port 3004)
│   ├── messaging/                (Messaging Service — port 3005)
│   └── notification/             (Notification Service — port 3006)
├── packages/
│   ├── shared-types/             (interfaces TypeScript partagées)
│   ├── shared-utils/             (fonctions utilitaires communes)
│   └── shared-db/                (helpers MySQL, migrations Prisma)
├── infra/
│   ├── docker-compose.yml        (dev local)
│   ├── docker-compose.prod.yml   (référence prod)
│   └── nginx/                    (config reverse proxy local)
├── .github/
│   └── workflows/
│       ├── ci.yml                (tests + lint sur PR)
│       └── deploy.yml            (deploy Netlify/Vercel sur merge main)
└── turbo.json                    (Turborepo — orchestration monorepo)
```

---

## 5. Infrastructure — Dev vs Prod

### Dev (Netlify + services locaux)

```
┌────────────────────────────────────────┐
│  Netlify                               │
│  - Nuxt 3 frontend (Vue.js)            │
│  - Server routes = gateway léger       │
└──────────────────┬─────────────────────┘
                   │
┌──────────────────▼─────────────────────┐
│  Local Docker Compose                  │
│  - 6 services Node.js                  │
│  - MySQL 8.0 (6 databases)             │
│  - Redis 7                             │
│  - MinIO (S3 local)                    │
└────────────────────────────────────────┘
```

### Prod (AWS)

```
┌─────────────────────────────────────────────────────────┐
│  AWS                                                    │
│                                                         │
│  Route 53 (DNS)                                         │
│       │                                                 │
│  CloudFront (CDN — assets statiques, images)            │
│       │                                                 │
│  ALB — Application Load Balancer                        │
│       │                                                 │
│  ECS Fargate (containers sans gestion de serveurs)      │
│  ┌──────┐ ┌────────┐ ┌─────┐ ┌───────┐ ┌──────┐ ┌────┐│
│  │ auth │ │dossier │ │ doc │ │paiem. │ │ msg  │ │notif││
│  └──────┘ └────────┘ └─────┘ └───────┘ └──────┘ └────┘│
│       │                                                 │
│  RDS MySQL (Multi-AZ pour la prod)                      │
│  ElastiCache Redis                                      │
│  S3 (documents + assets)                                │
│  SES (emails transactionnels)                           │
│  CloudWatch (logs + alertes)                            │
└─────────────────────────────────────────────────────────┘
```

**Pourquoi ECS Fargate et pas Kubernetes ?**
Fargate supprime la gestion des nodes (pas de EC2 à administrer). Pour 1 dev, c'est le bon compromis : scalabilité automatique sans ops overhead. Kubernetes sera pertinent à partir de 10+ services.

---

## 6. Sécurité

### Authentification & autorisation
```
- JWT access token (15 min) + refresh token httpOnly cookie (30 j)
- Rotation automatique des refresh tokens
- RBAC vérifié côté service (pas seulement côté gateway)
- Rate limiting : 100 req/min par IP, 1000 req/min par user authentifié
```

### Documents sensibles
```
- Upload direct S3 via presigned URLs (les fichiers ne transitent jamais par le serveur)
- Presigned URLs de téléchargement (expiration 15 min)
- Chiffrement S3 at-rest (AES-256)
- Accès documents vérifié à chaque requête (pas de liens publics)
```

### Base de données
```
- Connexions chiffrées SSL vers RDS
- Credentials via AWS Secrets Manager (jamais en dur dans le code)
- Backups automatiques RDS (rétention 7 jours)
- Accès RDS uniquement depuis le VPC privé (pas d'accès public)
```

### Communications inter-services
```
- Services dans un VPC privé (pas exposés sur Internet)
- Communication via internal DNS AWS
- mTLS entre services (à activer en prod via AWS Certificate Manager)
```

---

## 7. Variables d'environnement par service

```bash
# Communes à tous les services
NODE_ENV=production
SERVICE_NAME=auth-service
LOG_LEVEL=info
JWT_SECRET=<secrets_manager>
INTERNAL_API_KEY=<secrets_manager>   # pour les appels inter-services

# Auth Service
DATABASE_URL=mysql://...@rds-auth.../auth_db
REDIS_URL=redis://elasticache.../0
SENDGRID_API_KEY=<secrets_manager>
APP_URL=https://app.camerounada.com

# Document Service
AWS_S3_BUCKET=camerounada-documents-prod
AWS_REGION=eu-west-1
CLOUDINARY_URL=<dev_only>

# Payment Service
STRIPE_SECRET_KEY=<secrets_manager>
STRIPE_WEBHOOK_SECRET=<secrets_manager>
CINETPAY_API_KEY=<secrets_manager>
CINETPAY_SITE_ID=<secrets_manager>

# Notification Service
SENDGRID_API_KEY=<secrets_manager>
VAPID_PUBLIC_KEY=<secrets_manager>
VAPID_PRIVATE_KEY=<secrets_manager>
```

---

## 8. Plan de migration Dev → Prod

### Phase dev (Sprints 1–9 — Netlify + Docker local)
```
✓ Frontend Nuxt 3 déployé sur Netlify (automatique sur push main)
✓ Services tournent en local via Docker Compose
✓ Base MySQL locale via Docker
✓ S3 simulé par MinIO en local
✓ Emails via SendGrid en mode sandbox (pas d'envoi réel)
✓ Paiements via Stripe/CinetPay en mode test
```

### Bascule prod AWS (avant Sprint 10)
```
1. Provisionner RDS MySQL Multi-AZ
2. Provisionner ElastiCache Redis
3. Créer les buckets S3 + policies IAM
4. Créer les repositories ECR (images Docker)
5. Configurer ECS Fargate (task definitions, services)
6. Configurer ALB + certificat SSL (ACM)
7. Configurer CloudFront
8. Mettre en place CloudWatch dashboards + alertes
9. Migration données de test → prod
10. Tests de charge avant ouverture
```

---

## 9. Rôle de Claude Code dans cette architecture

Claude Code est particulièrement efficace sur les tâches suivantes dans ce projet :

```
GÉNÉRATION DE CODE BOILERPLATE
├── Scaffolding des 6 services (structure, routes, middleware)
├── Modèles Prisma/MySQL complets depuis les specs
├── Clients API TypeScript typés entre services
└── Composants Vue répétitifs (formulaires, tableaux, cards)

CONFIGURATION INFRA
├── docker-compose.yml complet avec tous les services
├── GitHub Actions CI/CD pipelines
├── ECS task definitions et service configs
└── Nginx reverse proxy configs

TÂCHES COMPLEXES PONCTUELLES
├── Implémentation chunked upload (tus.io)
├── Intégration CinetPay/Paystack (documentation souvent lacunaire)
├── Génération PDF (PDFKit — factures, reçus)
└── Algorithme de scoring prospect

DÉBOGAGE ET REVUE
├── Analyse des erreurs inter-services
├── Optimisation des requêtes MySQL
└── Review des politiques IAM AWS
```

**Conseil d'utilisation** : Donner à Claude Code les fichiers de specs (user stories + modèles de données) comme contexte avant chaque session. La qualité du code généré est directement proportionnelle à la précision du contexte fourni.

---

## 10. Stack récapitulatif

| Couche | Technologie | Justification |
|---|---|---|
| Frontend | Vue.js 3 + Nuxt 3 | SSR natif, Composition API, écosystème mature |
| API Gateway | Nuxt server routes (dev) / Kong (prod) | Simple en dev, scalable en prod |
| Services | Node.js + Express + TypeScript | Écosystème riche, Claude Code très performant dessus |
| ORM | Prisma | Migrations, typage TypeScript, support MySQL |
| Base de données | MySQL 8.0 (RDS Multi-AZ en prod) | Choix client respecté, RDS managé |
| Cache / Queue | Redis 7 (ElastiCache en prod) | Pub/sub messagerie + BullMQ notifications |
| Stockage fichiers | AWS S3 + CloudFront | Upload direct, CDN global, sécurité |
| Emails | SendGrid / Resend | Délivrabilité, sandbox dev, API simple |
| Paiements | Stripe + CinetPay | International + Mobile Money Afrique |
| Monorepo | Turborepo | Builds incrémentaux, partage de code entre services |
| Conteneurs | Docker + ECS Fargate | Pas de gestion de serveurs, scale auto |
| CI/CD | GitHub Actions + Netlify | Déploiement automatique, preview branches |
| Monitoring | CloudWatch + Sentry | Logs, alertes, tracking erreurs frontend |

---

*Document produit dans le cadre du projet Camerounada — MVP 6 mois*
*À compléter avec les ADR (Architecture Decision Records) au fil des sprints*
