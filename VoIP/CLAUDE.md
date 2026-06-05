# WCA VoIP Platform — Spécifications pour Claude Code

> **Document de référence pour le développement avec Claude Code**
> Projet : Solution de téléphonie unifiée pour Wafacash Central Africa
> Référence appel d'offres : N° WAFACASH/SIEGE/SI/003/2025

---

## 📋 Vue d'ensemble

Tu vas développer une **solution de téléphonie unifiée complète** pour Wafacash Central Africa. C'est un projet microservices avec :

- **Backend Java** (Spring Boot 3.x) — cœur SIP, PBX, Call Center, Messagerie
- **Backend Python** (FastAPI) — Analytics, Monitoring, Intégrations tierces
- **Frontend Vue.js 3** + Tailwind CSS — 4 interfaces (Agent, Superviseur, Analytics, Admin)
- **Infrastructure** Docker + Kubernetes (Helm) on-premise
- **Données** PostgreSQL, Redis, MinIO, InfluxDB, Apache Kafka

### Exigences chiffrées

| Métrique | Valeur |
|----------|--------|
| Extensions SIP initiales | 80 |
| Agents Call Center | 6 |
| Utilisateurs messagerie | 180 |
| Canaux SIP Trunk | 5 entrants + 5 sortants simultanés |
| Disponibilité cible | 99.99% |
| Sites | Douala (siège), Yaoundé, Ndogbong, Congo (futur) |

---

## 🏗️ Architecture des microservices

### Structure du monorepo

```
voip-platform/
├── README.md
├── CLAUDE.md                          # Ce fichier
├── docker-compose.yml                 # Stack de dev local
├── .gitignore
├── .editorconfig
│
├── services/
│   ├── pbx-core/                      # Java — Cœur SIP/RTP
│   ├── callcenter/                    # Java — ACD + IVR + files
│   ├── messaging/                     # Java — Chat WebSocket
│   ├── omnichannel/                   # Java — WhatsApp + SMS
│   ├── api-gateway/                   # Java — Spring Cloud Gateway
│   ├── analytics/                     # Python — Reporting + CDR
│   ├── monitoring/                    # Python — QoS + alerting
│   └── integrations/                  # Python — GLPI + LDAP
│
├── frontend/
│   └── voip-ui/                       # Vue.js 3 + Tailwind + Vite
│
├── infra/
│   ├── k8s/                           # Manifests Kubernetes
│   ├── helm/                          # Charts Helm
│   ├── docker/                        # Dockerfiles partagés
│   └── scripts/                       # Provisioning, migrations
│
├── docs/
│   ├── architecture.md
│   ├── api-spec/                      # OpenAPI specs
│   └── deployment.md
│
└── tests/
    ├── integration/                   # Tests bout en bout
    └── load/                          # Tests de charge (k6)
```

### Diagramme de communication

```
┌─────────────────────────────────────────────────────────────┐
│  SIP Trunk Opérateur (5 entrants + 5 sortants)             │
└──────────────────────────┬──────────────────────────────────┘
                           │ SIP/TLS + SRTP
                  ┌────────▼────────┐
                  │   SBC / Proxy   │
                  └────────┬────────┘
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
   ┌────▼────┐      ┌──────▼──────┐    ┌──────▼──────┐
   │ PBX     │◄────►│ Call Center │◄──►│ Messaging   │
   │ Core    │      │  (ACD/IVR)  │    │ (WebSocket) │
   └────┬────┘      └──────┬──────┘    └──────┬──────┘
        │                  │                  │
        └─────────► Kafka ◄┴──────────────────┘
                     │
        ┌────────────┼────────────┐
        │            │            │
   ┌────▼────┐  ┌────▼────┐  ┌────▼────────┐
   │Analytics│  │Monitor. │  │Integrations │
   │(Python) │  │(Python) │  │(GLPI/LDAP)  │
   └─────────┘  └─────────┘  └─────────────┘
```

---

## 🟦 Microservices Java (Spring Boot 3.x)

### Configuration commune

- **JDK** : OpenJDK 21
- **Build** : Maven 3.9 (multi-module recommandé) ou Gradle 8
- **Framework** : Spring Boot 3.2+
- **Tests** : JUnit 5 + Mockito + Testcontainers
- **API doc** : springdoc-openapi (Swagger UI)
- **Lombok** : autorisé pour réduire le boilerplate

