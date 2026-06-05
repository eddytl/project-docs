# Architecture Technique MVP — Camerounada
> Stack : 2 Frontends + 1 Backend unifié — Vue.js 3 / Nuxt 4 + Node.js + MySQL
> Dev : 1 développeur full-stack + Claude Code
> Hébergement : Oracle Cloud Infrastructure (prod)
> Cible : Web responsive, optimisé connexions faibles, marché africain

---

## 1. Vue d'ensemble

```
┌─────────────────────┐     ┌─────────────────────┐
│   App Client        │     │   App Staff / Admin  │
│   Nuxt 4            │     │   Nuxt 4             │
│                     │     │                      │
│   - Prospects       │     │   - Conseillers      │
│   - Clients actifs  │     │   - Analystes        │
│                     │     │   - Support          │
│                     │     │   - Comptabilité     │
│                     │     │   - Admin            │
└────────┬────────────┘     └──────────┬───────────┘
         │  HTTPS                      │  HTTPS
         │                             │
         └──────────────┬──────────────┘
                        ▼
         ┌──────────────────────────┐
         │       Backend API        │
         │    Node.js + Express     │
         │                          │
         │  Auth · Dossiers         │
         │  Documents · Paiements   │
         │  Messaging · Notifs      │
         │  Scoring · Rendez-vous   │
         └──────────┬───────────────┘
                    │
         ┌──────────▼───────────────┐
         │  MySQL (OCI)  │  Redis (OCI)  │  tus.io + OCI Object Storage │
         └──────────────────────────┘
```

**Ce que ça change par rapport au BFF :**

| BFF (v2) | Backend unifié (v3) |
|---|---|
| 3 apps Node.js | 1 seule app Node.js |
| Communication BFF → Core API | Appels directs en interne |
| ~5j d'infra | ~2j d'infra |
| Duplication de logique entre BFF | Logique centralisée, zéro duplication |
| 3 containers en prod | 1 container en prod |

---

## 2. Backend unifié — `backend/`

### Structure interne

```
backend/
├── src/
│   ├── app.ts                  -- entry point Express
│   ├── middleware/
│   │   ├── auth.ts             -- vérification JWT
│   │   ├── rbac.ts             -- contrôle d'accès par rôle
│   │   ├── totp.ts             -- vérification étape MFA
│   │   └── rateLimit.ts        -- protection anti-abus
│   ├── modules/
│   │   ├── auth/
│   │   │   ├── auth.router.ts
│   │   │   ├── auth.service.ts
│   │   │   ├── auth.controller.ts
│   │   │   └── totp.service.ts -- génération secret, QR code, vérification OTP
│   │   ├── users/
│   │   ├── dossiers/
│   │   ├── documents/
│   │   ├── payments/
│   │   ├── messaging/
│   │   ├── notifications/
│   │   ├── appointments/
│   │   ├── scoring/
│   │   └── support/
│   ├── config/
│   │   ├── database.ts         -- connexion Prisma/MySQL
│   │   ├── redis.ts
│   │   ├── s3.ts
│   │   └── env.ts
│   └── utils/
│       ├── pdf.ts              -- génération PDF (PDFKit)
│       ├── email.ts            -- envoi emails (SendGrid)
│       └── socket.ts           -- WebSocket (Socket.io)
├── prisma/
│   └── schema.prisma           -- schéma base de données
├── Dockerfile
└── package.json
```

### Routes par espace

Le RBAC est géré par un middleware central — un seul backend, des accès différenciés.

