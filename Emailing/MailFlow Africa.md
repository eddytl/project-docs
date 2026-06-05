# MailFlow Africa — Spécifications Fonctionnelles

> **Version** : 1.0 | **Statut** : Draft | **Date** : Juin 2025

---

## Contexte Projet

SaaS d'emailing B2B professionnel ciblant toutes les entreprises, avec modules spécialisés pour les banques et institutions de microfinance. Positionnement : autonomie totale du client (domaine propre), contenu portable (page web publique), adapté au marché africain.

---

## Stack Technique

| Couche | Technologie |
|--------|-------------|
| Frontend | Vue.js 3 + Vite + Pinia + Tailwind CSS |
| Backend | Python FastAPI |
| Base de données | PostgreSQL |
| Cache & Queues | Redis + Celery |
| Envoi Email | Amazon SES |
| Stockage | AWS S3 + CloudFront CDN |
| Paiements Afrique | CinetPay + Paystack |
| Paiements Global | Stripe |
| Infrastructure | Docker + Kubernetes |

---

## Architecture

- **Multi-tenant** : isolation par `organisation_id` sur toutes les tables métier + Row Level Security PostgreSQL
- **Internationalisation** : Français + Anglais (détection auto + choix manuel)
- **Authentification** : JWT (access token 15min + refresh token 7j)
- **Envoi asynchrone** : Celery workers pour les campagnes massives

---

## Périmètre de Développement

```
Phase 1 — MVP            (Mois 1–4)
Phase 2 — Croissance     (Mois 5–8)
Marketplace Templates    (Mois 6–9)
Module Banque & MFI      (Mois 7–10)
```

---

## Phase 1 — MVP

### 1.1 Authentification & Comptes

- Inscription email + mot de passe
- JWT access token (15min) + refresh token (7j)
- Réinitialisation mot de passe par email
- Vérification email à l'inscription
- 2FA via TOTP (Google Authenticator, Authy)
- Création organisation à la première connexion (nom, secteur, pays, devise)
- Invitation membres par email

### 1.2 Rôles & Permissions

6 rôles prédéfinis avec permissions granulaires vérifiées à chaque appel API :

| Rôle | Accès |
|------|-------|
| `owner` | Tous droits + facturation + suppression compte |
| `admin` | Tous droits sauf facturation |
| `manager` | Campagnes + contacts + templates (pas paramètres) |
| `editor` | Créer/modifier templates et campagnes (pas envoi) |
| `analyst` | Analytics lecture seule + exports |
| `viewer` | Lecture seule sur tout |

**Permissions granulaires** (codes) :

```
campaigns.create / campaigns.send / campaigns.delete
contacts.create / contacts.import / contacts.delete / contacts.export
templates.create / templates.delete
domains.configure
billing.manage
members.invite / members.remove
analytics.view / analytics.export
```

**Schéma BDD — Auth & Permissions** :

```sql
CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email           VARCHAR(255) UNIQUE NOT NULL,
    password_hash   TEXT NOT NULL,
    full_name       VARCHAR(255),
    is_verified     BOOLEAN DEFAULT FALSE,
    totp_secret     TEXT,
    totp_enabled    BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW()
);

CREATE TABLE organisations (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(255) NOT NULL,
    slug            VARCHAR(100) UNIQUE NOT NULL,
    sector          VARCHAR(100),
    country         VARCHAR(100),
    currency        VARCHAR(10) DEFAULT 'XOF',
    timezone        VARCHAR(100) DEFAULT 'Africa/Abidjan',
    language        VARCHAR(10) DEFAULT 'fr',
    logo_url        TEXT,
    created_at      TIMESTAMP DEFAULT NOW()
);

CREATE TABLE roles (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    is_custom   BOOLEAN DEFAULT FALSE
);

CREATE TABLE permissions (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code        VARCHAR(100) UNIQUE NOT NULL,
    module      VARCHAR(50),
    description TEXT
);

CREATE TABLE role_permissions (
    role_id         UUID REFERENCES roles(id) ON DELETE CASCADE,
    permission_id   UUID REFERENCES permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE organisation_members (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id         UUID NOT NULL REFERENCES roles(id),
    invited_by      UUID REFERENCES users(id),
    joined_at       TIMESTAMP,
    status          VARCHAR(20) DEFAULT 'pending', -- pending | active | suspended
    created_at      TIMESTAMP DEFAULT NOW(),
    UNIQUE(organisation_id, user_id)
);
```

---

### 1.3 Configuration Domaine d'Envoi

**Flux** :

