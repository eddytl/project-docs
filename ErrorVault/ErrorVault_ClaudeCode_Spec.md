# ErrorVault — Spécification de génération de code pour Claude Code

> Ce document est une spécification complète destinée à Claude Code pour générer le code source de la plateforme **ErrorVault**, un SaaS de tracking d'erreurs et monitoring applicatif. Suis les instructions dans l'ordre. Ne génère aucun placeholder ni `TODO` — chaque fichier doit être fonctionnel.

---

## 0. Contexte produit

ErrorVault est une alternative à Sentry. L'application permet aux équipes de développement de :
- Capturer et grouper les erreurs applicatives automatiquement (fingerprinting)
- Visualiser les stack traces, breadcrumbs et contexte utilisateur
- Monitorer les performances (Core Web Vitals, latences API)
- Configurer des alertes (Slack, email, PagerDuty)
- Rejouer les sessions utilisateurs ayant conduit à une erreur

---

## 1. Stack technique cible

### Frontend
- **Framework** : Next.js 14 (App Router)
- **Langage** : TypeScript strict (`strict: true`)
- **Data fetching** : TanStack Query v5 (`@tanstack/react-query`)
- **State global** : Zustand
- **Graphiques** : Recharts
- **Icons** : `@tabler/icons-react`
- **Styles** : CSS Modules + variables CSS custom (pas de Tailwind)
- **HTTP client** : Axios avec intercepteurs JWT
- **Temps réel** : EventSource natif (SSE)
- **Linting** : ESLint + Prettier

### Backend (API de lecture)
- **Framework** : FastAPI (Python 3.12)
- **ORM** : SQLAlchemy 2.0 async
- **Base relationnelle** : PostgreSQL 16
- **Analytique** : ClickHouse (clickhouse-connect)
- **Cache** : Redis 7 (redis-py async)
- **Temps réel** : sse-starlette
- **Auth** : JWT (python-jose) + bcrypt
- **Validation** : Pydantic v2
- **Tests** : pytest + httpx

### API d'ingestion (service séparé)
- **Framework** : FastAPI
- **Queue** : Apache Kafka (aiokafka)
- **Rate limiting** : Redis sliding window
- **Validation** : Pydantic v2

### Infrastructure
- **Conteneurs** : Docker + docker-compose (développement local)
- **Variables d'environnement** : `.env` avec `python-dotenv` / `next/env`

---

## 2. Structure du projet

Génère la structure de fichiers suivante **exactement** :