```
Routes publiques (non authentifiées)
POST  /api/auth/register
POST  /api/auth/login
POST  /api/auth/login/totp        -- étape 2 : vérification code TOTP
POST  /api/auth/forgot-password
POST  /api/auth/reset-password
GET   /api/resources              -- contenu éducatif public

Routes TOTP (authentifié, avant activation MFA)
POST  /api/auth/totp/setup        -- génère secret + QR code (otpauth://)
POST  /api/auth/totp/verify       -- vérifie le 1er code pour activer
DELETE /api/auth/totp/disable     -- désactive MFA (admin ou user lui-même)
GET   /api/auth/totp/backup-codes -- génère 8 codes de secours usage unique

Routes MFA Email (authentifié)
POST  /api/auth/mfa-email/setup   -- active MFA email sur le compte
POST  /api/auth/mfa-email/send    -- envoie un code OTP par email
POST  /api/auth/login/mfa-email   -- étape 2 : vérification code email

Routes client (rôle: client)
GET   /api/client/dashboard       -- dashboard agrégé
GET   /api/client/dossier
GET   /api/client/documents
POST  /api/client/documents/upload   -- initie une session tus.io
PATCH /api/client/documents/upload/:id -- envoie un chunk (protocole tus)
GET   /api/client/payments
POST  /api/client/messages
GET   /api/client/messages
GET   /api/client/appointments
POST  /api/client/appointments
POST  /api/client/support/tickets

Routes prospect (rôle: prospect)
GET   /api/prospect/questionnaire
POST  /api/prospect/score
POST  /api/prospect/appointments  -- réservation consultation

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
GET   /api/admin/analytics
GET   /api/admin/system/logs

Routes gestion des rôles (permission: roles:*)
GET    /api/admin/roles                        -- liste tous les rôles
POST   /api/admin/roles                        -- créer un nouveau rôle
PUT    /api/admin/roles/:id                    -- renommer / modifier un rôle
DELETE /api/admin/roles/:id                    -- supprimer un rôle (si non utilisé)
GET    /api/admin/roles/:id/permissions        -- permissions affectées à un rôle
PUT    /api/admin/roles/:id/permissions        -- mettre à jour les permissions d'un rôle
GET    /api/admin/permissions                  -- catalogue complet des permissions
```

### Middleware RBAC dynamique

Les rôles et leurs permissions ne sont **pas codés en dur** — ils sont stockés en base et chargés en mémoire via Redis. L'admin peut créer des rôles et leur affecter n'importe quelle combinaison de permissions existantes depuis l'interface.

```typescript
// rbac.ts — chargement dynamique depuis Redis
export const requirePermission = (permission: string) =>
  async (req, res, next) => {
    // 1. Récupérer les permissions du rôle depuis Redis (cache 5 min)
    const permissions = await getRolePermissions(req.user.role_id)
    // 2. Vérifier la permission requise (support wildcard : staff:* couvre staff:read)
    if (!hasPermission(permissions, permission)) {
      return res.status(403).json({ error: 'Accès refusé' })
    }
    next()
  }

// Exemple d'usage sur une route
router.put('/dossiers/:id/status',
  requirePermission('dossiers:update'),
  dossiersController.updateStatus
)
```

### Catalogue de permissions (fixes — seul l'admin affecte, pas crée)

```
Ressource       Permission              Description
─────────────────────────────────────────────────────────────────
dossiers        dossiers:read           Voir les dossiers
                dossiers:create         Créer un dossier
                dossiers:update         Modifier statut / étapes
                dossiers:delete         Supprimer un dossier

documents       documents:read          Voir les documents
                documents:upload        Uploader un document
                documents:validate      Valider / rejeter
                documents:delete        Supprimer un document

paiements       payments:read           Voir les factures
                payments:create         Créer une facture
                payments:update         Modifier une facture
                payments:refund         Émettre un remboursement

messagerie      messaging:read          Lire les messages
                messaging:send          Envoyer un message
                messaging:delete        Supprimer un message

support         support:read            Voir les tickets
                support:assign          Assigner un ticket
                support:resolve         Clôturer un ticket

crm             crm:read                Voir le pipeline
                crm:leads:read          Voir les prospects
                crm:leads:convert       Convertir prospect → client

analytics       analytics:read          Voir les KPIs
                analytics:export        Exporter les données

users           users:read              Voir les utilisateurs
                users:create            Créer un utilisateur
                users:update            Modifier un utilisateur
                users:delete            Supprimer un utilisateur
                users:roles:assign      Affecter un rôle

roles           roles:read              Voir les rôles
                roles:create            Créer un rôle
                roles:update            Modifier un rôle
                roles:delete            Supprimer un rôle
                roles:permissions:edit  Affecter des permissions à un rôle

system          system:config           Accès aux paramètres système
                system:logs             Accès aux logs d'audit
                system:mfa:enforce      Forcer le MFA sur un rôle

client          client:dashboard        Accès dashboard client
                client:dossier          Accès dossier client
                client:documents        Accès documents client
                client:payments         Accès paiements client
                client:messaging        Accès messagerie client

prospect        prospect:questionnaire  Accès questionnaire
                prospect:results        Voir ses résultats
                prospect:booking        Réserver une consultation
```