1. Client saisit son domaine (ex: `banque-atlas.com`)
2. Système appelle `ses_client.verify_domain_identity(Domain=domain)` → token SPF
3. Système appelle `ses_client.verify_domain_dkim(Domain=domain)` → 3 tokens CNAME
4. Affichage des enregistrements DNS avec bouton "Copier" par ligne
5. Vérification automatique toutes les 10 minutes (tâche Celery)
6. Notification email + in-app à la validation complète

**Enregistrements générés** :

```
SPF   TXT  domaine.com               "v=spf1 include:amazonses.com ~all"
DKIM  CNAME abc123._domainkey.dom   abc123.dkim.amazonses.com
DKIM  CNAME xyz789._domainkey.dom   xyz789.dkim.amazonses.com
DKIM  CNAME mno345._domainkey.dom   mno345.dkim.amazonses.com
DMARC TXT  _dmarc.domaine.com       "v=DMARC1; p=quarantine; rua=mailto:..."
SES   TXT  _amazonses.domaine.com   "<token_ses>"
```

**Schéma BDD** :

```sql
CREATE TABLE domain_configs (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id         UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    domain                  VARCHAR(255) NOT NULL UNIQUE,
    ses_verification_token  TEXT,
    dkim_tokens             TEXT[],
    spf_status              VARCHAR(20) DEFAULT 'pending',   -- pending|verified|failed
    dkim_status             VARCHAR(20) DEFAULT 'pending',
    dmarc_status            VARCHAR(20) DEFAULT 'pending',
    domain_status           VARCHAR(20) DEFAULT 'pending',   -- pending|verified|failed
    is_active               BOOLEAN DEFAULT FALSE,
    created_at              TIMESTAMP DEFAULT NOW(),
    verified_at             TIMESTAMP,
    last_checked_at         TIMESTAMP
);

CREATE TABLE senders (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id     UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    domain_config_id    UUID NOT NULL REFERENCES domain_configs(id) ON DELETE CASCADE,
    from_name           VARCHAR(255) NOT NULL,
    from_email          VARCHAR(255) NOT NULL,
    reply_to            VARCHAR(255),
    is_default          BOOLEAN DEFAULT FALSE,
    created_at          TIMESTAMP DEFAULT NOW()
);
```

**Service Python** :

```python
# app/services/domain_service.py
import boto3

ses = boto3.client('ses', region_name='eu-west-1')

async def register_domain(organisation_id: str, domain: str) -> dict:
    spf_response  = ses.verify_domain_identity(Domain=domain)
    dkim_response = ses.verify_domain_dkim(Domain=domain)
    return {
        "verification_token": spf_response['VerificationToken'],
        "dkim_tokens": dkim_response['DkimTokens'],
    }

async def check_domain_status(domain: str) -> dict:
    spf = ses.get_identity_verification_attributes(Identities=[domain])
    dkim = ses.get_identity_dkim_attributes(Identities=[domain])
    return {
        "spf_verified":  spf['VerificationAttributes'][domain]['VerificationStatus'] == 'Success',
        "dkim_verified": dkim['DkimAttributes'][domain]['DkimVerificationStatus'] == 'Success',
    }
```

**Tâche Celery de vérification** :

```python
# app/tasks/domain_tasks.py
@celery_app.task
def check_pending_domains():
    """Lancée toutes les 10 minutes via beat scheduler"""
    pending = db.query(DomainConfig).filter_by(domain_status='pending').all()
    for domain_config in pending:
        status = check_domain_status(domain_config.domain)
        if status['spf_verified'] and status['dkim_verified']:
            domain_config.domain_status = 'verified'
            domain_config.verified_at   = datetime.utcnow()
            notify_organisation(domain_config.organisation_id, 'domain_verified')
    db.commit()
```

---

### 1.4 Gestion des Contacts

**Schéma BDD** :

