# Briefing Claude Code — Projet Camerounada
> Document de référence à fournir au début de chaque session Claude Code
> Version : MVP 6 mois — Sprint 1 à 12
> Dernière mise à jour : mai 2026

---

## Instructions d'utilisation

**Colle ce document intégralement au début de chaque session Claude Code**, avant toute demande de génération. Plus le contexte est précis, plus le code généré sera conforme à l'architecture réelle du projet.

Pour chaque tâche, précise également le sprint et le module concerné. Exemple :
> "Sprint 1 — Module Auth — génère le schéma Prisma complet pour les tables auth_*"

---

## 1. Présentation du projet

Camerounada est une plateforme de mobilité internationale qui accompagne des candidats souhaitant immigrer, étudier ou travailler au Canada. L'application remplace des processus manuels (WhatsApp, fichiers éparpillés) par une plateforme digitale centralisée.

**Deux types d'utilisateurs principaux :**
- Clients et prospects — suivent leur dossier, uploadent des documents, paient, communiquent avec leur conseiller
- Staff interne — conseillers, analystes, support, comptabilité, admin — gèrent les dossiers, valident les documents, suivent les paiements

---

## 2. Stack technique — à respecter impérativement

### Frontend
```
Framework   : Vue.js 3 + Nuxt 4
Config      : future: { compatibilityVersion: 4 } dans nuxt.config.ts
Structure   : répertoire app/ (Nuxt 4 standard)
Styling     : CSS natif avec variables CSS (pas de Tailwind, pas de styled-components)
State       : Pinia
HTTP        : useFetch / useAsyncData (Nuxt natifs)
Socket      : tus-js-client (upload), socket.io-client (messagerie)
2 apps      : apps/client/ et apps/staff/ — deux Nuxt séparés
```

### Backend
```
Runtime     : Node.js 20 LTS
Framework   : Express.js + TypeScript
ORM         : Prisma (MySQL)
Auth        : JWT (jsonwebtoken) — access token 15min + refresh token 30j httpOnly
MFA         : otplib (TOTP) + crypto natif (Email OTP)
Upload      : @tus/server + @tus/s3-store
Storage     : OCI Object Storage (API compatible S3 — @aws-sdk/client-s3)
Realtime    : Socket.io
Queue       : BullMQ + Redis (ioredis)
Email       : @sendgrid/mail
PDF         : pdfkit
Passwords   : bcrypt
Validation  : zod
Logging     : pino
```

### Infrastructure
```
Dev         : Docker Compose (MySQL 8, Redis 7, MinIO, tusd)
Prod        : Oracle Cloud Infrastructure (OCI)
              - VM Compute (PM2 cluster)
              - OCI MySQL HeatWave
              - OCI Object Storage
              - OCI Load Balancer
              - Certbot + Let's Encrypt
Process     : PM2 (ecosystem.config.js)
Reverse proxy : Nginx
CI/CD       : GitHub Actions → SSH deploy OCI
Monorepo    : Turborepo
```

### Base de données
```
Moteur      : MySQL 8.0
ORM         : Prisma avec provider "mysql"
1 seule base avec préfixes par domaine :
  auth_*      → authentification, rôles, permissions, sessions, MFA
  dos_*       → dossiers, étapes, historique, tâches
  doc_*       → documents, validations
  pay_*       → factures, paiements, reçus
  msg_*       → conversations, messages
  notif_*     → notifications, préférences
  pro_*       → questionnaires prospects, scores
  apt_*       → créneaux, rendez-vous
```

---

## 3. Structure du monorepo