```
errorvault/
├── frontend/                          # Application Next.js
│   ├── src/
│   │   ├── app/                       # App Router
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx               # Redirect vers /dashboard
│   │   │   ├── (auth)/
│   │   │   │   ├── login/page.tsx
│   │   │   │   └── register/page.tsx
│   │   │   └── (app)/
│   │   │       ├── layout.tsx         # Layout avec sidebar
│   │   │       ├── dashboard/page.tsx
│   │   │       ├── errors/
│   │   │       │   ├── page.tsx       # Liste des erreurs
│   │   │       │   └── [fingerprint]/page.tsx  # Détail erreur
│   │   │       ├── performance/page.tsx
│   │   │       ├── alerts/page.tsx
│   │   │       ├── sessions/
│   │   │       │   ├── page.tsx
│   │   │       │   └── [sessionId]/page.tsx
│   │   │       ├── sdks/page.tsx
│   │   │       └── settings/page.tsx
│   │   ├── components/
│   │   │   ├── layout/
│   │   │   │   ├── Sidebar.tsx
│   │   │   │   ├── Topbar.tsx
│   │   │   │   └── Layout.tsx
│   │   │   ├── dashboard/
│   │   │   │   ├── MetricCard.tsx
│   │   │   │   ├── ErrorVolumeChart.tsx
│   │   │   │   ├── TopErrorsTable.tsx
│   │   │   │   └── BrowserBreakdown.tsx
│   │   │   ├── errors/
│   │   │   │   ├── ErrorList.tsx
│   │   │   │   ├── ErrorItem.tsx
│   │   │   │   ├── ErrorDetail.tsx
│   │   │   │   ├── StackTrace.tsx
│   │   │   │   ├── Breadcrumbs.tsx
│   │   │   │   └── ErrorContext.tsx
│   │   │   ├── performance/
│   │   │   │   ├── WebVitalsGrid.tsx
│   │   │   │   ├── LatencyChart.tsx
│   │   │   │   └── SlowTransactions.tsx
│   │   │   ├── alerts/
│   │   │   │   ├── AlertRuleList.tsx
│   │   │   │   ├── AlertRuleForm.tsx
│   │   │   │   └── AlertHistory.tsx
│   │   │   ├── sessions/
│   │   │   │   ├── SessionList.tsx
│   │   │   │   ├── SessionItem.tsx
│   │   │   │   └── SessionPlayer.tsx
│   │   │   └── ui/
│   │   │       ├── Badge.tsx
│   │   │       ├── Button.tsx
│   │   │       ├── Card.tsx
│   │   │       ├── Chip.tsx
│   │   │       ├── EmptyState.tsx
│   │   │       ├── LoadingSpinner.tsx
│   │   │       ├── Modal.tsx
│   │   │       ├── SeverityDot.tsx
│   │   │       ├── StatusPill.tsx
│   │   │       ├── Table.tsx
│   │   │       └── Toggle.tsx
│   │   ├── hooks/
│   │   │   ├── useErrors.ts
│   │   │   ├── useErrorDetail.ts
│   │   │   ├── usePerformance.ts
│   │   │   ├── useAlerts.ts
│   │   │   ├── useSessions.ts
│   │   │   ├── useDashboardStats.ts
│   │   │   ├── useAlertStream.ts      # SSE hook
│   │   │   └── useProject.ts
│   │   ├── lib/
│   │   │   ├── api.ts                 # Axios instance + intercepteurs
│   │   │   ├── auth.ts                # JWT helpers
│   │   │   ├── queryClient.ts         # TanStack Query config
│   │   │   └── utils.ts               # formatDate, formatCount, etc.
│   │   ├── store/
│   │   │   ├── authStore.ts           # Zustand : user, token
│   │   │   └── projectStore.ts        # Zustand : projet courant
│   │   ├── types/
│   │   │   ├── error.ts
│   │   │   ├── performance.ts
│   │   │   ├── alert.ts
│   │   │   ├── session.ts
│   │   │   └── api.ts
│   │   └── styles/
│   │       ├── globals.css            # Variables CSS + reset
│   │       └── theme.css              # Palette ErrorVault
│   ├── public/
│   ├── next.config.ts
│   ├── tsconfig.json
│   └── package.json
│
├── backend/                           # API de lecture (FastAPI)
│   ├── app/
│   │   ├── main.py
│   │   ├── config.py                  # Settings Pydantic
│   │   ├── database.py                # Sessions async PG + ClickHouse
│   │   ├── auth/
│   │   │   ├── router.py              # POST /auth/login, /auth/refresh
│   │   │   ├── service.py
│   │   │   ├── models.py
│   │   │   └── dependencies.py        # get_current_user
│   │   ├── errors/
│   │   │   ├── router.py
│   │   │   ├── service.py
│   │   │   └── schemas.py
│   │   ├── performance/
│   │   │   ├── router.py
│   │   │   ├── service.py
│   │   │   └── schemas.py
│   │   ├── alerts/
│   │   │   ├── router.py
│   │   │   ├── service.py
│   │   │   └── schemas.py
│   │   ├── sessions/
│   │   │   ├── router.py
│   │   │   ├── service.py
│   │   │   └── schemas.py
│   │   ├── projects/
│   │   │   ├── router.py
│   │   │   ├── service.py
│   │   │   └── schemas.py
│   │   ├── stream/
│   │   │   └── router.py              # SSE endpoint
│   │   └── middleware/
│   │       ├── auth.py
│   │       └── cors.py
│   ├── migrations/                    # Alembic
│   │   └── versions/
│   ├── tests/
│   │   ├── conftest.py
│   │   ├── test_errors.py
│   │   ├── test_auth.py
│   │   └── test_performance.py
│   ├── requirements.txt
│   └── Dockerfile
│
├── ingest/                            # API d'ingestion (service séparé)
│   ├── app/
│   │   ├── main.py
│   │   ├── config.py
│   │   ├── router.py                  # POST /api/v1/envelope
│   │   ├── validator.py               # Validation Pydantic du payload
│   │   ├── kafka_producer.py
│   │   ├── rate_limiter.py            # Redis sliding window
│   │   └── schemas.py
│   ├── requirements.txt
│   └── Dockerfile
│
├── workers/                           # Kafka consumers
│   ├── event_processor/
│   │   ├── main.py
│   │   ├── consumer.py
│   │   ├── fingerprint.py             # Algorithme de fingerprinting
│   │   ├── normalizer.py
│   │   └── storage.py                 # Écriture PG + ClickHouse
│   ├── symbolicator/
│   │   ├── main.py
│   │   ├── consumer.py
│   │   └── resolver.py                # Résolution source maps
│   ├── alert_engine/
│   │   ├── main.py
│   │   ├── consumer.py
│   │   ├── evaluator.py               # Évaluation des règles
│   │   └── notifiers/
│   │       ├── slack.py
│   │       ├── email.py
│   │       └── pagerduty.py
│   └── requirements.txt
│
└── docker-compose.yml                 # PG, ClickHouse, Kafka, Redis
```