```sql
CREATE TYPE contact_status AS ENUM (
    'active', 'unsubscribed', 'hard_bounced',
    'soft_bounced', 'complained', 'blocked'
);

CREATE TABLE contacts (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    email           VARCHAR(255) NOT NULL,
    first_name      VARCHAR(255),
    last_name       VARCHAR(255),
    phone           VARCHAR(50),
    status          contact_status DEFAULT 'active',
    bounce_count    INTEGER DEFAULT 0,
    last_bounce_at  TIMESTAMP,
    bounce_reason   TEXT,
    source          VARCHAR(100),       -- import | form | api | manual
    engagement_score INTEGER DEFAULT 50, -- 0 à 100
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW(),
    UNIQUE(organisation_id, email)
);

CREATE TABLE custom_fields (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    name            VARCHAR(100) NOT NULL,
    field_key       VARCHAR(100) NOT NULL,
    field_type      VARCHAR(20) NOT NULL, -- text|number|date|boolean
    is_required     BOOLEAN DEFAULT FALSE,
    UNIQUE(organisation_id, field_key)
);

CREATE TABLE contact_field_values (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contact_id  UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    field_id    UUID NOT NULL REFERENCES custom_fields(id) ON DELETE CASCADE,
    value       TEXT,
    PRIMARY KEY (contact_id, field_id)
);

CREATE TABLE contact_lists (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    name            VARCHAR(255) NOT NULL,
    description     TEXT,
    is_dynamic      BOOLEAN DEFAULT FALSE,
    segment_rules   JSONB,               -- Règles pour segments dynamiques
    contact_count   INTEGER DEFAULT 0,
    created_at      TIMESTAMP DEFAULT NOW()
);

CREATE TABLE list_contacts (
    list_id     UUID REFERENCES contact_lists(id) ON DELETE CASCADE,
    contact_id  UUID REFERENCES contacts(id) ON DELETE CASCADE,
    added_at    TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (list_id, contact_id)
);

CREATE TABLE contact_tags (
    contact_id  UUID REFERENCES contacts(id) ON DELETE CASCADE,
    tag         VARCHAR(100) NOT NULL,
    PRIMARY KEY (contact_id, tag)
);
```

**Gestion des bounces** :

```python
# app/services/bounce_service.py

BOUNCE_CONFIG = {
    "hard_bounce": {"action": "block_immediately"},
    "soft_bounce": {"max_attempts": 3, "action_after_max": "mark_invalid"},
    "complaint":   {"action": "unsubscribe_immediately"},
}

# Seuils globaux de santé (alerte si dépassés)
HEALTH_THRESHOLDS = {
    "hard_bounce_rate_max": 2.0,   # %
    "complaint_rate_max":   0.1,   # %
}

async def handle_ses_bounce(event: dict):
    bounce_type = event['bounce']['bounceType']  # Permanent | Transient
    for recipient in event['bounce']['bouncedRecipients']:
        contact = get_contact_by_email(recipient['emailAddress'])
        if bounce_type == 'Permanent':
            contact.status       = 'hard_bounced'
            contact.bounce_reason = recipient.get('diagnosticCode')
        else:
            contact.bounce_count += 1
            if contact.bounce_count >= BOUNCE_CONFIG['soft_bounce']['max_attempts']:
                contact.status = 'soft_bounced'
        contact.last_bounce_at = datetime.utcnow()
    db.commit()
```

---

### 1.5 Éditeur Email

- Interface drag & drop no-code (blocs : texte riche, image, bouton CTA, séparateur, colonnes, tableau, footer légal)
- Mode code HTML avec synchronisation bidirectionnelle
- Prévisualisation temps réel desktop / mobile
- Sauvegarde automatique toutes les 30 secondes
- Variables dynamiques : `{{prenom}}`, `{{nom}}`, `{{custom.solde}}`
- Blocs conditionnels avec valeur de repli (fallback)

**Schéma BDD — Templates** :

```sql
CREATE TABLE templates (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id UUID REFERENCES organisations(id) ON DELETE CASCADE, -- NULL = template système
    name            VARCHAR(255) NOT NULL,
    description     TEXT,
    category        VARCHAR(100),
    thumbnail_url   TEXT,
    is_public       BOOLEAN DEFAULT FALSE,
    created_by      UUID REFERENCES users(id),
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW()
);

CREATE TABLE template_versions (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
    version     INTEGER NOT NULL DEFAULT 1,
    json_content JSONB NOT NULL,    -- Structure blocs de l'éditeur
    html_content TEXT NOT NULL,     -- HTML rendu
    created_by  UUID REFERENCES users(id),
    created_at  TIMESTAMP DEFAULT NOW(),
    is_current  BOOLEAN DEFAULT TRUE
);
```

---

### 1.6 Campagnes

**Schéma BDD** :