### Dépendances communes (pom.xml parent)

```xml
<properties>
  <java.version>21</java.version>
  <spring-boot.version>3.2.5</spring-boot.version>
  <spring-cloud.version>2023.0.1</spring-cloud.version>
  <jain-sip.version>1.3.0-91</jain-sip.version>
</properties>
```

### 1. PBX Core Service (`services/pbx-core/`)

**Rôle** : Cœur SIP — gestion des extensions, plan d'appel, messagerie vocale, conférences.

**Stack technique** :
- Spring Boot Web + Spring Security + Spring Data JPA
- `javax.sip:jain-sip-ri:1.3.0-91` pour la signalisation SIP
- `org.mobicents:media-server-impl` ou `Kurento` pour RTP/SRTP
- PostgreSQL via Hibernate
- Redis pour les sessions SIP actives

**Endpoints REST principaux** :
```
POST   /api/extensions              # Créer une extension
GET    /api/extensions/{ext}        # Détails extension
PUT    /api/extensions/{ext}        # Modifier
DELETE /api/extensions/{ext}        # Supprimer
GET    /api/extensions              # Lister (pagination)
POST   /api/dial-plan/rules         # Règles de routage
GET    /api/voicemail/{ext}         # Messages vocaux
POST   /api/conferences             # Créer conférence
```

**Modèles principaux** :
```java
@Entity
public class Extension {
    @Id private String number;        // "101", "102"...
    private String displayName;
    private String sipPassword;       // bcrypt
    private String userEmail;
    private boolean enabled;
    private SipDeviceType deviceType; // GRANDSTREAM, CISCO, SOFTPHONE
    private String macAddress;
    @ManyToOne private User adUser;   // Lien LDAP/AD
}

@Entity
public class CallDetailRecord {
    @Id @GeneratedValue private Long id;
    private String callId;            // SIP Call-ID
    private String fromNumber;
    private String toNumber;
    private Instant startTime;
    private Instant answerTime;
    private Instant endTime;
    private int durationSeconds;
    private CallStatus status;        // ANSWERED, MISSED, BUSY, FAILED
    private String agentExtension;
}
```

**Points critiques** :
- Provisioning auto : génération de fichiers de config pour téléphones IP (Grandstream GXP2170, Cisco 9851, Alcatel M7s, Cisco 7821 existants)
- Migration des Cisco 7821 existants vers le nouveau PBX (reconfiguration SIP)
- Synchronisation LDAP/AD via job Spring `@Scheduled` toutes les 15 min
- Publication des CDR dans Kafka topic `voip.cdr` après chaque appel

### 2. Call Center Service (`services/callcenter/`)

**Rôle** : ACD, IVR configurable, files d'attente, supervision temps réel.

**Stack technique** :
- Spring Boot WebSocket (STOMP) pour le temps réel
- Spring Data JPA + PostgreSQL
- Redis pour l'état temps réel des files
- Communication inter-services via Kafka

**Endpoints REST** :
```
POST   /api/queues                    # Créer une file d'attente
GET    /api/queues/{id}/stats         # Stats temps réel
POST   /api/ivr/menus                 # Configurer IVR
POST   /api/agents/{ext}/status       # Changer statut (available/break/busy)
GET    /api/supervision/agents       # Vue superviseur (tous agents)
POST   /api/calls/{id}/transfer       # Transfert vers autre agent
POST   /api/calls/{id}/hangup
```

**WebSocket topics** :
```
/topic/queue/{queueId}/updates       # Mise à jour file
/topic/agent/{ext}/notifications     # Notif personnelle
/topic/supervision/dashboard          # Dashboard temps réel
```

**Algorithme ACD** (à implémenter) :
1. **Round-robin** : distribution équitable
2. **Skills-based routing** : matching compétences agent/appel
3. **Priorité** : file VIP traitée en premier
4. **Longest-idle** : agent inactif depuis le plus longtemps