---

## 3. Variables d'environnement

### `frontend/.env.local`
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_INGEST_URL=http://localhost:8001
```

### `backend/.env`
```env
DATABASE_URL=postgresql+asyncpg://errorvault:password@localhost:5432/errorvault
CLICKHOUSE_HOST=localhost
CLICKHOUSE_PORT=9000
CLICKHOUSE_DB=errorvault
REDIS_URL=redis://localhost:6379/0
JWT_SECRET=change-me-in-production-min-32-chars
JWT_ALGORITHM=HS256
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=15
JWT_REFRESH_TOKEN_EXPIRE_DAYS=7
CORS_ORIGINS=http://localhost:3000
```

### `ingest/.env`
```env
KAFKA_BOOTSTRAP_SERVERS=localhost:9092
KAFKA_TOPIC_EVENTS=raw-events
KAFKA_TOPIC_SOURCE_MAPS=source-maps-jobs
REDIS_URL=redis://localhost:6379/1
RATE_LIMIT_PER_DSN=10000
RATE_LIMIT_WINDOW_SECONDS=60
```

---

## 4. Schéma de base de données PostgreSQL

Génère les migrations Alembic correspondantes. Les tables sont :

```sql
-- Organisations (tenants)
CREATE TABLE organizations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(255) NOT NULL,
  slug        VARCHAR(100) UNIQUE NOT NULL,
  plan        VARCHAR(50) DEFAULT 'hobby',  -- hobby|starter|pro|enterprise
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- Utilisateurs
CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name     VARCHAR(255),
  org_id        UUID REFERENCES organizations(id) ON DELETE CASCADE,
  role          VARCHAR(50) DEFAULT 'member',  -- admin|member|viewer
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- Projets
CREATE TABLE projects (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id       UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name         VARCHAR(255) NOT NULL,
  slug         VARCHAR(100) NOT NULL,
  dsn_hash     VARCHAR(64) UNIQUE NOT NULL,   -- SHA-256 du DSN
  platform     VARCHAR(50),                   -- javascript|python|node|ios|android
  environment  VARCHAR(50) DEFAULT 'production',
  created_at   TIMESTAMPTZ DEFAULT now(),
  UNIQUE(org_id, slug)
);

-- Groupes d'erreurs
CREATE TABLE error_groups (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id   UUID REFERENCES projects(id) ON DELETE CASCADE,
  fingerprint  VARCHAR(16) NOT NULL,
  title        VARCHAR(255) NOT NULL,          -- "{type}: {message tronqué}"
  type         VARCHAR(100) NOT NULL,          -- "TypeError"
  culprit      VARCHAR(500),                   -- "api/dashboard.js in fetchData"
  status       VARCHAR(50) DEFAULT 'unresolved', -- unresolved|resolved|ignored
  first_seen   TIMESTAMPTZ DEFAULT now(),
  last_seen    TIMESTAMPTZ DEFAULT now(),
  times_seen   BIGINT DEFAULT 1,
  assigned_to  UUID REFERENCES users(id),
  UNIQUE(project_id, fingerprint)
);

-- Règles d'alerte
CREATE TABLE alert_rules (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id   UUID REFERENCES projects(id) ON DELETE CASCADE,
  name         VARCHAR(255) NOT NULL,
  condition    JSONB NOT NULL,                 -- { "type": "error_count", "threshold": 100, "window_min": 5 }
  channels     JSONB NOT NULL,                 -- [{ "type": "slack", "webhook": "..." }]
  is_active    BOOLEAN DEFAULT true,
  created_at   TIMESTAMPTZ DEFAULT now()
);

-- Historique des alertes
CREATE TABLE alert_history (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id      UUID REFERENCES alert_rules(id) ON DELETE CASCADE,
  triggered_at TIMESTAMPTZ DEFAULT now(),
  resolved_at  TIMESTAMPTZ,
  payload      JSONB                           -- contexte au moment du déclenchement
);