```sql
CREATE TYPE campaign_status AS ENUM (
    'draft', 'scheduled', 'sending', 'sent', 'cancelled', 'paused'
);

CREATE TABLE campaigns (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    name            VARCHAR(255) NOT NULL,
    subject         VARCHAR(500) NOT NULL,
    preheader       VARCHAR(500),
    sender_id       UUID REFERENCES senders(id),
    template_version_id UUID REFERENCES template_versions(id),
    list_id         UUID REFERENCES contact_lists(id),
    status          campaign_status DEFAULT 'draft',
    scheduled_at    TIMESTAMP,
    sent_at         TIMESTAMP,
    -- Tracking
    track_opens     BOOLEAN DEFAULT TRUE,
    track_clicks    BOOLEAN DEFAULT TRUE,
    -- Page publique
    public_slug     VARCHAR(20) UNIQUE,
    public_html     TEXT,           -- Snapshot HTML au moment de l'envoi
    is_public       BOOLEAN DEFAULT TRUE,
    public_expires_at TIMESTAMP,
    public_view_count INTEGER DEFAULT 0,
    -- Stats cache
    total_sent      INTEGER DEFAULT 0,
    total_delivered INTEGER DEFAULT 0,
    total_opened    INTEGER DEFAULT 0,
    total_clicked   INTEGER DEFAULT 0,
    total_bounced   INTEGER DEFAULT 0,
    total_unsubscribed INTEGER DEFAULT 0,
    created_by      UUID REFERENCES users(id),
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW()
);

CREATE TYPE event_type AS ENUM (
    'sent', 'delivered', 'opened', 'clicked',
    'bounced', 'complained', 'unsubscribed'
);

CREATE TABLE email_events (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    contact_id  UUID NOT NULL REFERENCES contacts(id),
    event       event_type NOT NULL,
    metadata    JSONB,          -- url cliquée, user-agent, IP...
    occurred_at TIMESTAMP DEFAULT NOW()
);
```

**Endpoint page publique (sans auth)** :

```python
# app/api/public.py
from fastapi import APIRouter
from fastapi.responses import HTMLResponse

router = APIRouter()

@router.get("/v/{slug}", response_class=HTMLResponse, include_in_schema=False)
async def view_public_campaign(slug: str):
    campaign = db.query(Campaign).filter_by(public_slug=slug, is_public=True).first()
    if not campaign:
        raise HTTPException(status_code=404)
    if campaign.public_expires_at and campaign.public_expires_at < datetime.utcnow():
        raise HTTPException(status_code=410, detail="Ce lien a expiré")
    # Incrémenter le compteur de vues
    campaign.public_view_count += 1
    db.commit()
    return HTMLResponse(content=campaign.public_html)
```

**Génération du slug** :

```python
import secrets, string

def generate_public_slug() -> str:
    alphabet = string.ascii_lowercase + string.digits
    while True:
        slug = ''.join(secrets.choice(alphabet) for _ in range(8))
        if not db.query(Campaign).filter_by(public_slug=slug).first():
            return slug
```

---

### 1.7 Analytics de Base

```sql
CREATE TABLE campaign_stats (
    campaign_id         UUID PRIMARY KEY REFERENCES campaigns(id),
    sent                INTEGER DEFAULT 0,
    delivered           INTEGER DEFAULT 0,
    unique_opens        INTEGER DEFAULT 0,
    total_opens         INTEGER DEFAULT 0,
    unique_clicks       INTEGER DEFAULT 0,
    total_clicks        INTEGER DEFAULT 0,
    hard_bounces        INTEGER DEFAULT 0,
    soft_bounces        INTEGER DEFAULT 0,
    unsubscribes        INTEGER DEFAULT 0,
    complaints          INTEGER DEFAULT 0,
    public_page_views   INTEGER DEFAULT 0,
    updated_at          TIMESTAMP DEFAULT NOW()
);
```

---

### 1.8 Facturation & Crédits

```sql
CREATE TABLE plans (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(100) NOT NULL,  -- free|starter|business|enterprise
    price_xof       INTEGER DEFAULT 0,
    price_eur       INTEGER DEFAULT 0,
    credits_included INTEGER DEFAULT 0,
    features        JSONB
);

CREATE TABLE subscriptions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id UUID NOT NULL REFERENCES organisations(id),
    plan_id         UUID NOT NULL REFERENCES plans(id),
    status          VARCHAR(20) DEFAULT 'active', -- active|cancelled|past_due
    current_period_start TIMESTAMP,
    current_period_end   TIMESTAMP,
    created_at      TIMESTAMP DEFAULT NOW()
);

CREATE TABLE credit_balances (
    organisation_id UUID PRIMARY KEY REFERENCES organisations(id),
    balance         INTEGER DEFAULT 0,
    updated_at      TIMESTAMP DEFAULT NOW()
);

CREATE TABLE credit_transactions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id UUID NOT NULL REFERENCES organisations(id),
    amount          INTEGER NOT NULL,           -- positif = crédit, négatif = débit
    type            VARCHAR(50),                -- purchase|subscription|usage|refund
    reference       TEXT,                       -- ID paiement CinetPay / Stripe
    campaign_id     UUID REFERENCES campaigns(id),
    created_at      TIMESTAMP DEFAULT NOW()
);
```

---