**Modèle d'IVR** (arbre de décision JSON stocké en base) :
```json
{
  "menuId": "main",
  "prompt": "Bienvenue chez Wafacash. Tapez 1 pour le support, 2 pour les transferts.",
  "options": {
    "1": { "type": "QUEUE", "queueId": "support" },
    "2": { "type": "QUEUE", "queueId": "transferts" },
    "0": { "type": "OPERATOR", "extension": "100" }
  },
  "timeout": 10,
  "maxRetries": 3
}
```

### 3. Messaging Service (`services/messaging/`)

**Rôle** : Messagerie instantanée 180 utilisateurs avec WebSocket.

**Stack technique** :
- Spring Boot WebSocket + STOMP
- Spring Data JPA + PostgreSQL
- Redis Pub/Sub pour la distribution multi-instances
- MinIO pour les fichiers partagés

**Endpoints REST** :
```
POST   /api/conversations             # Créer conversation (1-à-1 ou groupe)
GET    /api/conversations             # Liste conversations utilisateur
GET    /api/conversations/{id}/messages  # Historique paginé
POST   /api/conversations/{id}/messages  # Envoyer message
POST   /api/files/upload              # Upload fichier (vers MinIO)
GET    /api/presence/users            # Statut de tous les utilisateurs
```

**WebSocket** :
```
/app/chat/{conversationId}            # Envoyer message
/topic/conversations/{id}             # Recevoir messages
/topic/presence                       # Changements de statut
```

**Modèles** :
```java
@Entity
public class Conversation {
    @Id @GeneratedValue private UUID id;
    private ConversationType type;    // ONE_TO_ONE, GROUP
    private String name;              // null si 1-à-1
    @ManyToMany private Set<User> participants;
    private Instant createdAt;
}

@Entity
public class Message {
    @Id @GeneratedValue private UUID id;
    @ManyToOne private Conversation conversation;
    @ManyToOne private User sender;
    private String content;
    private MessageType type;         // TEXT, FILE, IMAGE, AUDIO
    private String fileUrl;           // null si TEXT
    private Instant sentAt;
    private Set<UUID> readBy;
}
```

### 4. Omnichannel Service (`services/omnichannel/`)

**Rôle** : WhatsApp Business API + SMS, routage unifié vers ACD.

**Stack technique** :
- Spring Boot Web
- Client WhatsApp Cloud API (REST)
- Kafka pour relayer les messages au Call Center
- Webhooks entrants/sortants

**Endpoints** :
```
POST   /webhook/whatsapp              # Webhook entrant WhatsApp
POST   /webhook/sms                   # Webhook entrant SMS
POST   /api/messages/send             # Envoi sortant
GET    /api/templates                 # Templates WhatsApp approuvés
```

**Format des messages publiés sur Kafka** :
```json
{
  "channel": "WHATSAPP",
  "from": "+237691234567",
  "to": "237680019746",
  "content": "Bonjour, j'ai un problème...",
  "timestamp": "2026-06-15T10:23:45Z",
  "messageId": "wamid.xxx"
}
```

### 5. API Gateway (`services/api-gateway/`)

**Rôle** : Point d'entrée unifié, authentification JWT, routage.

**Stack** : Spring Cloud Gateway + Spring Security.

**Configuration des routes** :
```yaml
spring:
  cloud:
    gateway:
      routes:
        - id: pbx-core
          uri: http://pbx-core:8080
          predicates: [Path=/api/extensions/**, /api/calls/**]
        - id: callcenter
          uri: http://callcenter:8080
          predicates: [Path=/api/queues/**, /api/agents/**]
        - id: messaging
          uri: http://messaging:8080
          predicates: [Path=/api/conversations/**]
        - id: analytics
          uri: http://analytics:8000
          predicates: [Path=/api/analytics/**, /api/cdr/**]
```

**Authentification** :
- JWT signé HS256 (durée 1h) + refresh token (24h)
- Validation LDAP au login via Integrations Service
- Rôles : `ROLE_AGENT`, `ROLE_SUPERVISOR`, `ROLE_ADMIN`

---

## 🐍 Microservices Python (FastAPI)

### Configuration commune

- **Python** : 3.11+
- **Framework** : FastAPI 0.110+
- **Gestionnaire de paquets** : Poetry
- **ORM** : SQLAlchemy 2.0 (async) + Alembic pour migrations
- **Tests** : pytest + httpx + pytest-asyncio
- **Linting** : ruff + black + mypy