-- Index essentiels
CREATE INDEX idx_error_groups_project ON error_groups(project_id, status, last_seen DESC);
CREATE INDEX idx_error_groups_fingerprint ON error_groups(fingerprint);
CREATE INDEX idx_alert_rules_project ON alert_rules(project_id, is_active);
```

---

## 5. Schéma ClickHouse

```sql
CREATE TABLE IF NOT EXISTS events (
  project_id      String,
  fingerprint     String,
  event_id        String,
  timestamp       DateTime64(3, 'UTC'),
  type            String,
  message         String,
  environment     LowCardinality(String),
  release         String,
  user_id         String,
  browser         LowCardinality(String),
  browser_version LowCardinality(String),
  os              LowCardinality(String),
  url             String,
  stacktrace      String,
  breadcrumbs     String,
  duration_ms     Nullable(UInt32),
  country_code    LowCardinality(String)
) ENGINE = MergeTree()
  PARTITION BY toYYYYMM(timestamp)
  ORDER BY (project_id, fingerprint, timestamp)
  TTL timestamp + INTERVAL 90 DAY;

-- Table performance
CREATE TABLE IF NOT EXISTS performance_events (
  project_id    String,
  timestamp     DateTime64(3, 'UTC'),
  transaction   String,
  method        LowCardinality(String),
  status_code   UInt16,
  duration_ms   UInt32,
  environment   LowCardinality(String),
  release       String,
  lcp           Nullable(Float32),
  fid           Nullable(Float32),
  cls           Nullable(Float32),
  fcp           Nullable(Float32),
  ttfb          Nullable(Float32)
) ENGINE = MergeTree()
  PARTITION BY toYYYYMM(timestamp)
  ORDER BY (project_id, timestamp)
  TTL timestamp + INTERVAL 90 DAY;
```

---

## 6. Types TypeScript

Génère `frontend/src/types/` avec ces interfaces **exactes** :

```typescript
// error.ts
export interface ErrorGroup {
  id: string;
  fingerprint: string;
  title: string;
  type: string;
  culprit: string;
  status: 'unresolved' | 'resolved' | 'ignored';
  firstSeen: string;       // ISO 8601
  lastSeen: string;
  timesSeen: number;
  usersAffected: number;
  assignedTo?: User;
  project: Project;
}

export interface ErrorEvent {
  id: string;
  fingerprint: string;
  timestamp: string;
  type: string;
  message: string;
  environment: string;
  release: string;
  stacktrace: Stacktrace;
  breadcrumbs: Breadcrumb[];
  context: EventContext;
  user?: { id: string; email?: string; username?: string };
}

export interface Stacktrace {
  frames: StackFrame[];
}

export interface StackFrame {
  filename: string;
  function: string;
  lineNo?: number;
  colNo?: number;
  context?: string[];
  inApp: boolean;
  resolved?: boolean;      // après symbolication
}

export interface Breadcrumb {
  timestamp: string;
  category: 'navigation' | 'ui' | 'xhr' | 'error' | 'console' | 'info';
  message: string;
  level: 'debug' | 'info' | 'warning' | 'error';
  data?: Record<string, unknown>;
}

export interface EventContext {
  browser?: { name: string; version: string };
  os?: { name: string; version: string };
  device?: { model?: string; type: 'desktop' | 'mobile' | 'tablet' };
  url?: string;
  ip?: string;
}

// performance.ts
export interface WebVitals {
  lcp: { value: number; rating: 'good' | 'needs-improvement' | 'poor' };
  fid: { value: number; rating: 'good' | 'needs-improvement' | 'poor' };
  cls: { value: number; rating: 'good' | 'needs-improvement' | 'poor' };
  fcp: { value: number; rating: 'good' | 'needs-improvement' | 'poor' };
  ttfb: { value: number; rating: 'good' | 'needs-improvement' | 'poor' };
  inp: { value: number; rating: 'good' | 'needs-improvement' | 'poor' };
}

export interface Transaction {
  name: string;
  method: string;
  p50: number;
  p95: number;
  errorRate: number;
  throughput: number;       // req/min
}

// alert.ts
export interface AlertRule {
  id: string;
  name: string;
  condition: AlertCondition;
  channels: AlertChannel[];
  isActive: boolean;
  status: 'firing' | 'ok' | 'silenced';
  lastTriggeredAt?: string;
}

export type AlertConditionType =
  | 'error_count'
  | 'users_affected'
  | 'new_error'
  | 'latency'
  | 'recurrence';

export interface AlertCondition {
  type: AlertConditionType;
  threshold: number;
  windowMinutes: number;
}

export type AlertChannelType = 'slack' | 'email' | 'pagerduty' | 'webhook' | 'discord';