## Phase 2 — Croissance

### 2.1 IA — Rédaction Assistée

- Génération contenu email depuis brief en langage naturel (LLM via API)
- 5 suggestions d'objets optimisés pour le taux d'ouverture
- Reformulation du ton : formel / amical / urgent / institutionnel
- Traduction FR ↔ EN du contenu
- Score de délivrabilité prédictif avant envoi

### 2.2 Automatisation — Workflows

```sql
CREATE TABLE workflows (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    name            VARCHAR(255) NOT NULL,
    trigger_type    VARCHAR(100) NOT NULL,  -- list_added|email_opened|date_relative|api...
    trigger_config  JSONB,
    is_active       BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMP DEFAULT NOW()
);

CREATE TABLE workflow_nodes (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
    type        VARCHAR(50) NOT NULL,   -- send_email|wait|condition|update_contact|webhook
    config      JSONB NOT NULL,
    position_x  INTEGER,
    position_y  INTEGER,
    next_node_id     UUID REFERENCES workflow_nodes(id),
    next_node_yes_id UUID REFERENCES workflow_nodes(id),  -- pour les conditions
    next_node_no_id  UUID REFERENCES workflow_nodes(id)
);

CREATE TABLE workflow_executions (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id UUID NOT NULL REFERENCES workflows(id),
    contact_id  UUID NOT NULL REFERENCES contacts(id),
    status      VARCHAR(20) DEFAULT 'running', -- running|completed|failed|cancelled
    current_node_id UUID REFERENCES workflow_nodes(id),
    started_at  TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP
);
```

**Déclencheurs** : `list_added`, `email_opened`, `email_clicked`, `inactive_days`, `date_relative`, `date_anniversary`, `api_trigger`, `score_threshold`

**Actions** : `send_email`, `wait`, `add_to_list`, `remove_from_list`, `update_tag`, `update_field`, `notify_member`, `call_webhook`, `update_score`

### 2.3 A/B Testing

```sql
CREATE TABLE ab_tests (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id     UUID NOT NULL REFERENCES campaigns(id),
    test_variable   VARCHAR(50) NOT NULL,   -- subject|content|sender
    variant_a_config JSONB NOT NULL,
    variant_b_config JSONB NOT NULL,
    split_percent   INTEGER DEFAULT 20,     -- % audience par variante
    winner_metric   VARCHAR(50) DEFAULT 'open_rate', -- open_rate|click_rate
    test_duration_hours INTEGER DEFAULT 4,
    winner_variant  VARCHAR(1),             -- A|B (rempli après le test)
    status          VARCHAR(20) DEFAULT 'pending', -- pending|running|completed
    started_at      TIMESTAMP,
    completed_at    TIMESTAMP
);
```

### 2.4 Segmentation Dynamique Avancée

Format JSON des règles de segment :

```json
{
  "operator": "AND",
  "conditions": [
    { "field": "status",           "op": "eq",      "value": "active" },
    { "field": "tags",             "op": "contains", "value": "client-premium" },
    { "field": "engagement_score", "op": "gte",     "value": 70 },
    {
      "operator": "OR",
      "conditions": [
        { "field": "custom.pays",  "op": "eq", "value": "Sénégal" },
        { "field": "custom.pays",  "op": "eq", "value": "Côte d'Ivoire" }
      ]
    }
  ]
}
```

### 2.5 Formulaires d'Inscription Embarquables

```sql
CREATE TABLE signup_forms (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id UUID NOT NULL REFERENCES organisations(id),
    name            VARCHAR(255) NOT NULL,
    fields_config   JSONB NOT NULL,         -- Structure des champs
    style_config    JSONB,                  -- Couleurs, polices
    target_list_id  UUID REFERENCES contact_lists(id),
    double_optin    BOOLEAN DEFAULT FALSE,
    success_message TEXT,
    is_active       BOOLEAN DEFAULT TRUE,
    embed_token     VARCHAR(64) UNIQUE NOT NULL,  -- Token pour le widget JS
    submissions     INTEGER DEFAULT 0,
    created_at      TIMESTAMP DEFAULT NOW()
);
```

Widget d'intégration (1 ligne) :

```html
<script src="https://app.mailflow.africa/widget.js" data-form="EMBED_TOKEN"></script>
```

### 2.6 API Publique & Webhooks

**Endpoints REST** :