### pyproject.toml type

```toml
[tool.poetry]
name = "analytics-service"
version = "0.1.0"

[tool.poetry.dependencies]
python = "^3.11"
fastapi = "^0.110.0"
uvicorn = {extras = ["standard"], version = "^0.27.0"}
sqlalchemy = {extras = ["asyncio"], version = "^2.0.25"}
asyncpg = "^0.29.0"
alembic = "^1.13.0"
pydantic = "^2.6.0"
pydantic-settings = "^2.2.0"
httpx = "^0.27.0"
aiokafka = "^0.10.0"
redis = {extras = ["hiredis"], version = "^5.0.0"}
pandas = "^2.2.0"
influxdb-client = "^1.40.0"
```

### 1. Analytics Service (`services/analytics/`)

**Rôle** : Reporting CDR, dashboards, taxation, exports.

**Endpoints principaux** :
```
GET  /api/analytics/dashboard        # KPIs globaux temps réel
GET  /api/analytics/calls/volume     # Volume par heure/jour
GET  /api/analytics/agents/performance  # Performance agents
GET  /api/analytics/taxation         # Suivi des coûts
GET  /api/cdr/export                 # Export CSV/JSON
POST /api/reports/generate           # Rapport PDF custom
```

**Structure recommandée** :
```
analytics/
├── pyproject.toml
├── alembic.ini
├── app/
│   ├── main.py                      # Point d'entrée FastAPI
│   ├── config.py                    # Settings (pydantic-settings)
│   ├── api/
│   │   ├── dashboard.py
│   │   ├── calls.py
│   │   ├── agents.py
│   │   └── exports.py
│   ├── core/
│   │   ├── database.py              # SQLAlchemy session
│   │   ├── kafka.py                 # Consumer CDR
│   │   └── security.py              # JWT validation
│   ├── models/
│   │   ├── cdr.py
│   │   └── reports.py
│   ├── services/
│   │   ├── cdr_processor.py         # Consume Kafka, persist
│   │   ├── dashboard_builder.py     # KPI calculations
│   │   └── pdf_generator.py         # WeasyPrint
│   └── schemas/                     # Pydantic models
├── alembic/
└── tests/
```

**Kafka consumer pour CDR** :
```python
from aiokafka import AIOKafkaConsumer

async def consume_cdr_stream():
    consumer = AIOKafkaConsumer(
        "voip.cdr",
        bootstrap_servers="kafka:9092",
        group_id="analytics-cdr-consumer",
        value_deserializer=lambda v: json.loads(v.decode())
    )
    await consumer.start()
    try:
        async for msg in consumer:
            await process_cdr(msg.value)
    finally:
        await consumer.stop()
```

### 2. Monitoring Service (`services/monitoring/`)

**Rôle** : Surveillance QoS VoIP, alerting, détection de fraude.

**Endpoints** :
```
GET  /api/monitoring/health           # Status de tous les services
GET  /api/monitoring/qos              # MOS, jitter, latence
POST /api/monitoring/alerts/rules     # Configurer seuils d'alerte
GET  /api/monitoring/fraud/incidents  # Incidents de fraude détectés
```

**Logique de détection de fraude** (à implémenter) :
- Appels vers destinations exotiques (Cuba, Somalie...) > 100€/jour
- Volume anormal hors heures ouvrées
- Patterns suspects (séquences de numéros incrémentaux)

**Métriques exposées sur InfluxDB** :
```python
from influxdb_client import Point

point = Point("voip_quality") \
    .tag("call_id", call_id) \
    .tag("agent", agent_ext) \
    .field("mos_score", 4.2) \
    .field("jitter_ms", 12) \
    .field("packet_loss_percent", 0.1) \
    .field("latency_ms", 45)
```

### 3. Integrations Service (`services/integrations/`)

**Rôle** : GLPI, Active Directory, provisioning auto.

**Endpoints** :
```
POST /api/integrations/glpi/tickets   # Créer ticket lors d'appel entrant
POST /api/integrations/ldap/sync      # Forcer sync LDAP
GET  /api/integrations/ldap/users     # Liste users AD
POST /api/integrations/provisioning   # Provisionning auto téléphone IP
```