```
camerounada/
├── apps/
│   ├── client/               ← Nuxt 4 — espace client + prospect
│   │   ├── app/
│   │   │   ├── pages/
│   │   │   ├── composables/
│   │   │   ├── components/
│   │   │   └── middleware/
│   │   └── nuxt.config.ts
│   └── staff/                ← Nuxt 4 — espace staff + admin
│       ├── app/
│       │   ├── pages/
│       │   ├── composables/
│       │   ├── components/
│       │   └── middleware/
│       └── nuxt.config.ts
├── backend/                  ← Node.js Express — API unifiée
│   ├── src/
│   │   ├── app.ts
│   │   ├── middleware/
│   │   │   ├── auth.ts       ← vérification JWT
│   │   │   ├── rbac.ts       ← RBAC dynamique (Redis cache)
│   │   │   ├── totp.ts       ← vérification étape MFA
│   │   │   └── rateLimit.ts
│   │   ├── modules/
│   │   │   ├── auth/
│   │   │   ├── users/
│   │   │   ├── dossiers/
│   │   │   ├── documents/
│   │   │   ├── payments/
│   │   │   ├── messaging/
│   │   │   ├── notifications/
│   │   │   ├── appointments/
│   │   │   ├── scoring/
│   │   │   └── support/
│   │   ├── config/
│   │   │   ├── database.ts   ← Prisma client
│   │   │   ├── redis.ts      ← ioredis
│   │   │   ├── s3.ts         ← OCI Object Storage (S3 SDK)
│   │   │   └── env.ts        ← zod env validation
│   │   └── utils/
│   │       ├── pdf.ts
│   │       ├── email.ts
│   │       └── socket.ts
│   └── prisma/
│       └── schema.prisma
├── packages/
│   ├── shared-types/         ← interfaces TypeScript partagées
│   └── shared-utils/         ← fonctions utilitaires communes
├── infra/
│   ├── docker-compose.yml
│   ├── nginx/
│   └── ecosystem.config.js   ← PM2
├── .github/workflows/
│   ├── ci.yml
│   └── deploy.yml
└── turbo.json
```

---

## 4. Schéma de base de données complet

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
}

// ─── AUTH ───────────────────────────────────────────────

model AuthUser {
  id                   Int       @id @default(autoincrement())
  email                String    @unique
  passwordHash         String
  roleId               Int
  isVerified           Boolean   @default(false)
  verificationToken    String?
  // TOTP
  totpSecret           String?
  totpEnabled          Boolean   @default(false)
  totpEnabledAt        DateTime?
  // Email OTP
  mfaEmailEnabled      Boolean   @default(false)
  mfaEmailEnabledAt    DateTime?
  mfaPreferredMethod   String?   @default("totp")
  createdAt            DateTime  @default(now())
  updatedAt            DateTime  @updatedAt

  role                 AuthRole              @relation(fields: [roleId], references: [id])
  sessions             AuthSession[]
  refreshTokens        AuthRefreshToken[]
  totpBackupCodes      AuthTotpBackupCode[]

  @@map("auth_users")
}

model AuthRole {
  id          Int      @id @default(autoincrement())
  name        String   @unique
  label       String
  isSystem    Boolean  @default(false)
  createdAt   DateTime @default(now())

  users       AuthUser[]
  permissions AuthRolePermission[]

  @@map("auth_roles")
}

model AuthPermission {
  id          Int    @id @default(autoincrement())
  resource    String
  action      String
  description String?

  roles       AuthRolePermission[]

  @@unique([resource, action])
  @@map("auth_permissions")
}

model AuthRolePermission {
  roleId       Int
  permissionId Int

  role         AuthRole       @relation(fields: [roleId], references: [id])
  permission   AuthPermission @relation(fields: [permissionId], references: [id])

  @@id([roleId, permissionId])
  @@map("auth_role_permissions")
}

model AuthSession {
  id        Int      @id @default(autoincrement())
  userId    Int
  tokenHash String
  expiresAt DateTime
  createdAt DateTime @default(now())

  user      AuthUser @relation(fields: [userId], references: [id])

  @@map("auth_sessions")
}

model AuthRefreshToken {
  id        Int      @id @default(autoincrement())
  userId    Int
  tokenHash String   @unique
  expiresAt DateTime
  createdAt DateTime @default(now())

  user      AuthUser @relation(fields: [userId], references: [id])

  @@map("auth_refresh_tokens")
}

model AuthTotpBackupCode {
  id        Int       @id @default(autoincrement())
  userId    Int
  codeHash  String
  used      Boolean   @default(false)
  usedAt    DateTime?
  createdAt DateTime  @default(now())

  user      AuthUser  @relation(fields: [userId], references: [id])

  @@map("auth_totp_backup_codes")
}

// ─── DOSSIERS ───────────────────────────────────────────

model DosDossier {
  id           Int      @id @default(autoincrement())
  clientId     Int
  conseilerId  Int?
  analysteId   Int?
  type         String   // etudes | travail | rp | visiteur | coaching
  status       String   @default("en_attente")
  currentStep  Int      @default(1)
  metadata     Json?
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  steps        DosDossierStep[]
  history      DosDossierHistory[]
  tasks        DosTask[]
  documents    DocDocument[]
  invoices     PayInvoice[]
  conversations MsgConversation[]

  @@map("dos_dossiers")
}