```
POST   /api/v1/contacts                  Créer / mettre à jour un contact
GET    /api/v1/contacts/{id}             Détail d'un contact
PUT    /api/v1/contacts/{id}             Modifier un contact
DELETE /api/v1/contacts/{id}             Supprimer un contact
POST   /api/v1/lists/{id}/contacts       Ajouter à une liste
DELETE /api/v1/lists/{id}/contacts/{id}  Retirer d'une liste
GET    /api/v1/campaigns                 Lister les campagnes
POST   /api/v1/campaigns                 Créer une campagne
POST   /api/v1/campaigns/{id}/send       Déclencher l'envoi
GET    /api/v1/campaigns/{id}/stats      Statistiques d'une campagne
POST   /api/v1/workflows/{id}/trigger    Déclencher un workflow
```

Authentification : `Authorization: Bearer <API_KEY>`
Rate limiting : 1 000 req/heure (plans payants)

```sql
CREATE TABLE api_keys (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id UUID NOT NULL REFERENCES organisations(id),
    name            VARCHAR(255) NOT NULL,
    key_hash        TEXT NOT NULL UNIQUE,   -- Jamais stocker la clé en clair
    last_used_at    TIMESTAMP,
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMP DEFAULT NOW()
);

CREATE TABLE webhooks (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id UUID NOT NULL REFERENCES organisations(id),
    url             TEXT NOT NULL,
    events          TEXT[] NOT NULL,        -- ['email_opened', 'email_bounced'...]
    secret          TEXT NOT NULL,          -- Pour signature HMAC
    is_active       BOOLEAN DEFAULT TRUE,
    failure_count   INTEGER DEFAULT 0,
    created_at      TIMESTAMP DEFAULT NOW()
);
```

---

## Marketplace Templates

### Structure

```sql
CREATE TABLE creator_profiles (
    user_id         UUID PRIMARY KEY REFERENCES users(id),
    display_name    VARCHAR(255) NOT NULL,
    bio             TEXT,
    portfolio_url   TEXT,
    is_verified     BOOLEAN DEFAULT FALSE,
    total_sales     INTEGER DEFAULT 0,
    total_revenue   INTEGER DEFAULT 0,     -- en XOF
    payout_method   VARCHAR(50),           -- mobile_money|bank_transfer
    payout_details  JSONB,
    created_at      TIMESTAMP DEFAULT NOW()
);

CREATE TABLE marketplace_templates (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id      UUID NOT NULL REFERENCES users(id),
    title           VARCHAR(255) NOT NULL,
    description     TEXT,
    category        VARCHAR(100),           -- newsletter|promotion|transactionnel|alerte...
    sector          VARCHAR(100),           -- banque|microfinance|ecommerce|sante...
    tags            TEXT[],
    language        VARCHAR(10) DEFAULT 'fr',
    price_xof       INTEGER DEFAULT 0,      -- 0 = gratuit
    thumbnail_url   TEXT,
    preview_url     TEXT,                   -- Page publique de prévisualisation
    template_id     UUID REFERENCES templates(id),
    status          VARCHAR(20) DEFAULT 'pending', -- pending|published|rejected|archived
    download_count  INTEGER DEFAULT 0,
    avg_rating      DECIMAL(3,2) DEFAULT 0,
    review_count    INTEGER DEFAULT 0,
    published_at    TIMESTAMP,
    created_at      TIMESTAMP DEFAULT NOW()
);

CREATE TABLE template_purchases (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id     UUID NOT NULL REFERENCES marketplace_templates(id),
    organisation_id UUID NOT NULL REFERENCES organisations(id),
    price_paid_xof  INTEGER DEFAULT 0,
    creator_revenue INTEGER DEFAULT 0,      -- 70% du prix
    platform_fee    INTEGER DEFAULT 0,      -- 30% du prix
    transaction_ref TEXT,
    purchased_at    TIMESTAMP DEFAULT NOW(),
    UNIQUE(template_id, organisation_id)
);

CREATE TABLE template_reviews (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id     UUID NOT NULL REFERENCES marketplace_templates(id),
    organisation_id UUID NOT NULL REFERENCES organisations(id),
    rating          INTEGER CHECK (rating BETWEEN 1 AND 5),
    comment         TEXT,
    created_at      TIMESTAMP DEFAULT NOW(),
    UNIQUE(template_id, organisation_id)
);
```

**Règles marketplace** :

- Modèle de rémunération : 70% créateur / 30% plateforme
- Délai de validation : 48-72h après soumission
- Crédits ne s'accumulent pas comme revenus — les achats marketplace sont des transactions séparées
- Templates achetés disponibles à vie dans la bibliothèque de l'organisation

---

## Module Banque & Microfinance

> Disponible sur plans **Business** et **Enterprise**

### Templates Réglementaires Pré-construits