**GLPI client** (création ticket automatique) :
```python
import httpx

async def create_glpi_ticket(call_data: dict) -> str:
    async with httpx.AsyncClient() as client:
        # Init session
        init_resp = await client.get(
            f"{GLPI_URL}/initSession",
            headers={"Authorization": f"user_token {GLPI_TOKEN}"}
        )
        session_token = init_resp.json()["session_token"]
        
        # Create ticket
        ticket_resp = await client.post(
            f"{GLPI_URL}/Ticket",
            headers={"Session-Token": session_token},
            json={
                "input": {
                    "name": f"Appel entrant de {call_data['from']}",
                    "content": f"Appel reçu à {call_data['timestamp']}",
                    "type": 1,
                    "urgency": 3
                }
            }
        )
        return ticket_resp.json()["id"]
```

---

## 🎨 Frontend Vue.js 3 + Tailwind CSS

### Configuration

```bash
npm create vite@latest voip-ui -- --template vue
cd voip-ui
npm install
npm install -D tailwindcss postcss autoprefixer
npm install pinia vue-router@4 axios sip.js @stomp/stompjs sockjs-client chart.js vue-chartjs
```

### Structure du projet

```
voip-ui/
├── package.json
├── vite.config.js
├── tailwind.config.js
├── index.html
├── src/
│   ├── main.js                      # Point d'entrée
│   ├── App.vue
│   ├── router/
│   │   └── index.js                 # Vue Router
│   ├── stores/                      # Pinia
│   │   ├── auth.js
│   │   ├── call.js                  # État appel courant
│   │   ├── agent.js                 # Statut agent
│   │   └── messaging.js
│   ├── composables/
│   │   ├── useSIP.js                # SIP.js wrapper
│   │   ├── useWebSocket.js          # STOMP client
│   │   ├── useCallCenter.js
│   │   └── useApi.js                # Axios instance
│   ├── views/
│   │   ├── LoginView.vue
│   │   ├── AgentView.vue            # Interface agent
│   │   ├── SupervisorView.vue       # Interface superviseur
│   │   ├── AnalyticsView.vue        # Dashboard analytics
│   │   └── AdminView.vue            # Administration
│   ├── components/
│   │   ├── common/                  # Boutons, modales, badges
│   │   ├── call/                    # Numéroteur, fiche appel
│   │   ├── chat/                    # Messagerie
│   │   ├── supervisor/              # Widgets temps réel
│   │   └── charts/                  # Graphiques Chart.js
│   └── assets/
│       └── css/
│           └── main.css             # Tailwind directives
└── public/
```

### Composable `useSIP.js` (exemple complet)

```javascript
import { ref, onUnmounted } from 'vue'
import { UserAgent, Registerer, Inviter } from 'sip.js'

export function useSIP() {
  const ua = ref(null)
  const registerer = ref(null)
  const currentSession = ref(null)
  const isRegistered = ref(false)
  const callState = ref('idle') // idle, ringing, active, hold
  
  async function connect(config) {
    ua.value = new UserAgent({
      uri: UserAgent.makeURI(`sip:${config.extension}@${config.domain}`),
      transportOptions: {
        server: `wss://${config.domain}:7443/ws`
      },
      authorizationUsername: config.extension,
      authorizationPassword: config.password,
      delegate: {
        onInvite: (invitation) => handleIncomingCall(invitation)
      }
    })
    
    await ua.value.start()
    registerer.value = new Registerer(ua.value)
    await registerer.value.register()
    isRegistered.value = true
  }
  
  async function makeCall(target) {
    const targetURI = UserAgent.makeURI(`sip:${target}@${ua.value.configuration.uri.host}`)
    const inviter = new Inviter(ua.value, targetURI)
    currentSession.value = inviter
    callState.value = 'ringing'
    
    await inviter.invite()
    callState.value = 'active'
  }
  
  function handleIncomingCall(invitation) {
    callState.value = 'ringing'
    currentSession.value = invitation
  }
  
  async function answer() {
    await currentSession.value.accept()
    callState.value = 'active'
  }
  
  async function hangup() {
    if (currentSession.value) {
      await currentSession.value.bye?.() || currentSession.value.reject?.()
      callState.value = 'idle'
      currentSession.value = null
    }
  }
  
  onUnmounted(() => {
    registerer.value?.unregister()
    ua.value?.stop()
  })
  
  return { isRegistered, callState, currentSession, connect, makeCall, answer, hangup }
}
```

### Routes Vue Router

```javascript
import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/login', component: () => import('@/views/LoginView.vue') },
    { path: '/agent', component: () => import('@/views/AgentView.vue'), meta: { role: 'AGENT' } },
    { path: '/supervisor', component: () => import('@/views/SupervisorView.vue'), meta: { role: 'SUPERVISOR' } },
    { path: '/analytics', component: () => import('@/views/AnalyticsView.vue'), meta: { role: 'SUPERVISOR' } },
    { path: '/admin', component: () => import('@/views/AdminView.vue'), meta: { role: 'ADMIN' } },
  ]
})