model DosDossierStep {
  id          Int       @id @default(autoincrement())
  dossierId   Int
  stepName    String
  stepOrder   Int
  status      String    @default("pending")
  completedAt DateTime?
  completedBy Int?

  dossier     DosDossier @relation(fields: [dossierId], references: [id])

  @@map("dos_steps")
}

model DosDossierHistory {
  id          Int      @id @default(autoincrement())
  dossierId   Int
  action      String
  oldValue    String?
  newValue    String?
  performedBy Int
  isInternal  Boolean  @default(false)
  createdAt   DateTime @default(now())

  dossier     DosDossier @relation(fields: [dossierId], references: [id])

  @@map("dos_history")
}

model DosTask {
  id          Int       @id @default(autoincrement())
  dossierId   Int
  title       String
  assignedTo  Int
  dueDate     DateTime?
  completed   Boolean   @default(false)
  completedAt DateTime?
  createdBy   Int
  createdAt   DateTime  @default(now())

  dossier     DosDossier @relation(fields: [dossierId], references: [id])

  @@map("dos_tasks")
}

// ─── DOCUMENTS ──────────────────────────────────────────

model DocDocument {
  id          Int      @id @default(autoincrement())
  dossierId   Int
  clientId    Int
  name        String
  type        String
  ociKey      String?
  ociBucket   String?
  tusId       String?
  fileSize    Int?
  mimeType    String?
  status      String   @default("pending")
  uploadedAt  DateTime @default(now())

  dossier     DosDossier          @relation(fields: [dossierId], references: [id])
  validations DocValidation[]

  @@map("doc_documents")
}

model DocValidation {
  id          Int      @id @default(autoincrement())
  documentId  Int
  validatorId Int
  action      String   // validated | rejected
  reason      String?
  createdAt   DateTime @default(now())

  document    DocDocument @relation(fields: [documentId], references: [id])

  @@map("doc_validations")
}

// ─── PAIEMENTS ──────────────────────────────────────────

model PayInvoice {
  id          Int      @id @default(autoincrement())
  dossierId   Int
  clientId    Int
  totalAmount Decimal  @db.Decimal(10, 2)
  currency    String   @default("EUR")
  status      String   @default("draft")
  dueDate     DateTime?
  sentAt      DateTime?
  paidAt      DateTime?
  createdAt   DateTime @default(now())

  dossier     DosDossier   @relation(fields: [dossierId], references: [id])
  items       PayInvoiceItem[]
  payments    PayPayment[]

  @@map("pay_invoices")
}

model PayInvoiceItem {
  id          Int     @id @default(autoincrement())
  invoiceId   Int
  label       String
  amount      Decimal @db.Decimal(10, 2)
  dueDate     DateTime?

  invoice     PayInvoice @relation(fields: [invoiceId], references: [id])

  @@map("pay_invoice_items")
}

model PayPayment {
  id          Int      @id @default(autoincrement())
  invoiceId   Int
  amount      Decimal  @db.Decimal(10, 2)
  currency    String
  method      String   // card | mtn_money | orange_money
  gateway     String   // stripe | cinetpay
  gatewayRef  String?
  status      String   @default("pending")
  metadata    Json?
  createdAt   DateTime @default(now())

  invoice     PayInvoice @relation(fields: [invoiceId], references: [id])

  @@map("pay_payments")
}

// ─── MESSAGING ──────────────────────────────────────────

model MsgConversation {
  id        Int      @id @default(autoincrement())
  dossierId Int
  type      String   @default("client_staff") // client_staff | internal
  createdAt DateTime @default(now())

  dossier   DosDossier @relation(fields: [dossierId], references: [id])
  messages  MsgMessage[]

  @@map("msg_conversations")
}

model MsgMessage {
  id             Int       @id @default(autoincrement())
  conversationId Int
  senderId       Int
  content        String    @db.Text
  isInternal     Boolean   @default(false)
  status         String    @default("sent")
  sentAt         DateTime  @default(now())
  deliveredAt    DateTime?
  readAt         DateTime?

  conversation   MsgConversation @relation(fields: [conversationId], references: [id])
  attachments    MsgAttachment[]

  @@map("msg_messages")
}

model MsgAttachment {
  id        Int    @id @default(autoincrement())
  messageId Int
  ociKey    String
  name      String
  mimeType  String
  size      Int

  message   MsgMessage @relation(fields: [messageId], references: [id])

  @@map("msg_attachments")
}

// ─── NOTIFICATIONS ──────────────────────────────────────