export interface AlertChannel {
  type: AlertChannelType;
  config: Record<string, string>;
}

// session.ts
export interface Session {
  id: string;
  userId?: string;
  userDisplayName?: string;
  startedAt: string;
  duration: number;         // secondes
  errorCount: number;
  browser: string;
  os: string;
  url: string;
  country?: string;
}

export interface SessionEvent {
  timestamp: string;
  category: 'navigation' | 'ui' | 'xhr' | 'error' | 'console';
  message: string;
  level: 'debug' | 'info' | 'warning' | 'error';
}

// api.ts
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  cursor?: string;
  hasMore: boolean;
}

export interface ApiError {
  code: string;
  message: string;
  detail?: unknown;
}

export interface Project {
  id: string;
  name: string;
  slug: string;
  platform: string;
  dsn: string;
  environment: string;
}

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: 'admin' | 'member' | 'viewer';
}

export interface DashboardStats {
  totalErrors: number;
  totalErrorsDelta: number;      // % vs période précédente
  usersAffected: number;
  usersAffectedDelta: number;
  activeGroups: number;
  resolutionRate: number;        // 0-100
  errorVolumeHistory: { date: string; errors: number; warnings: number }[];
}
```

---

## 7. Palette CSS et thème

Génère `frontend/src/styles/globals.css` avec ces variables :

```css
:root {
  /* Couleurs primaires */
  --color-primary:        #534AB7;
  --color-primary-dark:   #3B348A;
  --color-primary-light:  #EEEDFE;
  --color-primary-border: #AFA9EC;

  /* Sémantique */
  --color-error:          #E24B4A;
  --color-error-light:    #FCEBEB;
  --color-warning:        #EF9F27;
  --color-warning-light:  #FAEEDA;
  --color-success:        #1D9E75;
  --color-success-light:  #EAF3DE;
  --color-info:           #378ADD;
  --color-info-light:     #E6F1FB;

  /* Texte */
  --color-text-primary:   #2C2C2A;
  --color-text-secondary: #5F5E5A;
  --color-text-tertiary:  #888780;

  /* Surfaces */
  --color-bg-primary:     #FFFFFF;
  --color-bg-secondary:   #F5F5F3;
  --color-bg-tertiary:    #EEEDE9;

  /* Bordures */
  --color-border:         #E0E0DC;
  --color-border-strong:  #C8C7C2;

  /* Typographie */
  --font-sans:   -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
  --font-mono:   'SF Mono', 'Fira Code', 'Fira Mono', monospace;

  /* Spacing */
  --radius-sm:   4px;
  --radius-md:   8px;
  --radius-lg:   12px;
  --radius-full: 9999px;

  /* Shadows */
  --shadow-sm:  0 1px 2px rgba(0,0,0,0.05);
  --shadow-md:  0 4px 12px rgba(0,0,0,0.08);
  --shadow-lg:  0 8px 24px rgba(0,0,0,0.12);

  /* Sidebar */
  --sidebar-width: 220px;
  --topbar-height: 56px;
}
```

---

## 8. Composants UI de base

### `Button.tsx`
Génère un composant Button avec ces variants : `primary`, `secondary`, `ghost`, `danger`. Props : `variant`, `size` (`sm|md|lg`), `loading`, `disabled`, `leftIcon`, `rightIcon`, `onClick`, `type`.

### `Badge.tsx`
Variants : `error`, `warning`, `info`, `success`, `neutral`. Affiche un texte court avec fond coloré arrondi.

### `StatusPill.tsx`
Pour les statuts d'erreur : `unresolved` (rouge), `resolved` (vert), `ignored` (gris). Et pour les alertes : `firing`, `ok`, `silenced`.

### `SeverityDot.tsx`
Point de couleur 8px indiquant la sévérité : `error` (rouge), `warning` (orange), `info` (bleu).

### `Card.tsx`
Conteneur avec `padding`, `title` optionnel, `action` optionnel (bouton en haut à droite), `noPadding`.

### `Toggle.tsx`
Switch on/off stylisé, props : `checked`, `onChange`, `disabled`.

### `LoadingSpinner.tsx`
Spinner CSS animé, sizes `sm|md|lg`.

### `EmptyState.tsx`
Props : `icon`, `title`, `description`, `action` (bouton optionnel).

---

## 9. Layout

### `Sidebar.tsx`
- Largeur fixe `--sidebar-width` (220px)
- Logo ErrorVault en haut (icône + texte)
- Navigation avec sections : Projet (Dashboard, Erreurs, Performance, Alertes, Sessions) et Config (SDKs, Paramètres)
- Lien actif mis en évidence avec fond `--color-primary-light` et texte `--color-primary`
- Badge rouge sur "Erreurs" avec le nombre d'erreurs non résolues (via `useErrors` hook)
- Footer avec lien Mon compte
- Utilise `usePathname()` de Next.js pour détecter le lien actif

### `Topbar.tsx`
- Titre de la page + sous-titre (nom du projet + environnement)
- Slot à droite pour les filtres (passé en `children`)
- Hauteur fixe `--topbar-height`

### `Layout.tsx` (App Router layout)
- Sidebar fixe à gauche
- Zone principale scrollable à droite
- Passe le projet courant via `projectStore`

---

## 10. Pages et composants principaux

### Page Dashboard (`/dashboard`)

**Composant `MetricCard`**
Props : `label`, `value`, `delta` (nombre + sens), `icon`, `color`. Affiche la valeur principale, le label, et le delta avec flèche colorée (vert si amélioration, rouge si dégradation).

**Composant `ErrorVolumeChart`**
- Recharts `AreaChart` responsive
- Deux séries : erreurs (rouge) et avertissements (orange)
- Axe X : dates, Axe Y : nombre d'événements
- Tooltip custom avec les valeurs formatées
- Données provenant de `DashboardStats.errorVolumeHistory`

**Composant `TopErrorsTable`**
- Tableau des 5 erreurs les plus fréquentes
- Colonnes : type/fichier, barre de progression relative, nombre d'occurrences
- Clic sur une ligne → navigation vers `/errors/{fingerprint}`

**Page dashboard complète**
```typescript
// Utilise ces hooks :
const { data: stats } = useDashboardStats({ projectId, period: '7d' });
```
Layout en grille : 4 MetricCards en haut, ErrorVolumeChart pleine largeur, puis TopErrorsTable + BrowserBreakdown côte à côte.

---

### Page Erreurs (`/errors`)

**Composant `ErrorList`**
- Filtres en haut : chips "Non résolues" / "Résolues" / "Ignorées" + sélecteur de période + recherche
- Pagination cursor-based (bouton "Charger plus")
- Chaque `ErrorItem` affiche : sévérité (dot), type, message tronqué, âge, nb utilisateurs, fichier source, badge d'occurrences
- L'item sélectionné est mis en évidence (border-left violet)

**Composant `ErrorDetail`** (panneau droit ou page dédiée sur mobile)
- En-tête : type d'erreur, message, statut, métriques (occurrences, users, version, dernière vue)
- Boutons d'action : Résoudre, Ignorer, Assigner
- `StackTrace` : frames app mises en évidence vs frames système grisées, badge "app" sur les frames importantes
- `Breadcrumbs` : timeline des événements avec catégorie colorée, timestamp, message
- `ErrorContext` : grid 2 colonnes avec navigateur, OS, URL, user ID

---

### Page Performance (`/performance`)

**Composant `WebVitalsGrid`**
- Grille 3×2 affichant LCP, FID, CLS, FCP, TTFB, INP
- Chaque cellule : nom de la métrique, valeur avec unité, label de rating coloré (Bon/À améliorer/Mauvais)
- Seuils de rating :
  - LCP : bon < 2.5s, mauvais > 4s
  - FID : bon < 100ms, mauvais > 300ms
  - CLS : bon < 0.1, mauvais > 0.25
  - FCP : bon < 1.8s, mauvais > 3s
  - TTFB : bon < 800ms, mauvais > 1800ms
  - INP : bon < 200ms, mauvais > 500ms

**Composant `SlowTransactions`**
- Tableau : méthode HTTP (badge coloré GET/POST/DELETE), endpoint, p50, p95 (coloré selon rating), taux d'erreur, barre de progression

---

### Page Alertes (`/alerts`)

**Composant `AlertRuleList`**
- Chaque règle : icône colorée selon type, nom, condition en langage naturel ("Si erreurs > 100/min pendant 5 min"), tags des canaux (Slack, email...), pill de statut, toggle on/off
- Bouton "Nouvelle règle" en haut à droite

**Composant `AlertRuleForm`** (modal)
- Champs : Nom, Type de condition (select), Seuil (number), Fenêtre de temps (select)
- Multi-select des canaux de notification
- Validation Pydantic côté client avec messages d'erreur inline

---

### Page Sessions (`/sessions`)

**Composant `SessionList`**
- Filtres : "Avec erreurs" / "Toutes" / "Rage clicks"
- Chaque session : avatar initiales, user ID, âge, browser, OS, durée, badge erreurs

**Composant `SessionPlayer`** (panneau droit)
- En-tête : infos utilisateur + bouton "Rejouer la session"
- Barre de progression avec marqueurs rouges aux positions des erreurs
- Contrôles play/pause/skip
- Timeline des événements : timestamp, catégorie colorée, message

---

### Page SDKs (`/sdks`)

- Sélecteur de plateforme à gauche (JS, Python, Node, React, iOS, Android)
- 3 étapes à droite :
  1. Installation (snippet `npm install` ou `pip install`)
  2. Initialisation (snippet de code avec DSN pré-rempli depuis `projectStore`)
  3. Vérification (statut de la dernière donnée reçue, vert si < 5 min)
- Bouton "Copier" sur chaque snippet (utilise `navigator.clipboard.writeText`)

---

## 11. Hooks TanStack Query

Génère ces hooks avec gestion d'erreur et types stricts :

```typescript
// useErrors.ts
export function useErrors(params: {
  projectId: string;
  status?: 'unresolved' | 'resolved' | 'ignored';
  period?: '24h' | '7d' | '30d';
  cursor?: string;
  search?: string;
}) => UseQueryResult<PaginatedResponse<ErrorGroup>>