router.beforeEach((to, from, next) => {
  const auth = useAuthStore()
  if (to.meta.role && !auth.hasRole(to.meta.role)) {
    next('/login')
  } else {
    next()
  }
})
```

### Tailwind config — palette WCA

```javascript
module.exports = {
  content: ['./index.html', './src/**/*.{vue,js,ts}'],
  theme: {
    extend: {
      colors: {
        wca: {
          primary: '#1F3A8A',    // Bleu Wafacash
          accent: '#FFB800',     // Jaune accent
          dark: '#0F1117',
          surface: '#1A1D27'
        }
      },
      fontFamily: {
        sans: ['DM Sans', 'system-ui', 'sans-serif'],
        mono: ['IBM Plex Mono', 'monospace']
      }
    }
  }
}
```

---

## 💾 Bases de données

### PostgreSQL — Schémas par service

Créer **une base distincte par service** (pattern database-per-service) :

```sql
CREATE DATABASE voip_core;        -- pbx-core
CREATE DATABASE voip_callcenter;  -- callcenter
CREATE DATABASE voip_messaging;   -- messaging
CREATE DATABASE voip_analytics;   -- analytics
```

### Migrations

- **Java** : Flyway (recommandé) ou Liquibase, scripts dans `src/main/resources/db/migration/`
- **Python** : Alembic, scripts dans `alembic/versions/`

### Redis — Usage par service

| Préfixe clé | Service | TTL |
|-------------|---------|-----|
| `sip:session:{callId}` | pbx-core | 4h |
| `presence:user:{userId}` | messaging | 5min |
| `queue:waiting:{queueId}` | callcenter | persistant |
| `jwt:blacklist:{token}` | api-gateway | 1h |

### Kafka — Topics

| Topic | Producteur | Consommateurs | Format |
|-------|------------|---------------|--------|
| `voip.cdr` | pbx-core, callcenter | analytics | JSON |
| `voip.calls.events` | pbx-core | callcenter, monitoring | JSON |
| `voip.messages.incoming` | omnichannel | callcenter, messaging | JSON |
| `voip.alerts` | monitoring | (notification email/SMS) | JSON |
| `voip.audit` | tous | (archivage) | JSON |

---

## 🐳 Docker & Kubernetes

### Dockerfile Java type (multi-stage)

```dockerfile
FROM maven:3.9-eclipse-temurin-21 AS builder
WORKDIR /build
COPY pom.xml .
COPY src ./src
RUN mvn clean package -DskipTests

FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY --from=builder /build/target/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
```

### Dockerfile Python type

```dockerfile
FROM python:3.11-slim AS builder
RUN pip install poetry==1.7.1
WORKDIR /build
COPY pyproject.toml poetry.lock ./
RUN poetry config virtualenvs.create false && poetry install --no-dev --no-root

FROM python:3.11-slim
WORKDIR /app
COPY --from=builder /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin
COPY app/ ./app/
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### docker-compose.yml (dev local)

À créer à la racine avec :
- PostgreSQL 15, Redis 7, Kafka + Zookeeper, MinIO, InfluxDB 2
- Tous les microservices avec hot-reload
- Frontend Vue.js sur port 5173

### Helm charts (`infra/helm/`)

Un chart par service avec values.yaml configurables :