model NotifNotification {
  id        Int      @id @default(autoincrement())
  userId    Int
  type      String
  title     String
  body      String
  data      Json?
  read      Boolean  @default(false)
  createdAt DateTime @default(now())

  @@map("notif_notifications")
}

model NotifPreference {
  id        Int     @id @default(autoincrement())
  userId    Int     @unique
  dossier   Boolean @default(true)
  documents Boolean @default(true)
  payments  Boolean @default(true)
  messages  Boolean @default(true)
  meetings  Boolean @default(true)

  @@map("notif_preferences")
}

// ─── PROSPECTS ──────────────────────────────────────────

model ProQuestionnaire {
  id        Int      @id @default(autoincrement())
  userId    Int?
  responses Json
  score     Int?
  programs  Json?
  completed Boolean  @default(false)
  createdAt DateTime @default(now())

  @@map("pro_questionnaires")
}

// ─── RENDEZ-VOUS ────────────────────────────────────────

model AptSlot {
  id           Int      @id @default(autoincrement())
  conseilerId  Int
  startsAt     DateTime
  endsAt       DateTime
  isAvailable  Boolean  @default(true)

  appointments AptAppointment[]

  @@map("apt_slots")
}

model AptAppointment {
  id          Int      @id @default(autoincrement())
  slotId      Int
  clientId    Int
  meetLink    String?
  status      String   @default("confirmed")
  reminderAt  DateTime?
  createdAt   DateTime @default(now())

  slot        AptSlot @relation(fields: [slotId], references: [id])

  @@map("apt_appointments")
}
```

---

## 5. Variables d'environnement

```env
# backend/.env

NODE_ENV=development
PORT=4000

# Base de données
DATABASE_URL="mysql://root:password@localhost:3306/camerounada_dev"

# Redis
REDIS_URL="redis://localhost:6379"

# JWT
JWT_SECRET="your-jwt-secret-min-32-chars"
JWT_ACCESS_EXPIRES="15m"
JWT_REFRESH_EXPIRES="30d"

# OCI Object Storage (compatible S3)
OCI_S3_ENDPOINT="https://<namespace>.compat.objectstorage.<region>.oraclecloud.com"
OCI_ACCESS_KEY="your-oci-access-key"
OCI_SECRET_KEY="your-oci-secret-key"
OCI_BUCKET_NAME="camerounada-documents-dev"
OCI_REGION="eu-frankfurt-1"

# Email
SENDGRID_API_KEY="SG.your-key"
SENDGRID_FROM="noreply@camerounada.com"

# Paiements
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
CINETPAY_API_KEY="your-cinetpay-key"
CINETPAY_SITE_ID="your-site-id"

# App URLs (CORS)
CLIENT_URL="http://localhost:3000"
STAFF_URL="http://localhost:3001"

# TOTP
TOTP_ISSUER="Camerounada"

# VAPID (Web Push)
VAPID_PUBLIC_KEY="your-vapid-public-key"
VAPID_PRIVATE_KEY="your-vapid-private-key"
```

---

## 6. Architecture des routes backend

```
Routes publiques
POST  /api/auth/register
POST  /api/auth/login
POST  /api/auth/login/totp
POST  /api/auth/login/mfa-email
POST  /api/auth/forgot-password
POST  /api/auth/reset-password
POST  /api/auth/refresh-token
GET   /api/resources

Routes TOTP/MFA (authentifié)
POST  /api/auth/totp/setup
POST  /api/auth/totp/verify
DELETE /api/auth/totp/disable
GET   /api/auth/totp/backup-codes
POST  /api/auth/mfa-email/setup
POST  /api/auth/mfa-email/send

Routes client (rôle: client)
GET   /api/client/dashboard
GET   /api/client/dossier
GET   /api/client/documents
POST  /api/client/documents/upload      ← tus.io session
PATCH /api/client/documents/upload/:id  ← tus.io chunks
GET   /api/client/payments
POST  /api/client/payments/:id/pay
GET   /api/client/messages
POST  /api/client/messages
GET   /api/client/appointments
POST  /api/client/appointments
POST  /api/client/support/tickets
GET   /api/client/notifications

Routes prospect (rôle: prospect)
GET   /api/prospect/questionnaire
POST  /api/prospect/score
POST  /api/prospect/appointments