| Template | Variables dynamiques clés |
|----------|--------------------------|
| Relevé de compte mensuel | `solde`, `transactions[]`, `iban`, `periode` |
| Alerte transaction débit | `montant`, `date`, `beneficiaire`, `solde_restant` |
| Alerte transaction crédit | `montant`, `date`, `emetteur`, `solde` |
| Rappel échéance crédit | `montant_echeance`, `date_echeance`, `capital_restant`, `numero_contrat` |
| Avis rejet prélèvement | `montant`, `creancier`, `motif_rejet`, `date` |
| Changement conditions générales | `date_effet`, `resume_changements`, `lien_document` |
| Bienvenue nouveau client | `nom`, `numero_client`, `agence`, `contacts_agence` |
| Activation carte bancaire | `type_carte`, `4_derniers_chiffres`, `date_expiry` |
| Rapport agent microfinance | `portefeuille_total`, `taux_remboursement`, `alertes[]` |
| Rappel remboursement MFI | `montant`, `date_limite`, `groupe_solidaire`, `agent_referent` |

### Archivage Légal

```sql
CREATE TABLE financial_archives (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id UUID NOT NULL REFERENCES organisations(id),
    campaign_id     UUID NOT NULL REFERENCES campaigns(id),
    contact_id      UUID NOT NULL REFERENCES contacts(id),
    html_content    TEXT NOT NULL,          -- Email exact envoyé
    metadata        JSONB NOT NULL,         -- Expéditeur, objet, date, recipient
    content_hash    VARCHAR(64) NOT NULL,   -- SHA-256 pour vérification d'intégrité
    s3_key          TEXT NOT NULL,          -- Chemin S3 pour le fichier archivé
    archived_at     TIMESTAMP DEFAULT NOW(),
    expires_at      TIMESTAMP,              -- Configurable : 5 à 10 ans
    is_immutable    BOOLEAN DEFAULT TRUE
);

CREATE TABLE archive_access_logs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    archive_id      UUID NOT NULL REFERENCES financial_archives(id),
    accessed_by     UUID NOT NULL REFERENCES users(id),
    access_reason   TEXT,
    ip_address      INET,
    accessed_at     TIMESTAMP DEFAULT NOW()
);
```

### Intégration Données Financières

```sql
CREATE TABLE financial_data_connections (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id UUID NOT NULL REFERENCES organisations(id),
    name            VARCHAR(255) NOT NULL,   -- "Core Banking Temenos"
    connection_type VARCHAR(50),             -- push_api|webhook|sftp
    api_key_hash    TEXT,
    ip_whitelist    INET[],
    last_sync_at    TIMESTAMP,
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMP DEFAULT NOW()
);
```

**Endpoint de réception des données financières** :

```python
# app/api/financial.py
@router.post("/api/v1/financial-data/{contact_id}")
async def push_financial_data(
    contact_id: str,
    data: dict,
    api_key: str = Header(alias="X-API-Key")
):
    """
    Reçoit les données financières depuis le Core Banking.
    Authentification par clé API dédiée avec IP whitelisting.
    Les données sont stockées en JSONB sur le contact.
    """
    verify_financial_api_key(api_key)
    contact = get_contact(contact_id)
    contact.financial_data = data          # Stocké en JSONB sur le contact
    contact.financial_updated_at = datetime.utcnow()
    db.commit()
    return {"status": "ok"}
```

Variables disponibles dans les templates après push :

```
{{financial.solde}}
{{financial.numero_compte}}
{{financial.transactions}}       → liste itérable
{{financial.credit.capital_restant}}
{{financial.credit.prochaine_echeance}}
{{financial.statut_client}}      → actif|dormant|incident|vip
{{financial.mfi.groupe_solidaire}}
{{financial.mfi.taux_remboursement}}
```

### Conformité & Sécurité

```sql
CREATE TABLE compliance_audit_logs (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id UUID NOT NULL REFERENCES organisations(id),
    user_id     UUID REFERENCES users(id),
    action      VARCHAR(255) NOT NULL,
    resource    VARCHAR(100),
    resource_id UUID,
    ip_address  INET,
    user_agent  TEXT,
    metadata    JSONB,
    created_at  TIMESTAMP DEFAULT NOW()
);
```

- Double validation requise pour envois > 10 000 destinataires
- IP whitelisting pour les accès administrateurs
- Mode sandbox dédié pour les tests (aucun email réel envoyé)
- Export du journal d'audit en PDF pour les contrôles réglementaires

---

## Roadmap