// useErrorDetail.ts
export function useErrorDetail(fingerprint: string)
  => UseQueryResult<{ group: ErrorGroup; events: ErrorEvent[] }>

// useDashboardStats.ts
export function useDashboardStats(params: { projectId: string; period: string })
  => UseQueryResult<DashboardStats>

// useAlerts.ts
export function useAlerts(projectId: string) => UseQueryResult<AlertRule[]>
export function useCreateAlert() => UseMutationResult
export function useUpdateAlert() => UseMutationResult
export function useDeleteAlert() => UseMutationResult

// useAlertStream.ts — SSE
export function useAlertStream(projectId: string): {
  latestAlert: AlertEvent | null;
  isConnected: boolean;
}
// Implémentation : EventSource vers /v1/projects/{id}/stream
// Reconnexion automatique si la connexion se coupe (retry avec backoff 1s, 2s, 5s)

// useSessions.ts
export function useSessions(params: { projectId: string; withErrors?: boolean })
  => UseQueryResult<PaginatedResponse<Session>>
```

---

## 12. API Layer (backend)

### `backend/app/errors/service.py`

Génère les méthodes suivantes avec les requêtes ClickHouse réelles :

```python
async def list_error_groups(
    project_id: str,
    status: str = "unresolved",
    period: str = "7d",
    cursor: Optional[str] = None,
    limit: int = 25,
) -> dict:
    # Requête ClickHouse : COUNT par fingerprint + JOIN PostgreSQL pour le statut
    # Retourne items + cursor pour pagination