### Rôles par défaut (pré-chargés au démarrage)

Ces rôles sont créés lors du seed initial. L'admin peut les modifier ou en créer de nouveaux.

```
Rôle            Permissions affectées par défaut
──────────────────────────────────────────────────────────────────
super_admin     Toutes les permissions (*)
admin           users:*, roles:*, system:*, analytics:*, dossiers:*,
                documents:*, payments:*, messaging:*, support:*, crm:*
conseiller      dossiers:*, crm:*, messaging:read, messaging:send,
                documents:read, support:read, analytics:read
analyste        dossiers:read, dossiers:update, documents:*,
                messaging:read, support:read
support         support:*, messaging:*, dossiers:read, documents:read
comptabilite    payments:*, analytics:read, users:read
client          client:*
prospect        prospect:*
```

---

## 3. Frontend — 2 applications Nuxt 4

### App Client — `apps/client/`

```
app/                           -- répertoire app/ (nouveau standard Nuxt 4)
├── pages/
│   ├── index.vue              -- landing prospect
│   ├── auth/
│   │   ├── login.vue
│   │   └── register.vue
│   ├── prospect/
│   │   ├── questionnaire.vue  -- formulaire multi-étapes
│   │   └── resultats.vue      -- score + recommandations
│   ├── dashboard/index.vue    -- vue principale client
│   ├── dossier/index.vue
│   ├── documents/index.vue
│   ├── paiements/index.vue
│   ├── messages/index.vue
│   ├── rendez-vous/index.vue
│   ├── support/index.vue
│   └── ressources/index.vue
├── composables/
│   ├── useApi.ts              -- client HTTP vers /api/client/*
│   ├── useAuth.ts
│   ├── useUpload.ts           -- upload tus.io (chunked, reprise auto, progress)
│   └── useSocket.ts           -- messagerie temps réel
└── middleware/
    └── auth.ts                -- redirige si non connecté
```

### App Staff — `apps/staff/`

```
app/                           -- répertoire app/ (nouveau standard Nuxt 4)
├── pages/
│   ├── auth/login.vue
│   ├── crm/
│   │   ├── pipeline.vue
│   │   └── leads.vue
│   ├── dossiers/
│   │   ├── index.vue
│   │   └── [id].vue
│   ├── documents/validation.vue
│   ├── paiements/
│   │   ├── factures.vue
│   │   └── suivi.vue
│   ├── support/tickets.vue
│   ├── calendrier/index.vue
│   └── admin/
│       ├── utilisateurs.vue
│       └── parametres.vue
├── composables/
│   ├── useApi.ts              -- client HTTP vers /api/staff/*
│   ├── useAuth.ts
│   └── useCRM.ts
└── middleware/
    └── auth.ts                -- vérifie rôle staff
```

---

## 4. Structure du projet

```
camerounada/
├── apps/
│   ├── client/                (Nuxt 4 — espace client + prospect)
│   └── staff/                 (Nuxt 4 — espace staff + admin)
├── backend/                   (Node.js + Express — API unifiée)
├── packages/
│   ├── shared-types/          (interfaces TypeScript partagées)
│   └── shared-utils/          (fonctions utilitaires communes)
├── infra/
│   └── docker-compose.yml
├── .github/
│   └── workflows/
│       ├── ci.yml
│       └── deploy.yml
└── turbo.json
```

---

## 5. Base de données — 1 MySQL, préfixes par domaine

```sql
auth_users, auth_roles, auth_permissions,
auth_role_permissions, auth_sessions

dos_dossiers, dos_steps, dos_history,
dos_tasks, dos_task_assignments

doc_documents, doc_validations

pay_invoices, pay_invoice_items,
pay_payments, pay_receipts

msg_conversations, msg_messages, msg_attachments

notif_notifications, notif_preferences, notif_logs

pro_questionnaires, pro_responses, pro_scores

apt_slots, apt_appointments
```

---

## 6. Infrastructure — 100% Oracle Cloud Infrastructure (OCI)