```
infra/helm/
├── pbx-core/
│   ├── Chart.yaml
│   ├── values.yaml
│   └── templates/
│       ├── deployment.yaml
│       ├── service.yaml
│       ├── configmap.yaml
│       ├── secret.yaml
│       └── ingress.yaml
└── ... (un dossier par service)
```

---

## 🔒 Sécurité

### Règles obligatoires

1. **Aucun secret en clair** — utiliser Kubernetes Secrets ou Vault
2. **Toutes les APIs derrière JWT** — sauf `/health`, `/metrics`
3. **mTLS entre microservices** via Istio Service Mesh
4. **Mots de passe SIP en bcrypt** dans la base
5. **TLS 1.3 minimum** pour HTTPS et SIP/TLS
6. **SRTP obligatoire** pour le média
7. **Audit log** de toutes les actions admin

### JWT structure attendue

```json
{
  "sub": "user-uuid",
  "username": "alice.mbarga",
  "extension": "101",
  "roles": ["ROLE_AGENT"],
  "iat": 1717000000,
  "exp": 1717003600
}
```

---

## 🧪 Tests

### Couverture cible

- **Backend Java** : 80% de couverture (JUnit 5 + Mockito + Testcontainers)
- **Backend Python** : 80% (pytest + httpx)
- **Frontend Vue.js** : 60% (Vitest + Vue Test Utils)
- **E2E** : scenarios critiques avec Playwright

### Tests critiques à implémenter

1. **Appel SIP entrant complet** : SIP Trunk → SBC → PBX → ACD → Agent
2. **Transfert d'appel** entre agents
3. **IVR multi-niveaux** avec timeout
4. **WebSocket messagerie** : envoi/réception temps réel
5. **Création auto ticket GLPI** lors d'appel entrant
6. **Bascule PRA** : simulation panne nœud Kubernetes
7. **Charge** : 80 appels simultanés sans dégradation MOS

---

## 📦 CI/CD

### Pipeline GitLab CI (`.gitlab-ci.yml` type)

```yaml
stages:
  - lint
  - test
  - build
  - scan
  - deploy

variables:
  DOCKER_REGISTRY: harbor.wafacash.cm

lint:java:
  stage: lint
  script: mvn checkstyle:check spotbugs:check

lint:python:
  stage: lint
  script: ruff check . && black --check . && mypy app/

test:java:
  stage: test
  script: mvn verify

test:python:
  stage: test
  script: pytest --cov=app --cov-report=xml

build:docker:
  stage: build
  script:
    - docker build -t $DOCKER_REGISTRY/voip-$SERVICE:$CI_COMMIT_SHA .
    - docker push $DOCKER_REGISTRY/voip-$SERVICE:$CI_COMMIT_SHA

scan:security:
  stage: scan
  script: trivy image $DOCKER_REGISTRY/voip-$SERVICE:$CI_COMMIT_SHA

deploy:staging:
  stage: deploy
  script: helm upgrade --install voip-$SERVICE infra/helm/$SERVICE/
  only: [develop]
```

---

## 📝 Conventions de code

### Java