| Mois | Phase | Livrables |
|------|-------|-----------|
| 1 | Phase 1 | Auth, multi-tenant, rôles/permissions, organisations |
| 2 | Phase 1 | Config domaines SPF/DKIM/DMARC, contacts, import CSV |
| 3 | Phase 1 | Éditeur email drag & drop, campagnes, page publique |
| 4 | Phase 1 | Analytics base, crédits, CinetPay + Stripe, beta test |
| 5 | Phase 2 | IA rédaction, A/B testing, segmentation avancée |
| 6 | Phase 2 + Marketplace | Workflows automatisation, formulaires, début marketplace |
| 7 | Phase 2 + Banque | API publique + webhooks, analytics avancés, module banque |
| 8 | Phase 2 + Banque | IA prédictive, archivage légal, templates réglementaires |
| 9 | Marketplace + Banque | Marketplace complète, créateurs, données financières |
| 10 | Stabilisation | Performance, sécurité, documentation, lancement officiel |

---

## Exigences Non Fonctionnelles

| Critère | Cible |
|---------|-------|
| Temps réponse API (P95) | < 200ms |
| Débit envoi email | 1 million/heure |
| Latence pages publiques (CDN) | < 100ms |
| Uptime SLA (Business+) | 99.9% |
| Chiffrement transit | TLS 1.3 |
| Chiffrement repos | AES-256 |
| Hash mots de passe | bcrypt (coût 12) |
| Rate limiting API | 1 000 req/heure |

---

## Variables d'Environnement Requises

```env
# App
APP_ENV=development
APP_SECRET_KEY=

# PostgreSQL
DATABASE_URL=postgresql://user:password@localhost:5432/mailflow

# Redis
REDIS_URL=redis://localhost:6379/0

# Amazon SES
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_REGION=eu-west-1
SES_CONFIGURATION_SET=mailflow-tracking

# AWS S3
S3_BUCKET_NAME=
S3_BUCKET_ARCHIVES=
CLOUDFRONT_DOMAIN=

# Paiements
CINETPAY_API_KEY=
CINETPAY_SITE_ID=
PAYSTACK_SECRET_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=

# IA
ANTHROPIC_API_KEY=

# App URLs
FRONTEND_URL=https://app.mailflow.africa
PUBLIC_EMAIL_URL=https://mail.mailflow.africa
```

---

## Structure du Projet

```
mailflow-africa/
├── frontend/                       # Vue.js 3
│   ├── src/
│   │   ├── views/
│   │   │   ├── auth/
│   │   │   ├── dashboard/
│   │   │   ├── campaigns/
│   │   │   ├── contacts/
│   │   │   ├── templates/
│   │   │   ├── workflows/
│   │   │   ├── analytics/
│   │   │   ├── marketplace/
│   │   │   ├── domains/
│   │   │   └── settings/
│   │   ├── components/
│   │   ├── stores/                 # Pinia
│   │   ├── composables/
│   │   ├── router/
│   │   └── i18n/                  # fr.json + en.json
│   └── vite.config.js
│
├── backend/                        # Python FastAPI
│   ├── app/
│   │   ├── api/
│   │   │   ├── auth.py
│   │   │   ├── organisations.py
│   │   │   ├── domains.py
│   │   │   ├── contacts.py
│   │   │   ├── campaigns.py
│   │   │   ├── templates.py
│   │   │   ├── workflows.py
│   │   │   ├── analytics.py
│   │   │   ├── marketplace.py
│   │   │   ├── billing.py
│   │   │   ├── financial.py        # Module banque
│   │   │   └── public.py           # Pages publiques (no auth)
│   │   ├── models/                 # SQLAlchemy models
│   │   ├── schemas/                # Pydantic schemas
│   │   ├── services/
│   │   │   ├── email_sender.py     # Abstraction SES
│   │   │   ├── renderer.py         # Jinja2 → HTML final
│   │   │   ├── tracker.py          # Tracking opens/clicks
│   │   │   ├── domain_service.py   # Config SPF/DKIM/DMARC
│   │   │   ├── bounce_service.py   # Gestion bounces SES
│   │   │   ├── ai_service.py       # Rédaction IA
│   │   │   ├── archive_service.py  # Archivage légal S3
│   │   │   └── billing_service.py  # Crédits + paiements
│   │   ├── tasks/                  # Celery tasks
│   │   │   ├── campaign_tasks.py
│   │   │   ├── domain_tasks.py
│   │   │   └── workflow_tasks.py
│   │   ├── core/
│   │   │   ├── config.py
│   │   │   ├── database.py
│   │   │   ├── security.py
│   │   │   └── permissions.py
│   │   └── main.py
│   ├── migrations/                 # Alembic
│   ├── celery_worker.py
│   └── requirements.txt
│
├── docker-compose.yml
├── docker-compose.prod.yml
└── .env.example
```