La production est entièrement hébergée sur OCI, avec un **Always Free tier généreux** qui couvre la majorité des besoins MVP sans coût fixe.

```
┌─────────────────────────────────────────────────────────────┐
│              Oracle Cloud Infrastructure (OCI)              │
│                                                             │
│  ┌─────────────────┐       ┌─────────────────┐             │
│  │ client.cam...   │       │ staff.cam...     │             │
│  │ Nuxt 4 (SSR)    │       │ Nuxt 4 (SSR)     │             │
│  │ VM.Standard.E2  │       │ VM.Standard.E2   │             │
│  └────────┬────────┘       └────────┬─────────┘             │
│           └──────────┬─────────────┘                       │
│                      ▼                                      │
│          ┌───────────────────────┐                         │
│          │  Backend Node.js      │                         │
│          │  VM.Standard.E2.1     │                         │
│          │  (Always Free)        │                         │
│          └───────────┬───────────┘                         │
│                      │                                      │
│   ┌──────────────────┼──────────────────┐                  │
│   ▼                  ▼                  ▼                  │
│ ┌────────┐       ┌────────┐      ┌─────────────┐          │
│ │MySQL   │       │ Redis  │      │ OCI Object  │          │
│ │OCI DB  │       │ Cache  │      │ Storage     │          │
│ │Free    │       │ VM     │      │ (documents) │          │
│ └────────┘       └────────┘      └─────────────┘          │
│                                                             │
│  OCI Load Balancer · OCI DNS · OCI Vault (secrets)         │
│  OCI Logging · Let's Encrypt SSL                           │
└─────────────────────────────────────────────────────────────┘
```

### Dev (Docker local)

```
Docker Compose
├── apps/client  :3000    -- Nuxt 4 app client
├── apps/staff   :3001    -- Nuxt 4 app staff
├── backend      :4000    -- Node.js Express
├── mysql        :3306
├── redis        :6379
└── minio        :9000    -- Object Storage OCI émulé
└── tusd         :1080    -- serveur tus.io local (dev uniquement)
```

### Prod (OCI)

```
Compute — Always Free (2 VM ARM Ampere A1 ou AMD E2)
├── VM 1 : Backend Node.js (PM2 cluster mode)
├── VM 2 : Nuxt 4 App Client + App Staff (Nginx reverse proxy)
└── OCI Load Balancer (10 Mbps — Always Free)

Base de données
└── OCI MySQL HeatWave (Always Free — 50 Go)
    ├── Backups automatiques (7 jours de rétention)
    ├── Chiffrement at-rest natif
    └── Connexions via VCN privé uniquement

Cache & Queue
└── Redis sur VM (Always Free ARM)
    ├── Instance dédiée ou co-hébergée avec le backend
    └── Persistance AOF activée

Stockage documents
├── tus.io (protocole upload)
│   ├── Serveur tus : @tus-node-server (intégré au backend Node.js)
│   ├── Reprise automatique sur coupure réseau — critique pour connexions africaines
│   ├── Upload chunked — fragments de 5 Mo max (adaptable selon la connexion)
│   ├── Progress temps réel côté client via tus-js-client
│   └── Endpoint : POST /api/files/upload (création session) + PATCH (envoi chunks)
└── OCI Object Storage (destination finale)
    ├── 20 Go Always Free
    ├── tus-node-server écrit directement dans OCI via S3-compatible API
    ├── Pre-Authenticated Requests pour téléchargement sécurisé (expiration 15 min)
    └── Chiffrement at-rest natif OCI

SSL / DNS
├── OCI DNS — gestion des zones client.camerounada.com + staff.camerounada.com
└── Certbot + Let's Encrypt (renouvellement automatique)

Emails
└── OCI Email Delivery (Always Free — 100 emails/jour) + SendGrid (si volume > 100/j)

Secrets
└── OCI Vault — stockage sécurisé des clés API, JWT secret, credentials DB

Monitoring
└── OCI Logging + OCI Monitoring + Sentry (free tier)
```

### tus.io — Intégration backend