- **Naming** : `UpperCamelCase` classes, `lowerCamelCase` méthodes, `UPPER_SNAKE_CASE` constantes
- **Packages** : `cm.wafacash.voip.{service}.{layer}` (ex: `cm.wafacash.voip.pbx.controller`)
- **Architecture** : controller → service → repository (séparation stricte)
- **DTO obligatoires** pour les endpoints REST (pas d'exposition des entités JPA)
- **Validation** : `@Valid` + Bean Validation
- **Exceptions** : `@ControllerAdvice` global pour error handling

### Python

- **Style** : PEP 8 + black (line length 100)
- **Type hints obligatoires** sur toutes les fonctions publiques
- **Async par défaut** pour les endpoints I/O-bound
- **Structure** : `app/api/`, `app/services/`, `app/models/`, `app/schemas/`
- **Pydantic v2** pour validation

### Vue.js

- **Composition API + `<script setup>`** uniquement (pas d'Options API)
- **TypeScript optionnel** mais recommandé
- **Composants** : `PascalCase.vue`
- **Props** : `camelCase` en JS, `kebab-case` en template
- **Pinia stores** : un store par domaine fonctionnel

### Git

- **Branches** : `main` (prod), `develop` (intégration), `feature/*`, `fix/*`, `release/*`
- **Commits** : Conventional Commits (`feat:`, `fix:`, `docs:`, `refactor:`, `test:`)
- **Pull Requests** : revue obligatoire par au moins 1 personne

---

## 🚀 Ordre de développement recommandé

Suivre cet ordre pour livrer dans les 30 jours :

### Sprint 1 (J1-J5) — Fondations
1. Initialiser le monorepo et la structure
2. Créer `docker-compose.yml` avec les bases de données
3. Squelette des 8 microservices (Hello World endpoints + Dockerfiles)
4. Setup CI/CD GitLab
5. Initialiser le projet Vue.js avec layout de base

### Sprint 2 (J5-J12) — Cœur PBX
1. **pbx-core** : signalisation SIP basique (REGISTER, INVITE, BYE)
2. **pbx-core** : gestion CRUD des extensions + LDAP sync
3. **pbx-core** : plan d'appel et routage
4. **api-gateway** : JWT + routes vers pbx-core
5. **Frontend** : page login + interface agent (numéroteur simple)

### Sprint 3 (J10-J18) — Call Center
1. **callcenter** : ACD round-robin + skills-based
2. **callcenter** : IVR configurable + files d'attente
3. **callcenter** : WebSocket supervision temps réel
4. **Frontend** : interface superviseur complète
5. Tests d'intégration PBX + Call Center

### Sprint 4 (J15-J22) — Messagerie & Omnicanal
1. **messaging** : WebSocket + persistence messages
2. **messaging** : présence + fichiers via MinIO
3. **omnichannel** : intégration WhatsApp Business API
4. **omnichannel** : SMS gateway
5. **Frontend** : interface chat + intégration omnicanale

### Sprint 5 (J18-J26) — Analytics & Intégrations
1. **analytics** : consommation Kafka CDR + dashboards
2. **analytics** : exports CSV/PDF
3. **monitoring** : métriques QoS InfluxDB + alerting
4. **integrations** : GLPI + provisioning auto
5. **Frontend** : dashboard analytics complet

### Sprint 6 (J24-J30) — Recette & Production
1. Déploiement complet Kubernetes
2. Tests de charge (80 appels simultanés)
3. Tests PRA (bascule de nœud)
4. Documentation exploitation
5. Formation équipe SI WCA
6. VABF (Vérification d'Aptitude au Bon Fonctionnement)

---

## ⚠️ Points d'attention critiques

1. **Compatibilité Cisco 7821 existants** : impératif, fournir les fichiers de provisioning
2. **Multisite Yaoundé/Ndogbong/Congo** : SIP Trunk inter-sites avec QoS
3. **Délai 30 jours ouvrables** : strict, pénalité 1/1000 du marché par jour de retard
4. **Conformité ISO 27001 + RGPD** : journalisation, chiffrement, RBAC
5. **Backup Hyper-V Dell Networker** : la solution doit s'aligner sur la politique existante
6. **Formation en français** : tous les livrables et formations en français

---

## 📚 Ressources utiles

- **JAIN-SIP** : https://github.com/usnistgov/jsip
- **SIP.js** : https://sipjs.com/
- **Spring Boot 3** : https://docs.spring.io/spring-boot/
- **FastAPI** : https://fastapi.tiangolo.com/
- **Vue 3 Composition API** : https://vuejs.org/guide/extras/composition-api-faq.html
- **Helm** : https://helm.sh/docs/
- **WhatsApp Business API** : https://developers.facebook.com/docs/whatsapp/

---

## 🎯 Commande pour démarrer avec Claude Code

```bash
# 1. Cloner le repo (à créer)
git clone <url-repo> voip-platform && cd voip-platform

# 2. Placer ce fichier à la racine sous le nom CLAUDE.md

# 3. Démarrer Claude Code
claude

# 4. Premier prompt suggéré :
# "Lis le fichier CLAUDE.md et initialise le monorepo selon la structure décrite.
#  Commence par créer le docker-compose.yml avec PostgreSQL, Redis, Kafka, MinIO
#  et InfluxDB, puis crée les squelettes des 8 microservices avec Hello World."
```

---

**Fin du document — Bonne implémentation !**