Routes staff (rôles: conseiller | analyste | support | comptabilité)
GET   /api/staff/crm/pipeline
GET   /api/staff/crm/leads
POST  /api/staff/crm/leads/:id/convert
GET   /api/staff/dossiers
GET   /api/staff/dossiers/:id
PUT   /api/staff/dossiers/:id/status
POST  /api/staff/dossiers/:id/tasks
GET   /api/staff/documents/queue
PUT   /api/staff/documents/:id/validate
PUT   /api/staff/documents/:id/reject
GET   /api/staff/payments/invoices
POST  /api/staff/payments/invoices
PUT   /api/staff/support/tickets/:id

Routes admin (rôle: admin)
GET   /api/admin/users
POST  /api/admin/users
PUT   /api/admin/users/:id/role
GET   /api/admin/roles
POST  /api/admin/roles
PUT   /api/admin/roles/:id
DELETE /api/admin/roles/:id
GET   /api/admin/roles/:id/permissions
PUT   /api/admin/roles/:id/permissions
GET   /api/admin/permissions
GET   /api/admin/analytics
GET   /api/admin/system/logs

Upload tus.io
POST  /api/files/upload
PATCH /api/files/upload/*
```

---

## 7. Patterns de code à respecter

### Structure d'un module backend
```typescript
// backend/src/modules/{module}/
├── {module}.router.ts      ← routes Express
├── {module}.controller.ts  ← handlers HTTP (req/res)
├── {module}.service.ts     ← logique métier
└── {module}.types.ts       ← types/interfaces Zod
```

### Pattern controller
```typescript
// Toujours : validation zod → service → réponse typée
export const createDossier = async (req: Request, res: Response) => {
  const body = CreateDossierSchema.parse(req.body)
  const dossier = await dossierService.create(body, req.user.id)
  res.status(201).json({ success: true, data: dossier })
}
```

### Pattern middleware RBAC
```typescript
// Chargement dynamique depuis Redis (cache 5 min)
// Invalidation immédiate sur modification de rôle
export const requirePermission = (permission: string) =>
  async (req: Request, res: Response, next: NextFunction) => {
    const permissions = await getRolePermissions(req.user.roleId)
    if (!hasPermission(permissions, permission)) {
      return res.status(403).json({ error: 'Accès refusé' })
    }
    next()
  }
```

### Pattern upload tus.io
```typescript
// @tus/server + @tus/s3-store vers OCI Object Storage
// onUploadCreate : vérifier JWT
// onUploadFinish : créer entrée DocDocument en base + notifier
```

### Pattern composable Nuxt 4
```typescript
// apps/client/app/composables/useApi.ts
// Utiliser useFetch avec baseURL vers /api/client/*
// Gérer les erreurs globalement via intercepteur
// Stocker le token dans httpOnly cookie (géré par le backend)
```

### Pattern Socket.io (messagerie)
```typescript
// Backend : rooms par conversation conv:{id}
// Auth via middleware socket.io (JWT dans handshake.auth.token)
// Events : message:send, message:new, message:read, messages:sync
// Reconnexion : émettre messages:sync avec lastSyncAt à la reconnexion
```

---

## 8. Docker Compose (dev local)

```yaml
version: '3.8'
services:
  mysql:
    image: mysql:8.0
    environment:
      MYSQL_ROOT_PASSWORD: password
      MYSQL_DATABASE: camerounada_dev
    ports:
      - "3306:3306"
    volumes:
      - mysql_data:/var/lib/mysql

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  minio:
    image: minio/minio
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin
    ports:
      - "9000:9000"
      - "9001:9001"
    volumes:
      - minio_data:/data

  tusd:
    image: tusproject/tusd
    command: -upload-dir /data -behind-proxy
    ports:
      - "1080:1080"
    volumes:
      - tus_data:/data

volumes:
  mysql_data:
  minio_data:
  tus_data:
```

---

## 9. Planning des sprints — ordre de génération

Respecter cet ordre pour les dépendances entre modules.

| Sprint | Module | Priorité | Dépend de |
|---|---|---|---|
| S1 | Infra + Docker Compose | Critique | — |
| S1 | Prisma schema complet | Critique | — |
| S1 | Auth — register, login, JWT, RBAC | Critique | Prisma |
| S1 | Auth — rôles RBAC dynamique | Critique | Auth |
| S2 | Dossiers — CRUD + étapes | Haute | Auth |
| S2 | Dashboard client (agrégation) | Haute | Dossiers |
| S3 | Documents — tus.io + OCI | Haute | Dossiers |
| S4 | Documents — validation staff | Haute | Documents |
| S4 | Notifications — email + push | Haute | Auth |
| S5 | CRM pipeline + tâches | Haute | Dossiers |
| S6 | Paiements — factures + PDF | Moyenne | Dossiers |
| S7 | Paiements — Stripe + CinetPay | Haute | Paiements |
| S8 | Messagerie — Socket.io | Haute | Auth |
| S9 | Rendez-vous + Tickets | Moyenne | Auth |
| S10 | Scoring + Questionnaire | Moyenne | Auth |
| S11 | Leads + Conversion prospect | Moyenne | Scoring, Dossiers |
| S12 | Contenu éducatif + finitions | Basse | — |

---

## 10. Catalogue des permissions RBAC

```
dossiers:read, dossiers:create, dossiers:update, dossiers:delete
documents:read, documents:upload, documents:validate, documents:delete
payments:read, payments:create, payments:update, payments:refund
messaging:read, messaging:send, messaging:delete
support:read, support:assign, support:resolve
crm:read, crm:leads:read, crm:leads:convert
analytics:read, analytics:export
users:read, users:create, users:update, users:delete, users:roles:assign
roles:read, roles:create, roles:update, roles:delete, roles:permissions:edit
system:config, system:logs, system:mfa:enforce
client:dashboard, client:dossier, client:documents, client:payments, client:messaging
prospect:questionnaire, prospect:results, prospect:booking
```

**Rôles par défaut à seeder :**
```
super_admin   → toutes les permissions (*)
admin         → users:*, roles:*, system:*, analytics:*, dossiers:*, documents:*, payments:*, messaging:*, support:*, crm:*
conseiller    → dossiers:*, crm:*, messaging:read, messaging:send, documents:read, support:read, analytics:read
analyste      → dossiers:read, dossiers:update, documents:*, messaging:read, support:read
support       → support:*, messaging:*, dossiers:read, documents:read
comptabilite  → payments:*, analytics:read, users:read
client        → client:*
prospect      → prospect:*
```

---

## 11. Contraintes UX / performance importantes

```
Marché cible        : Cameroun + Afrique de l'Ouest
Connexion           : Souvent lente (3G, coupures fréquentes)
Appareils           : Android entrée de gamme (Chrome mobile)
Upload documents    : Via tus.io avec reprise automatique — chunks 5 Mo max
Images              : Toujours compressées (WebP/AVIF)
Chargement          : Skeleton screens obligatoires pendant les requêtes
Pagination          : Toujours côté serveur — jamais de listes infinies
PWA                 : Service Worker actif — cache des assets statiques
Notifications       : Toujours email EN PLUS du push (pas de push seul)
Textes              : Français uniquement pour le MVP
```

---

## 12. Exemples de prompts efficaces pour Claude Code

Voici des formulations optimales à utiliser :

**Génération du schéma et infra :**
> "En utilisant le schéma Prisma de ce briefing, génère le fichier `prisma/schema.prisma` complet et le `docker-compose.yml` de dev."

**Module auth :**
> "Génère le module auth complet (router, controller, service) avec : register, login avec TOTP optionnel, refresh token, middleware JWT et middleware RBAC dynamique avec cache Redis 5 min."

**Module documents avec tus.io :**
> "Génère le serveur tus.io intégré à Express avec `@tus/server` + `@tus/s3-store` vers OCI Object Storage. Le hook `onUploadCreate` doit vérifier le JWT. Le hook `onUploadFinish` doit créer une entrée `DocDocument` en base Prisma et envoyer une notification."

**Composable upload Nuxt 4 :**
> "Génère le composable `useUpload.ts` pour Nuxt 4 qui utilise `tus-js-client` avec : chunks 5 Mo, retryDelays [0, 1000, 3000, 5000], reprise via findPreviousUploads(), et une ref de progression en temps réel."

**Scoring prospect :**
> "Génère le service de scoring `scoring.service.ts` qui calcule un score sur 100 à partir des réponses du questionnaire prospect avec les pondérations : études 25%, expérience 20%, langue 25%, finances 15%, âge 10%, famille 5%. Retourne aussi le programme recommandé et un breakdown par critère."

**Dashboard client agrégé :**
> "Génère le endpoint GET /api/client/dashboard qui retourne en une seule requête : le dossier actif avec étapes, les 3 derniers documents avec statuts, les paiements en attente, le prochain rendez-vous et les notifications non lues. Optimise pour minimiser les requêtes MySQL."

---

*Ce document est la source de vérité pour toutes les sessions Claude Code du projet Camerounada.*
*À mettre à jour à chaque changement d'architecture décidé en équipe.*