async def get_error_detail(
    project_id: str,
    fingerprint: str,
) -> dict:
    # Récupère le group depuis PG + les 10 derniers events depuis ClickHouse

async def get_dashboard_stats(
    project_id: str,
    period: str = "7d",
) -> dict:
    # totalErrors, usersAffected (HyperLogLog approximation), activeGroups
    # errorVolumeHistory : GROUP BY jour sur ClickHouse

async def resolve_error_group(
    project_id: str,
    fingerprint: str,
    user_id: str,
) -> bool:
    # UPDATE error_groups SET status='resolved' WHERE ...
```

---

## 13. API d'ingestion

### `ingest/app/router.py`

```python
@router.post("/api/v1/envelope", status_code=202)
async def ingest_event(
    request: Request,
    dsn: str = Header(alias="X-ErrorVault-DSN"),
):
    # 1. Valider le DSN (Redis cache → PostgreSQL fallback)
    # 2. Rate limiting Redis sliding window
    # 3. Parser et valider le payload (Pydantic)
    # 4. Pousser dans Kafka topic raw-events
    # 5. Retourner { "id": event_id } en 202
```

### `ingest/app/rate_limiter.py`

Implémente le rate limiting avec Redis sliding window :
```python
async def check_rate_limit(dsn: str, limit: int, window_seconds: int) -> bool:
    # ZADD key timestamp timestamp
    # ZREMRANGEBYSCORE key 0 (now - window)
    # ZCARD key
    # EXPIRE key window
```

---

## 14. Worker Event Processor

### `workers/event_processor/fingerprint.py`

```python
SYSTEM_FRAME_PATTERNS = [
    r'node_modules/',
    r'site-packages/',
    r'<frozen ',
    r'/usr/lib/python',
    r'webpack/bootstrap',
]