```typescript
// backend/src/modules/documents/tus.server.ts
import { Server } from '@tus/server'
import { S3Store } from '@tus/s3-store'

export const tusServer = new Server({
  path: '/api/files/upload',
  datastore: new S3Store({
    s3ClientConfig: {
      bucket: process.env.OCI_BUCKET_NAME,
      endpoint: process.env.OCI_S3_ENDPOINT,  // OCI S3-compatible endpoint
      region: 'eu-frankfurt-1',
      credentials: {
        accessKeyId:     process.env.OCI_ACCESS_KEY,
        secretAccessKey: process.env.OCI_SECRET_KEY,
      }
    }
  }),
  onUploadCreate: async (req, upload) => {
    // Vérifier auth + permissions avant d'accepter l'upload
    const user = await verifyToken(req.headers.authorization)
    if (!user) throw new Error('Non autorisé')
    return upload
  },
  onUploadFinish: async (req, upload) => {
    // Upload terminé → créer l'entrée en base + notifier le conseiller
    await documentService.createDocument({
      tusId:    upload.id,
      ociKey:   upload.storage?.key,
      clientId: upload.metadata?.clientId,
      type:     upload.metadata?.documentType,
      size:     upload.size,
    })
    return upload
  }
})

// Monter tus sur Express
app.all('/api/files/upload', tusServer.handle.bind(tusServer))
app.all('/api/files/upload/*', tusServer.handle.bind(tusServer))
```

```typescript
// apps/client/composables/useUpload.ts
import * as tus from 'tus-js-client'

export const useUpload = () => {
  const upload = (file: File, metadata: Record<string, string>) => {
    return new Promise((resolve, reject) => {
      const tusUpload = new tus.Upload(file, {
        endpoint: '/api/files/upload',
        retryDelays: [0, 1000, 3000, 5000], // reprise auto sur coupure
        chunkSize: 5 * 1024 * 1024,         // chunks de 5 Mo
        metadata: {
          filename:     file.name,
          filetype:     file.type,
          ...metadata
        },
        onProgress: (uploaded, total) => {
          // progress en % → mise à jour UI
          const percent = Math.round((uploaded / total) * 100)
          progressRef.value = percent
        },
        onSuccess: () => resolve(tusUpload.url),
        onError:   (err) => reject(err)
      })

      // Reprendre un upload existant si l'URL est sauvegardée
      tusUpload.findPreviousUploads().then(prev => {
        if (prev.length > 0) tusUpload.resumeFromPreviousUpload(prev[0])
        tusUpload.start()
      })
    })
  }

  return { upload, progressRef }
}
```

### Configuration Nginx (reverse proxy)

```nginx
# /etc/nginx/sites-available/camerounada
server {
    listen 443 ssl;
    server_name client.camerounada.com;

    ssl_certificate     /etc/letsencrypt/live/camerounada.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/camerounada.com/privkey.pem;

    location / {
        proxy_pass http://localhost:3000;   # Nuxt 4 app client
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}

server {
    listen 443 ssl;
    server_name staff.camerounada.com;
    location / { proxy_pass http://localhost:3001; }  # Nuxt 4 app staff
}

server {
    listen 443 ssl;
    server_name api.camerounada.com;
    location /api/ { proxy_pass http://localhost:4000; }  # Backend Node.js
}
```

### PM2 — gestion des processus Node.js

```javascript
// ecosystem.config.js
module.exports = {
  apps: [
    {
      name: 'backend',
      script: 'backend/dist/app.js',
      instances: 'max',        // cluster mode — utilise tous les CPU
      exec_mode: 'cluster',
      env_production: { NODE_ENV: 'production', PORT: 4000 }
    },
    {
      name: 'client',
      script: 'apps/client/.output/server/index.mjs',
      instances: 1,
      env_production: { NODE_ENV: 'production', PORT: 3000 }
    },
    {
      name: 'staff',
      script: 'apps/staff/.output/server/index.mjs',
      instances: 1,
      env_production: { NODE_ENV: 'production', PORT: 3001 }
    }
  ]
}
```

### CI/CD — GitHub Actions → OCI

```yaml
# .github/workflows/deploy.yml
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci && npm run build   # build Turborepo
      - name: Deploy to OCI VM
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.OCI_VM_IP }}
          username: ubuntu
          key: ${{ secrets.OCI_SSH_KEY }}
          script: |
            cd /opt/camerounada
            git pull origin main
            npm ci
            npm run build
            pm2 reload ecosystem.config.js --env production
```

### Coûts estimés en prod MVP

| Service | Plan OCI | Coût mensuel |
|---|---|---|
| VM Backend (AMD E2.1 ou ARM A1) | Always Free | **0 $/mois** |
| VM Frontend Nginx (ARM A1) | Always Free | **0 $/mois** |
| OCI MySQL HeatWave (50 Go) | Always Free | **0 $/mois** |
| OCI Object Storage (20 Go) | Always Free | **0 $/mois** |
| OCI Load Balancer (10 Mbps) | Always Free | **0 $/mois** |
| OCI Email Delivery | Always Free (100/j) | **0 $/mois** |
| OCI DNS | Always Free | **0 $/mois** |
| SendGrid (si > 100 emails/j) | Free tier (100/j) | 0 → 20 $/mois |
| Sentry | Free tier | **0 $/mois** |
| **Total MVP** | | **0 à 20 $/mois** |

> OCI Always Free est permanent — pas d'expiration après 12 mois contrairement à AWS Free Tier.
> En cas de croissance, les VM peuvent être upgradées sans migration d'infrastructure.

---

## 7. Sécurité

### Authentification

```
JWT
- Access token : 15 min (httpOnly cookie)
- Refresh token : 30 jours (rotation automatique)
- Invalidation immédiate sur logout ou changement de mot de passe

MFA — TOTP (Time-based One-Time Password)
- Standard RFC 6238 — compatible Google Authenticator, Authy, 1Password
- Librairie : otplib (Node.js)
- Secret généré par utilisateur : crypto.randomBytes(20) → base32
- QR code : qrcode (rendu côté backend, transmis en base64)
- Fenêtre de tolérance : ±1 intervalle (30s) pour compenser les décalages d'horloge
- Codes de secours : 8 codes usage unique, stockés hashés (bcrypt)
- Obligatoire pour : tous les rôles staff (conseiller, analyste, support, admin)
- Optionnel pour : clients (recommandé mais non forcé)

MFA — Email OTP
- Code numérique à 6 chiffres généré via crypto.randomInt(100000, 999999)
- Durée de validité : 10 minutes
- Stockage : Redis (clé ttl automatique, pas de pollution MySQL)
- Limité à 3 tentatives par code — au-delà, nouveau code requis
- Limité à 5 envois par heure par compte (anti-spam)
- Recommandé pour : clients (plus simple qu'une app authenticator)
- Peut coexister avec TOTP — l'utilisateur choisit sa méthode préférée
```

### Flux de connexion avec TOTP

```
Étape 1 — Identifiants
POST /api/auth/login
{ email, password }
→ Si identifiants valides ET totp_enabled = true
  → Réponse : { status: "totp_required", temp_token: "xxx" }  (valable 5 min)
→ Si identifiants valides ET totp_enabled = false
  → Réponse : { access_token, refresh_token }  (connexion directe)

Étape 2 — Code TOTP
POST /api/auth/login/totp
{ temp_token, totp_code }   -- code à 6 chiffres de l'app authenticator
→ Si code valide
  → Réponse : { access_token, refresh_token }
→ Si code invalide 3 fois
  → Compte temporairement bloqué 15 min + alerte email

Activation initiale du TOTP
POST /api/auth/totp/setup    (utilisateur connecté, totp non encore activé)
→ Réponse : { secret, qr_code_base64, backup_codes[] }
→ Afficher le QR code → utilisateur scanne avec son app
POST /api/auth/totp/verify   { totp_code }
→ Si valide → totp_enabled = true en base, backup_codes stockés hashés

### Flux de connexion avec Email OTP

```
Étape 1 — Identifiants
POST /api/auth/login
{ email, password }
→ Si identifiants valides ET mfa_email_enabled = true
  → Envoi automatique du code OTP à l'adresse email du compte
  → Réponse : { status: "email_otp_required", temp_token: "xxx" }  (valable 10 min)

Étape 2 — Code email
POST /api/auth/login/mfa-email
{ temp_token, otp_code }   -- code à 6 chiffres reçu par email
→ Si code valide et non expiré
  → Réponse : { access_token, refresh_token }
→ Si code expiré
  → Message : "Code expiré — demandez un nouveau code"
→ Si 3 tentatives échouées
  → Code invalidé — nouveau code requis via POST /api/auth/mfa-email/send