def is_system_frame(frame: dict) -> bool:
    # Vérifie si le frame provient d'une lib système

def normalize_message(message: str) -> str:
    # Supprime les parties dynamiques :
    # - nombres : \d+ → #
    # - UUIDs : [0-9a-f-]{36} → #uuid
    # - paths absolus : /home/user/... → #path
    # - tokens JWT/hex longs → #token

def compute_fingerprint(event: dict) -> str:
    # 1. Filtrer les frames système
    # 2. Prendre les 3 dernières frames app
    # 3. Construire la clé : type|normalized_message|file:func|file:func|file:func
    # 4. SHA-256[:16]
```

---

## 15. Docker Compose

Génère `docker-compose.yml` avec ces services :

- **postgres** : image `postgres:16-alpine`, port 5432, volume persistant, healthcheck
- **clickhouse** : image `clickhouse/clickhouse-server:24`, ports 9000 + 8123, volume persistant
- **redis** : image `redis:7-alpine`, port 6379, volume persistant
- **kafka** : image `confluentinc/cp-kafka:7.6.0` avec **zookeeper** intégré (ou KRaft mode), ports 9092
- **backend** : build `./backend`, port 8000, depends_on postgres + clickhouse + redis, env_file
- **ingest** : build `./ingest`, port 8001, depends_on kafka + redis, env_file
- **frontend** : build `./frontend`, port 3000, depends_on backend

---

## 16. Instructions supplémentaires pour Claude Code

1. **Typage strict** : aucun `any` dans le code TypeScript. Utilise `unknown` si nécessaire puis assert le type.

2. **Gestion d'erreur** : chaque appel API doit avoir un try/catch ou une gestion via TanStack Query `onError`. Afficher un toast ou un `EmptyState` en cas d'erreur.

3. **Loading states** : chaque composant qui fetch doit afficher un `LoadingSpinner` pendant le chargement.

4. **Responsive** : le layout doit fonctionner sur desktop (sidebar visible) et mobile (sidebar cachée, accessible via hamburger).

5. **Accessibilité** : tous les éléments interactifs doivent avoir `aria-label` ou `aria-describedby`. Les couleurs respectent un ratio de contraste WCAG AA minimum.

6. **Performance** :
   - Utilise `React.memo` sur les composants de liste (`ErrorItem`, `SessionItem`)
   - Utilise `useCallback` sur les handlers passés en props
   - Les listes longues utilisent la pagination cursor-based, jamais de chargement de toutes les données

7. **Conventions de nommage** :
   - Composants : PascalCase
   - Hooks : camelCase avec préfixe `use`
   - Types/interfaces : PascalCase
   - Constantes : SCREAMING_SNAKE_CASE
   - Fichiers composants : PascalCase.tsx
   - Fichiers hooks/utils : camelCase.ts

8. **Tests** : génère des tests unitaires pour :
   - `fingerprint.py` : 5 cas de test couvrant les variantes de messages et les frames système
   - `rate_limiter.py` : tests avec mock Redis
   - `useErrors.ts` : test du hook avec mock de l'API
   - `ErrorItem.tsx` : test de rendu avec différents statuts

9. **Commentaires** : commente uniquement les parties non évidentes (algorithmes, décisions d'architecture). Pas de commentaires sur du code trivial.

10. **Ordre de génération recommandé** :
    1. `docker-compose.yml` + variables d'environnement
    2. Types TypeScript (`frontend/src/types/`)
    3. Styles CSS (`globals.css`, `theme.css`)
    4. Composants UI de base (`ui/`)
    5. Layout (Sidebar, Topbar, Layout)
    6. Backend : modèles PG + migrations Alembic
    7. Backend : services + routers (errors, performance, alerts, sessions)
    8. Ingest : router + rate limiter + kafka producer
    9. Workers : fingerprint + event processor
    10. Frontend : hooks TanStack Query
    11. Frontend : pages dans l'ordre Dashboard → Errors → Performance → Alerts → Sessions → SDKs → Settings

---

## 17. Commandes de démarrage

Génère un `Makefile` à la racine avec ces targets :

```makefile
dev:          # docker-compose up + next dev + uvicorn en parallèle
install:      # npm install + pip install -r requirements.txt (tous les services)
migrate:      # alembic upgrade head
seed:         # insère des données de démo (1 org, 1 projet, 50 error groups)
test:         # pytest + jest en parallèle
lint:         # ruff + mypy + eslint
build:        # docker-compose build
clean:        # docker-compose down -v (supprime les volumes)
```

---

*Fin de la spécification — version 1.0 — Mai 2026*