Renvoi d'un code
POST /api/auth/mfa-email/send   { temp_token }
→ Nouveau code généré, ancien invalidé immédiatement dans Redis
→ Limité à 5 envois/heure par compte
```

### Cache Redis — Permissions RBAC

```
Clé   : rbac:role:{role_id}
Valeur: [ "dossiers:read", "documents:validate", ... ]   -- liste des permissions
TTL   : 300 secondes (5 min) — invalidé immédiatement si un rôle est modifié

Invalidation : à chaque PUT /api/admin/roles/:id/permissions
→ DEL rbac:role:{role_id}
→ Prochain appel recharge depuis MySQL et re-cache
```

### Stockage Redis — Email OTP

```
Clé   : mfa_email:{user_id}
Valeur: { code_hash, attempts, created_at }
TTL   : 600 secondes (10 minutes — expiration automatique)

Clé   : mfa_email_rate:{user_id}
Valeur: compteur d'envois
TTL   : 3600 secondes (1 heure — reset automatique)
```

### Schéma DB — ajout colonnes MFA

```sql
-- Ajout dans auth_users — TOTP
ALTER TABLE auth_users ADD COLUMN totp_secret       VARCHAR(64)  NULL;
ALTER TABLE auth_users ADD COLUMN totp_enabled      BOOLEAN      DEFAULT FALSE;
ALTER TABLE auth_users ADD COLUMN totp_enabled_at   DATETIME     NULL;

-- Ajout dans auth_users — Email OTP
ALTER TABLE auth_users ADD COLUMN mfa_email_enabled    BOOLEAN  DEFAULT FALSE;
ALTER TABLE auth_users ADD COLUMN mfa_email_enabled_at DATETIME NULL;

-- Méthode MFA préférée (si les deux sont activées)
ALTER TABLE auth_users ADD COLUMN mfa_preferred_method ENUM('totp', 'email') DEFAULT 'totp';

-- Table codes de secours
CREATE TABLE auth_totp_backup_codes (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  user_id     INT NOT NULL,
  code_hash   VARCHAR(255) NOT NULL,   -- bcrypt hash du code
  used        BOOLEAN DEFAULT FALSE,
  used_at     DATETIME NULL,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES auth_users(id)
);
```

### Autres mesures de sécurité

```
RBAC        : middleware central, vérifié sur chaque route
Documents   : upload via tus.io (auth vérifiée au onUploadCreate), Pre-Authenticated Requests OCI pour téléchargement (expiration 15 min), chiffrement at-rest OCI
CORS        : origines autorisées = client.camerounada.com + staff.camerounada.com
Rate limit  : 100 req/min non auth · 500 req/min auth · 5 tentatives login/15min
```

---

## 8. Stack récapitulatif

| Couche | Technologie |
|---|---|
| Frontend client | Vue.js 3 + Nuxt 4 |
| Frontend staff | Vue.js 3 + Nuxt 4 |
| Backend | Node.js + Express + TypeScript |
| ORM | Prisma |
| Base de données | MySQL 8.0 — OCI MySQL HeatWave (Always Free) |
| Cache / Queue | Redis 7 — VM OCI (Always Free) |
| Upload fichiers | tus.io (@tus-node-server + tus-js-client) |
| Stockage fichiers | OCI Object Storage (compatible S3, Always Free 20 Go) |
| MFA / TOTP | otplib + qrcode | RFC 6238, compatible toutes les apps authenticator |
| MFA / Email OTP | crypto (Node.js natif) + Redis TTL | Code 6 chiffres, expiration 10 min, stockage sans DB |
| Emails | OCI Email Delivery + SendGrid (fallback) |
| Paiements | Stripe + CinetPay |
| Monorepo | Turborepo |
| Déploiement | OCI Compute VM + PM2 cluster + Nginx |
| CI/CD | GitHub Actions → SSH deploy OCI |
| Monitoring | OCI Logging + OCI Monitoring + Sentry |

---

*Document produit dans le cadre du projet Camerounada — MVP 6 mois*
*Version 5.1 — 2 frontends + 1 backend unifié + MFA TOTP + MFA Email OTP + RBAC dynamique + Nuxt 4 + Infra 100% OCI + Upload tus.io*
