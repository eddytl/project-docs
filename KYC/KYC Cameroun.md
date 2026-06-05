# KYC Cameroun — Spécification complète pour génération de code

> Document de référence pour Claude Code.  
> Stack cible : **Flutter** (app mobile) + **React + TypeScript** (portail web).  
> Génère les deux applications avec le design dark mode défini ci-dessous.

---

## 1. Contexte produit

Solution SaaS de KYC (Know Your Customer) destinée aux banques et microfinances au Cameroun.  
Deux interfaces distinctes :

| Interface | Utilisateur | Technologie |
|---|---|---|
| App mobile agent | Agent terrain (Android, offline-first) | Flutter |
| Portail web superviseur | Superviseur / responsable conformité | React + TypeScript + Tailwind CSS |

---

## 2. Design system (dark mode)

### 2.1 Palette de couleurs

```
// Couleurs principales
--bg-base:        #0e0f11   // fond global
--bg-surface:     #111213   // cartes, panneaux
--bg-elevated:    #1a1b1e   // éléments surélevés
--bg-input:       #1e1f22   // champs, items
--bg-hover:       #222326   // hover state

// Couleurs d'action
--green-primary:  #1D9E75   // CTA principal, approuvé, actif
--green-light:    #5DCAA5   // texte sur fond vert foncé
--green-dark:     #085041   // fond badge approuvé
--green-deep:     #0d1a16   // fond zone active

// Statuts
--status-warn:    #EF9F27   // en attente, review
--status-warn-bg: #1e1500   // fond badge warning
--status-err:     #E24B4A   // rejeté, critique
--status-err-bg:  #1a0f0a   // fond badge erreur
--status-info:    #F0997B   // rejeté doux

// Textes
--text-primary:   #e2e1d9   // titres, valeurs importantes
--text-secondary: #c2c0b6   // corps de texte
--text-muted:     #73726c   // labels, métadonnées
--text-hint:      #5F5E5A   // placeholders

// Bordures
--border-default: #2a2b2e   // bordure standard
--border-subtle:  #222326   // séparateurs internes

// Accents avatars
--avatar-green:   #085041 / #5DCAA5
--avatar-purple:  #3C3489 / #CECBF6
--avatar-amber:   #1e1500 / #EF9F27
--avatar-red:     #1a0f0a / #F0997B
```

### 2.2 Typographie

```
Font principale : "IBM Plex Sans" (Google Fonts)
Font mono :       "IBM Plex Mono" (pour codes, IDs)

Tailles :
  --text-xs:   9px   // métadonnées, labels
  --text-sm:   11px  // corps secondaire
  --text-base: 13px  // corps principal
  --text-md:   15px  // noms, titres section
  --text-lg:   18px  // métriques, valeurs clés
  --text-xl:   22px  // grands chiffres dashboard

Poids : 400 (regular), 500 (medium), 600 (semi-bold)
```

### 2.3 Tokens d'espacement et de forme

```
Radius :
  --radius-sm:  6px
  --radius-md:  8px
  --radius-lg:  10px
  --radius-xl:  14px
  --radius-full: 9999px  // pills, avatars ronds

Spacing (base 4px) :
  4px / 6px / 8px / 10px / 12px / 14px / 16px / 20px / 24px

Bordures : 0.5px solid (jamais 1px ou plus)
```

---

## 3. App mobile Flutter — Agent terrain

### 3.1 Architecture Flutter

```
lib/
├── main.dart
├── app.dart                    // MaterialApp, thème, routes
├── core/
│   ├── theme/
│   │   ├── app_theme.dart      // ThemeData dark mode
│   │   ├── app_colors.dart     // toutes les couleurs
│   │   └── app_text_styles.dart
│   ├── database/
│   │   └── local_db.dart       // SQLite via sqflite
│   ├── network/
│   │   ├── api_client.dart     // Dio + intercepteurs JWT
│   │   └── connectivity.dart   // détection réseau
│   └── sync/
│       └── sync_manager.dart   // file de sync offline
├── features/
│   ├── auth/
│   │   ├── login_screen.dart
│   │   └── auth_bloc.dart
│   ├── home/
│   │   ├── home_screen.dart
│   │   └── home_bloc.dart
│   ├── kyc/
│   │   ├── new_kyc_screen.dart
│   │   ├── steps/
│   │   │   ├── identity_step.dart      // scan CNI
│   │   │   ├── biometric_step.dart     // liveness + face
│   │   │   ├── mno_step.dart           // vérif MTN/Orange
│   │   │   └── decision_step.dart      // résultat
│   │   └── kyc_bloc.dart
│   ├── dossiers/
│   │   ├── dossiers_screen.dart
│   │   └── dossier_detail_screen.dart
│   └── sync/
│       └── sync_screen.dart
└── shared/
    ├── widgets/
    │   ├── app_button.dart
    │   ├── status_badge.dart
    │   ├── step_indicator.dart
    │   └── avatar_widget.dart
    └── models/
        ├── dossier.dart
        └── client.dart
```

### 3.2 Dépendances Flutter (pubspec.yaml)

```yaml
dependencies:
  flutter:
    sdk: flutter

  # State management
  flutter_bloc: ^8.1.3
  equatable: ^2.0.5

  # Navigation
  go_router: ^12.0.0

  # Base de données locale
  sqflite: ^2.3.0
  path: ^1.8.3

  # Réseau
  dio: ^5.3.4
  connectivity_plus: ^5.0.2

  # Stockage sécurisé
  flutter_secure_storage: ^9.0.0
  sqflite_sqlcipher: ^2.2.0+1   # SQLite chiffré

  # Caméra & scan
  camera: ^0.10.5+9
  google_mlkit_face_detection: ^0.9.0
  google_mlkit_text_recognition: ^0.12.0   # OCR

  # Utilitaires
  image: ^4.1.3
  image_picker: ^1.0.5
  geolocator: ^11.0.0
  intl: ^0.19.0
  uuid: ^4.2.1

  # UI
  lottie: ^2.7.0        # animations
  shimmer: ^3.0.0       # loading states
```

### 3.3 Thème Flutter (dark mode)

```dart
// lib/core/theme/app_theme.dart
import 'package:flutter/material.dart';
import 'app_colors.dart';

class AppTheme {
  static ThemeData get dark => ThemeData(
    brightness: Brightness.dark,
    scaffoldBackgroundColor: AppColors.bgBase,
    colorScheme: const ColorScheme.dark(
      primary: AppColors.greenPrimary,
      secondary: AppColors.greenLight,
      surface: AppColors.bgSurface,
      error: AppColors.statusErr,
      onPrimary: Color(0xFF04342C),
      onSurface: AppColors.textPrimary,
    ),
    appBarTheme: const AppBarTheme(
      backgroundColor: AppColors.bgSurface,
      elevation: 0,
      titleTextStyle: TextStyle(
        color: AppColors.textPrimary,
        fontSize: 15,
        fontWeight: FontWeight.w500,
        fontFamily: 'IBMPlexSans',
      ),
      iconTheme: IconThemeData(color: AppColors.textSecondary),
    ),
    cardTheme: CardTheme(
      color: AppColors.bgElevated,
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(10),
        side: const BorderSide(color: AppColors.borderDefault, width: 0.5),
      ),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: AppColors.bgInput,
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(8),
        borderSide: const BorderSide(color: AppColors.borderDefault, width: 0.5),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(8),
        borderSide: const BorderSide(color: AppColors.greenPrimary, width: 1),
      ),
      hintStyle: const TextStyle(color: AppColors.textHint, fontSize: 13),
    ),
    textTheme: const TextTheme(
      bodyLarge: TextStyle(color: AppColors.textSecondary, fontSize: 13, fontFamily: 'IBMPlexSans'),
      bodyMedium: TextStyle(color: AppColors.textSecondary, fontSize: 11, fontFamily: 'IBMPlexSans'),
      titleMedium: TextStyle(color: AppColors.textPrimary, fontSize: 15, fontWeight: FontWeight.w500, fontFamily: 'IBMPlexSans'),
    ),
    fontFamily: 'IBMPlexSans',
  );
}
```

```dart
// lib/core/theme/app_colors.dart
import 'package:flutter/material.dart';

class AppColors {
  // Fonds
  static const bgBase      = Color(0xFF0E0F11);
  static const bgSurface   = Color(0xFF111213);
  static const bgElevated  = Color(0xFF1A1B1E);
  static const bgInput     = Color(0xFF1E1F22);
  static const bgHover     = Color(0xFF222326);

  // Vert (action principale)
  static const greenPrimary = Color(0xFF1D9E75);
  static const greenLight   = Color(0xFF5DCAA5);
  static const greenDark    = Color(0xFF085041);
  static const greenDeep    = Color(0xFF0D1A16);

  // Statuts
  static const statusWarn   = Color(0xFFEF9F27);
  static const statusWarnBg = Color(0xFF1E1500);
  static const statusErr    = Color(0xFFE24B4A);
  static const statusErrBg  = Color(0xFF1A0F0A);
  static const statusInfo   = Color(0xFFF0997B);

  // Textes
  static const textPrimary   = Color(0xFFE2E1D9);
  static const textSecondary = Color(0xFFC2C0B6);
  static const textMuted     = Color(0xFF73726C);
  static const textHint      = Color(0xFF5F5E5A);

  // Bordures
  static const borderDefault = Color(0xFF2A2B2E);
  static const borderSubtle  = Color(0xFF222326);
}
```

### 3.4 Écrans à générer

#### Écran 1 — Login

```
Fichier : lib/features/auth/login_screen.dart

Layout :
  - Fond : bgBase (#0e0f11)
  - Logo centré en haut (icône KYC + "KYC Cameroun" en IBM Plex Sans 20px medium)
  - Sous-titre : "Application agent — Version FR/EN" en textMuted
  - Card centrée (bgSurface, radius 14px, border 0.5px borderDefault) contenant :
    - Champ "Identifiant agent" (icon: person_outline)
    - Champ "Code PIN à 6 chiffres" (obscureText: true, icon: lock_outline)
    - Bouton "Se connecter / Sign in" (bgGreenPrimary, textColor #04342C, radius 8px, full-width)
    - Lien "Mot de passe oublié ?" en greenLight, centré
  - Bas d'écran : "v1.0.0 — Agence Bastos" en textMuted 10px
  - Validation : champs vides → message d'erreur inline en statusErr
  - BLoC : AuthBloc avec états Loading / Success / Error
```

#### Écran 2 — Accueil agent (Home)

```
Fichier : lib/features/home/home_screen.dart

Layout :
  AppBar :
    - Avatar initiales agent (fond greenDark, texte greenLight)
    - Nom agent + agence
    - Icône sync avec badge coloré (vert = synced, orange = pending, rouge = offline)

  Corps :
    - Bandeau "Mode hors ligne" (orange, dismissible) si pas de réseau
    - Métriques du jour en grille 2x2 (bgElevated, radius 8px) :
        • Dossiers créés aujourd'hui
        • En attente de sync
        • Approuvés ce mois
        • Temps moyen traitement
    - Bouton "Nouveau dossier KYC" (grand, greenPrimary, icon: add_circle)
    - Section "Dossiers récents" :
        Liste de DossierCard avec nom client, type pièce, statut badge, heure

  Bottom navigation bar (5 items) :
    Accueil | Dossiers | + (Nouveau) | Sync | Profil
    Couleur active : greenPrimary
    Couleur inactive : textMuted
```

#### Écran 3 — Nouveau dossier KYC (stepper 4 étapes)

```
Fichier : lib/features/kyc/new_kyc_screen.dart

Composant StepIndicator (lib/shared/widgets/step_indicator.dart) :
  - 4 étapes horizontales avec ligne de progression
  - État : done (vert + checkmark) / active (vert plein) / todo (gris)
  - Labels : Identité · Biométrie · Vérif. MNO · Décision

ÉTAPE 1 — Identité (lib/features/kyc/steps/identity_step.dart) :
  - Selector type de pièce : CNI récente / CNI ancienne / Passeport / Permis
  - Zone de scan (Container 200x150, border greenPrimary, corners stylisés) :
      • Bouton "Photographier le recto" → camera picker
      • Preview de l'image capturée
      • Bouton "Photographier le verso"
  - Champs pré-remplis par OCR (éditables) :
      • Nom complet
      • Date de naissance
      • Numéro de pièce
      • Date expiration
  - Indicateur "Score OCR : 94%" avec barre de confiance colorée
  - Bouton "Suivant →" (disabled si champs vides)

ÉTAPE 2 — Biométrie (lib/features/kyc/steps/biometric_step.dart) :
  - Cadre caméra avec overlay de détection visage (cercle vert animé)
  - Coins décoratifs verts (scan frame style)
  - Instructions : "Regardez droit devant" / "Tournez légèrement à droite"
  - Barre de progression liveness (0→100%)
  - Score face match : "Correspondance : 96%" après capture
  - États : waiting / scanning (animation pulse) / success / failure
  - Bouton "Réessayer" si score < 92%

ÉTAPE 3 — Vérification MNO (lib/features/kyc/steps/mno_step.dart) :
  - Selector opérateur : MTN Mobile Money / Orange Money
  - Champ numéro de téléphone (format +237 XXXXXXXX)
  - Bouton "Vérifier via [MTN/Orange]"
  - État de vérification animé (spinner → check vert ou X rouge)
  - Résultat : "Nom correspondant : OUI / NON"
  - Message si hors ligne : "Vérification MNO différée — sera effectuée à la synchronisation"

ÉTAPE 4 — Décision (lib/features/kyc/steps/decision_step.dart) :
  - Score de risque visuel (jauge circulaire 0-100) :
      • 80-100 : vert (faible risque)
      • 50-79 : orange (risque modéré)
      • 0-49 : rouge (risque élevé)
  - Détail du scoring : OCR ✓ · Liveness ✓ · MNO ✓ · Sanctions ✓
  - Décision automatique affichée en grand :
      "APPROUVÉ" (vert) / "EN REVIEW" (orange) / "REJETÉ" (rouge)
  - Bouton "Enregistrer & soumettre" → sauvegarde SQLite + queue sync
  - Bouton "Nouveau dossier" (secondary)
```

#### Écran 4 — Liste des dossiers

```
Fichier : lib/features/dossiers/dossiers_screen.dart

- AppBar avec barre de recherche (icon: search)
- Filtres chips horizontaux scrollables : Tous · Approuvés · En review · Rejetés · Non sync
- Liste de DossierCard :
    • Avatar initiales (couleur selon statut)
    • Nom complet + type pièce
    • Agent + heure de création
    • Badge statut (approuvé/review/rejeté/pending sync)
    • Chevron droite
- Pull to refresh
- Swipe gauche : action "Supprimer" (si non synchronisé)
```

#### Écran 5 — Détail dossier

```
Fichier : lib/features/dossiers/dossier_detail_screen.dart

Sections (ScrollView) :
  1. Header client : avatar + nom + numéro dossier + badge statut
  2. Informations identité :
       - Photo CNI recto/verso (thumbnails cliquables)
       - Données extraites en tableau label/valeur
  3. Résultats biométrie :
       - Photo selfie capturée
       - Score liveness + score face match avec barres visuelles
  4. Vérification MNO :
       - Opérateur + numéro + résultat correspondance
  5. Scoring risque :
       - Jauge + détail des critères
  6. Timeline d'audit (audit trail) :
       - Liste d'événements horodatés (création, étapes, décision, sync)
  7. Actions (si statut "En review") :
       - Bouton "Approuver" (vert) + Bouton "Rejeter" (rouge)
```

#### Écran 6 — Synchronisation

```
Fichier : lib/features/sync/sync_screen.dart

- Statut connexion en temps réel (wifi / 4G / hors ligne)
- Compteur "X dossiers en attente de sync"
- Bouton "Synchroniser maintenant" (disabled si offline)
- Liste des dossiers en queue avec progress individuelle
- Historique des dernières syncs (date, nombre, durée)
- Bandeau "Dernière sync : il y a 12 min" ou "Jamais synchronisé"
```

### 3.5 Gestion offline (SyncManager)

```dart
// lib/core/sync/sync_manager.dart
// Logique à implémenter :

class SyncManager {
  // 1. Écouter les changements de connectivité via connectivity_plus
  // 2. Quand le réseau revient → déclencher uploadPendingDossiers()
  // 3. uploadPendingDossiers() :
  //    - Récupérer tous les dossiers SQLite avec status = 'pending_sync'
  //    - Uploader par batch de 5 (éviter timeout)
  //    - Upload idempotent : vérifier l'UUID côté serveur avant re-upload
  //    - Mettre à jour status → 'synced' après confirmation serveur
  //    - En cas d'erreur : retry avec backoff exponentiel (1s, 2s, 4s, max 5 tentatives)
  // 4. downloadUpdates() :
  //    - Récupérer les décisions prises par le superviseur sur les dossiers de l'agent
  //    - Mettre à jour SQLite local
}
```

### 3.6 Schéma SQLite local

```sql
-- Dossiers KYC
CREATE TABLE dossiers (
  id TEXT PRIMARY KEY,           -- UUID v4
  client_nom TEXT NOT NULL,
  client_prenom TEXT NOT NULL,
  client_ddn TEXT,               -- date de naissance ISO
  client_tel TEXT,
  type_piece TEXT NOT NULL,      -- cni_recente | cni_ancienne | passeport | permis
  num_piece TEXT,
  piece_recto_path TEXT,         -- chemin local image
  piece_verso_path TEXT,
  selfie_path TEXT,
  score_ocr REAL,
  score_liveness REAL,
  score_face_match REAL,
  score_risque REAL,
  mno_operateur TEXT,            -- mtn | orange
  mno_numero TEXT,
  mno_verifie INTEGER DEFAULT 0, -- 0=non, 1=oui
  decision TEXT,                 -- approuve | review | rejete | pending
  agent_id TEXT NOT NULL,
  agence_id TEXT NOT NULL,
  lat REAL,
  lng REAL,
  created_at TEXT NOT NULL,      -- ISO datetime
  synced_at TEXT,
  sync_status TEXT DEFAULT 'pending_sync'  -- pending_sync | syncing | synced | error
);

-- Audit trail local
CREATE TABLE audit_events (
  id TEXT PRIMARY KEY,
  dossier_id TEXT NOT NULL,
  action TEXT NOT NULL,
  details TEXT,
  agent_id TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (dossier_id) REFERENCES dossiers(id)
);

-- File de synchronisation
CREATE TABLE sync_queue (
  id TEXT PRIMARY KEY,
  dossier_id TEXT NOT NULL,
  attempts INTEGER DEFAULT 0,
  last_attempt TEXT,
  error TEXT,
  created_at TEXT NOT NULL
);
```

---

## 4. Portail web superviseur — React + TypeScript

### 4.1 Architecture React

```
src/
├── main.tsx
├── App.tsx                        // Router, providers
├── theme/
│   ├── colors.ts                  // toutes les couleurs
│   ├── tokens.ts                  // spacing, radius, shadows
│   └── GlobalStyles.ts            // reset + variables CSS
├── api/
│   ├── client.ts                  // axios instance + intercepteurs
│   ├── dossiers.ts
│   ├── agents.ts
│   └── reporting.ts
├── store/
│   ├── index.ts                   // Redux Toolkit store
│   ├── dossiers/
│   │   ├── dossiersSlice.ts
│   │   └── dossiersThunks.ts
│   └── auth/
│       └── authSlice.ts
├── pages/
│   ├── Login/
│   │   └── LoginPage.tsx
│   ├── Dashboard/
│   │   └── DashboardPage.tsx
│   ├── Dossiers/
│   │   ├── DossiersPage.tsx
│   │   └── DossierDetail.tsx
│   ├── Agents/
│   │   └── AgentsPage.tsx
│   ├── Reporting/
│   │   └── ReportingPage.tsx
│   └── Settings/
│       └── SettingsPage.tsx
├── components/
│   ├── layout/
│   │   ├── Topbar.tsx
│   │   ├── Sidebar.tsx
│   │   └── Layout.tsx
│   ├── ui/
│   │   ├── Badge.tsx              // statut badges
│   │   ├── Avatar.tsx             // initiales colorées
│   │   ├── MetricCard.tsx         // chiffre + label + delta
│   │   ├── ScoreGauge.tsx         // jauge circulaire SVG
│   │   ├── StatusDot.tsx          // point coloré
│   │   └── Spinner.tsx
│   ├── dossiers/
│   │   ├── DossierRow.tsx         // ligne table
│   │   ├── DossierCard.tsx        // carte résumé
│   │   └── DossierFilters.tsx     // filtres + recherche
│   ├── charts/
│   │   ├── BarChart.tsx           // Recharts
│   │   ├── LineChart.tsx
│   │   └── DonutChart.tsx
│   └── alerts/
│       └── AlertRow.tsx
├── hooks/
│   ├── useAuth.ts
│   ├── useDossiers.ts
│   └── useWebSocket.ts            // mises à jour temps réel
└── types/
    ├── dossier.ts
    └── agent.ts
```

### 4.2 Dépendances npm

```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.20.0",
    "@reduxjs/toolkit": "^2.0.1",
    "react-redux": "^9.0.4",
    "axios": "^1.6.2",
    "recharts": "^2.10.1",
    "date-fns": "^3.0.6",
    "react-hot-toast": "^2.4.1",
    "lucide-react": "^0.294.0",
    "clsx": "^2.0.0",
    "react-virtualized-auto-sizer": "^1.0.20",
    "react-window": "^1.8.10"
  },
  "devDependencies": {
    "typescript": "^5.3.2",
    "vite": "^5.0.8",
    "@vitejs/plugin-react": "^4.2.1",
    "tailwindcss": "^3.3.6",
    "autoprefixer": "^10.4.16"
  }
}
```

### 4.3 Variables CSS globales

```css
/* src/theme/GlobalStyles.ts — injecter dans :root */
:root {
  /* Fonds */
  --bg-base:       #0e0f11;
  --bg-surface:    #111213;
  --bg-elevated:   #1a1b1e;
  --bg-input:      #1e1f22;
  --bg-hover:      #222326;

  /* Vert */
  --green-primary: #1D9E75;
  --green-light:   #5DCAA5;
  --green-dark:    #085041;
  --green-deep:    #0d1a16;

  /* Statuts */
  --warn:          #EF9F27;
  --warn-bg:       #1e1500;
  --err:           #E24B4A;
  --err-bg:        #1a0f0a;
  --info:          #F0997B;

  /* Textes */
  --text-1:        #e2e1d9;
  --text-2:        #c2c0b6;
  --text-3:        #73726c;
  --text-4:        #5F5E5A;

  /* Bordures */
  --border:        #2a2b2e;
  --border-sub:    #222326;

  /* Rayons */
  --r-sm: 6px;
  --r-md: 8px;
  --r-lg: 10px;
  --r-xl: 14px;

  font-family: 'IBM Plex Sans', sans-serif;
}
```

### 4.4 Pages à générer

#### Page 1 — Login

```
Fichier : src/pages/Login/LoginPage.tsx

Layout full-screen (fond bgBase) :
  - Gauche (40%) : branding
      • Logo KYC (icône shield-check + texte "KYC Cameroun")
      • Tagline : "Conformité COBAC · Vérification biométrique · Offline-first"
      • 3 features en bullets avec icônes Lucide
  - Droite (60%) : formulaire dans une card (bgSurface, radius 14px, border 0.5px)
      • Titre "Connexion superviseur"
      • Champ email avec label flottant
      • Champ mot de passe + toggle visibilité
      • Bouton "Se connecter" (bgGreenPrimary, plein, full-width)
      • Lien "Mot de passe oublié"
  - Validation inline avec messages d'erreur
  - Loading state sur le bouton (spinner)
  - Token JWT stocké dans httpOnly cookie via l'API
```

#### Page 2 — Dashboard principal

```
Fichier : src/pages/Dashboard/DashboardPage.tsx

Structure :
  Layout (Topbar + Sidebar + main content)

Topbar (height 48px, bgSurface, border-bottom) :
  - Logo + "KYC Cameroun" + badge "Portail superviseur"
  - Icône notifications (cloche + badge rouge si alertes)
  - Avatar utilisateur + nom + chevron (dropdown menu)

Sidebar (width 44px collapsed / 200px expanded, bgBase) :
  - Toggle collapse
  - Items avec icône + label (affiché si expanded) :
      • Tableau de bord (LayoutDashboard)
      • Dossiers (Users)
      • Agents (UserCheck)
      • Statistiques (BarChart2)
      • Conformité (ShieldCheck)
      • Rapports (FileText)
      • Paramètres (Settings) — bas de sidebar
  - Item actif : fond greenDeep, texte greenPrimary, border-left 2px greenPrimary

Main content :
  Greeting :
    "Bonjour, [Prénom]" (text-xl, text-1)
    "[Jour] [date] · [Agence]" (text-3)

  Métriques (grille 4 colonnes, gap 10px) :
    MetricCard composant :
      • Valeur (text-xl, font 500, couleur selon type)
      • Label (text-3, text-xs)
      • Delta (flèche + %, vert si positif, rouge si négatif)
    Valeurs :
      1. "247" Dossiers ce mois (blanc)
      2. "89%" Taux auto-approbation (vert)
      3. "14" En attente review (orange)
      4. "38s" Temps moyen KYC (blanc)

  Grille 2 colonnes (gap 10px) :
    Colonne gauche :
      Panel "Dossiers récents" :
        En-tête avec bouton "Voir tout"
        Tableau 4 colonnes : Client / Type pièce / Agent / Statut
        5 derniers dossiers
        Statut avec Badge coloré
        Ligne cliquable → DossierDetail

      Panel "Agents actifs aujourd'hui" :
        Barres horizontales Recharts
        X-axis : nombre de dossiers
        Y-axis : nom agent
        Couleur : greenPrimary si > moyenne, greenLight sinon

    Colonne droite :
      Panel "Scoring de risque — ce mois" :
        Donut chart (Recharts) :
          Faible (vert) / Modéré (orange) / Élevé (rouge) / PEP (rouge foncé)
        Légende avec valeurs absolues et pourcentages

      Panel "Alertes COBAC" :
        Liste d'alertes avec :
          • Point coloré (rouge/orange/vert)
          • Texte de l'alerte
          • Temps relatif ("il y a 12 min")
        Badge "X nouvelles" en header
        Bouton "Voir toutes les alertes"
```

#### Page 3 — Liste des dossiers

```
Fichier : src/pages/Dossiers/DossiersPage.tsx

Header :
  - Titre "Dossiers KYC"
  - Bouton "Exporter COBAC" (icône download, secondary)

Filtres et recherche (sticky) :
  - Barre de recherche (nom client, numéro pièce)
  - Chips filtres : Tous · Approuvés · En review · Rejetés · Non synchronisés
  - Sélecteurs : Agent · Période · Type pièce
  - Résultat : "247 dossiers"

Tableau virtualisé (react-window pour performance) :
  Colonnes :
    1. Client (avatar initiales + nom + prénom)
    2. Type de pièce (badge : CNI récente / CNI ancienne / Passeport)
    3. Agent
    4. Date création
    5. Score risque (barre colorée + valeur %)
    6. Statut (Badge : Approuvé / En review / Rejeté / Pending sync)
    7. Actions (icône œil → détail)
  
  Ligne hover : fond bgHover
  Tri par colonne (clic header)
  Pagination (20 par page) ou scroll infini

Actions groupées (apparaissent si sélection multiple) :
  - Exporter sélection
  - Valider en lot (si rôle responsable conformité)
```

#### Page 4 — Détail dossier

```
Fichier : src/pages/Dossiers/DossierDetail.tsx

Breadcrumb : Dossiers > [Nom client]

Header card (bgSurface) :
  - Avatar large (64px) + Nom complet + Numéro dossier
  - Badge statut prominent
  - Boutons d'action (si En review) :
      "Approuver" (vert plein) / "Rejeter" (rouge outline) / "Demander info" (secondary)

Grille 2 colonnes :
  Colonne gauche :
    Section "Pièce d'identité" :
      - Thumbnails recto/verso (ouvre modal lightbox au clic)
      - Tableau données extraites par OCR :
          Nom / Prénom / Date naissance / Numéro / Expiration / Nationalité
      - Score OCR : barre de confiance colorée + pourcentage
      - Badge : "CNI biométrique 2010+" ou "CNI ancienne — révision manuelle"

    Section "Vérification biométrique" :
      - Photo selfie (cercle 80px)
      - Métriques côte à côte :
          Score liveness : [barre + %]
          Score face match : [barre + %]
      - Résultat : "Identité confirmée" (vert) ou "Correspondance insuffisante" (rouge)

    Section "Vérification MNO" :
      - Opérateur (badge MTN orange ou Orange orange)
      - Numéro de téléphone
      - Résultat correspondance nom

  Colonne droite :
    Section "Scoring de risque" :
      - Jauge circulaire SVG (0-100, couleur selon score)
      - Détail des critères :
          OCR ✓/✗ · Liveness ✓/✗ · Face match ✓/✗ · MNO ✓/✗ · Sanctions ✓/✗
      - Niveau de risque : Faible / Modéré / Élevé / PEP

    Section "Audit trail" :
      - Timeline verticale (ligne + points)
      - Événements :
          • Dossier créé (agent, heure, GPS)
          • Scan CNI (score OCR)
          • Capture biométrique (scores)
          • Vérification MNO
          • Décision automatique
          • Synchronisation
          • Révision superviseur (si applicable)
      - Chaque événement : icône + texte + horodatage + auteur
```

#### Page 5 — Reporting COBAC

```
Fichier : src/pages/Reporting/ReportingPage.tsx

Sélecteur période : Mois en cours / Trimestre / Personnalisé (date picker)

Métriques de conformité :
  - Taux de complétude des dossiers (%)
  - Dossiers avec audit trail complet (%)
  - Délai moyen de traitement (jours)
  - Nombre de déclarations de soupçon générées

Graphiques :
  - LineChart : évolution mensuelle des dossiers sur 12 mois
  - BarChart : répartition par type de pièce
  - BarChart : répartition par agent

Exports :
  - Bouton "Générer rapport COBAC PDF" (appel API → download)
  - Bouton "Exporter données Excel"
  - Bouton "Rapport de conformité mensuel"

Alertes actives :
  - Liste des dossiers nécessitant action réglementaire
  - Dossiers avec documents expirés
```

---

## 5. API REST — contrat d'interface

### 5.1 Base URL et authentification

```
Base URL : https://api.kyc-cameroun.cm/v1

Authentification : Bearer JWT dans header Authorization
JWT payload : { sub: agentId, role: "agent"|"superviseur"|"admin", agenceId, exp }

Refresh token : POST /auth/refresh
```

### 5.2 Endpoints principaux

```
POST   /auth/login                     → { token, refreshToken, agent }
POST   /auth/refresh                   → { token }

GET    /dossiers                        → liste paginée (query: page, limit, status, agentId)
POST   /dossiers                        → créer dossier
GET    /dossiers/:id                    → détail complet
PATCH  /dossiers/:id/decision           → { decision: "approuve"|"rejete", motif? }
POST   /dossiers/sync                   → batch upload depuis mobile (array de dossiers)

GET    /agents                          → liste agents
GET    /agents/:id/stats                → stats d'un agent

GET    /dashboard/metrics               → métriques pour le dashboard
GET    /dashboard/alerts                → alertes COBAC actives

GET    /reporting/cobac                 → données rapport COBAC
GET    /reporting/export/pdf            → génère et retourne PDF
GET    /reporting/export/excel          → génère et retourne Excel

POST   /documents/upload                → upload image (multipart/form-data)
GET    /documents/:id                   → télécharger document (URL signée)
```

### 5.3 Modèle de données TypeScript

```typescript
// src/types/dossier.ts

export type DecisionType = 'approuve' | 'review' | 'rejete' | 'pending';
export type SyncStatus = 'pending_sync' | 'syncing' | 'synced' | 'error';
export type TypePiece = 'cni_recente' | 'cni_ancienne' | 'passeport' | 'permis';
export type MnoOperateur = 'mtn' | 'orange';
export type NiveauRisque = 'faible' | 'modere' | 'eleve' | 'pep';

export interface Dossier {
  id: string;                        // UUID v4
  client: {
    nom: string;
    prenom: string;
    dateNaissance?: string;          // ISO date
    telephone?: string;
    nationalite?: string;
  };
  piece: {
    type: TypePiece;
    numero?: string;
    expiration?: string;
    rectoUrl?: string;               // URL signée
    versoUrl?: string;
  };
  biometrie: {
    selfieUrl?: string;
    scoreLiveness?: number;          // 0-100
    scoreFaceMatch?: number;         // 0-100
    verifie: boolean;
  };
  mno: {
    operateur?: MnoOperateur;
    numero?: string;
    nomCorrespondant: boolean;
    verifie: boolean;
  };
  scoring: {
    scoreOcr?: number;               // 0-100
    scoreRisque?: number;            // 0-100
    niveauRisque?: NiveauRisque;
    criteresOk: {
      ocr: boolean;
      liveness: boolean;
      faceMatch: boolean;
      mno: boolean;
      sanctions: boolean;
    };
  };
  decision: DecisionType;
  motifRejet?: string;
  agentId: string;
  agentNom?: string;
  agenceId: string;
  agenceNom?: string;
  localisation?: { lat: number; lng: number };
  createdAt: string;                 // ISO datetime
  updatedAt: string;
  syncedAt?: string;
  syncStatus: SyncStatus;
  auditTrail: AuditEvent[];
}

export interface AuditEvent {
  id: string;
  dossierId: string;
  action: string;
  details?: Record<string, unknown>;
  auteurId?: string;
  auteurNom?: string;
  createdAt: string;
}

export interface Agent {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  agenceId: string;
  agenceNom: string;
  role: 'agent' | 'superviseur' | 'admin';
  actif: boolean;
  stats?: {
    dossiersJour: number;
    dossiersMois: number;
    tauxApprobation: number;
    tempsMoyen: number;              // secondes
  };
}
```

---

## 6. Composants UI réutilisables

### 6.1 Badge statut (React)

```tsx
// src/components/ui/Badge.tsx
// Props : status: DecisionType | SyncStatus, size?: 'sm' | 'md'
// Mapping couleurs :
//   approuve    → bg #085041, text #5DCAA5, label "Approuvé"
//   review      → bg #1e1500, text #EF9F27, label "En review"
//   rejete      → bg #1a0f0a, text #F0997B, label "Rejeté"
//   pending_sync → bg #1e1f22, text #73726c, label "En attente sync"
//   synced      → bg #085041, text #5DCAA5, label "Synchronisé"
```

### 6.2 Jauge circulaire SVG (React)

```tsx
// src/components/ui/ScoreGauge.tsx
// Props : score: number (0-100), size?: number, label?: string
// SVG cercle avec stroke-dasharray/dashoffset pour l'arc
// Couleurs :
//   80-100 : #1D9E75 (faible risque)
//   50-79  : #EF9F27 (risque modéré)
//   0-49   : #E24B4A (risque élevé)
// Valeur numérique centrée dans le cercle
// Label optionnel en dessous
```

### 6.3 MetricCard (React)

```tsx
// src/components/ui/MetricCard.tsx
// Props : value: string, label: string, delta?: { value: string, positive: boolean }
// Style :
//   background: var(--bg-elevated)
//   border: 0.5px solid var(--border)
//   border-radius: var(--r-lg)
//   padding: 12px 14px
// Delta avec icône TrendingUp/Down de Lucide
```

### 6.4 Avatar initiales (React)

```tsx
// src/components/ui/Avatar.tsx
// Props : name: string, size?: number
// Générer couleur de fond déterministe selon le nom (hash)
// Palette : vert / violet / orange / rouge (voir design system)
// Afficher les 2 premières initiales
```

---

## 7. Instructions Claude Code

### 7.1 Ordre de génération recommandé

```
1. App Flutter :
   a. Créer le projet Flutter : flutter create kyc_agent_app
   b. Configurer pubspec.yaml avec toutes les dépendances
   c. Générer AppColors, AppTheme, AppTextStyles
   d. Générer les modèles (Dossier, AuditEvent)
   e. Générer le schéma SQLite (LocalDb)
   f. Générer les widgets partagés (Badge, Avatar, StepIndicator, AppButton)
   g. Générer les BLoCs (AuthBloc, KycBloc, SyncBloc)
   h. Générer les écrans dans l'ordre : Login → Home → NewKyc → Dossiers → Sync
   i. Configurer les routes GoRouter

2. Portail web React :
   a. Créer le projet : npm create vite@latest kyc-superviseur -- --template react-ts
   b. Installer toutes les dépendances
   c. Configurer Tailwind + variables CSS globales
   d. Générer les types TypeScript
   e. Générer le store Redux (authSlice, dossiersSlice)
   f. Générer les composants UI (Badge, Avatar, MetricCard, ScoreGauge)
   g. Générer Layout (Topbar, Sidebar)
   h. Générer les pages dans l'ordre : Login → Dashboard → Dossiers → DossierDetail → Reporting
   i. Configurer React Router
```

### 7.2 Contraintes importantes

```
FLUTTER :
- Minimum Flutter 3.16 / Dart 3.2
- targetSdkVersion 34 (Android 14)
- minSdkVersion 24 (Android 7.0)
- Permissions requises dans AndroidManifest.xml :
    CAMERA, READ_EXTERNAL_STORAGE, ACCESS_FINE_LOCATION, INTERNET, ACCESS_NETWORK_STATE
- L'app doit compiler et tourner sans erreurs sur un émulateur Android
- Tous les textes UI en français (Cameroun francophone)
- Toujours utiliser const constructors quand possible

REACT :
- React 18 strict mode
- TypeScript strict mode (noImplicitAny: true)
- Pas de any, pas de @ts-ignore
- Tous les appels API passent par src/api/ (jamais directement dans les composants)
- Responsive : fonctionne de 1280px à 1920px de large
- Accessibility : aria-labels sur les icônes, rôles ARIA corrects
- Les données mockées sont dans src/mocks/ pour le développement

COMMUN :
- Nommage en français pour les variables métier (dossier, agence, etc.)
- Commentaires de code en français
- Pas de librairies de composants UI tierces (MUI, Chakra, etc.) — tout est custom
- Respecter exactement la palette de couleurs définie dans ce document
```

### 7.3 Données mockées pour développement

```typescript
// src/mocks/dossiers.ts — données de test à créer

const mockDossiers: Dossier[] = [
  {
    id: "d-001",
    client: { nom: "Nkolo", prenom: "Bernard", telephone: "+237677123456" },
    piece: { type: "cni_recente", numero: "123456789" },
    biometrie: { scoreLiveness: 97, scoreFaceMatch: 94, verifie: true },
    mno: { operateur: "mtn", numero: "+237677123456", nomCorrespondant: true, verifie: true },
    scoring: { scoreOcr: 96, scoreRisque: 88, niveauRisque: "faible",
      criteresOk: { ocr: true, liveness: true, faceMatch: true, mno: true, sanctions: true }},
    decision: "approuve",
    agentId: "a-001", agentNom: "Ekambi Alain",
    agenceId: "ag-001", agenceNom: "Agence Bastos",
    createdAt: "2026-05-18T09:15:00Z", updatedAt: "2026-05-18T09:17:00Z",
    syncStatus: "synced", auditTrail: []
  },
  // ... 9 autres dossiers couvrant tous les statuts et cas d'usage
];
```

---

## 8. Checklist de validation finale

```
App Flutter :
  [ ] Login avec validation des champs
  [ ] Navigation bottom bar fonctionnelle
  [ ] Stepper KYC avec 4 étapes
  [ ] Simulation scan CNI (camera picker)
  [ ] Simulation liveness (animation + score)
  [ ] Sauvegarde SQLite locale
  [ ] Indicateur sync (en attente / synchronisé)
  [ ] Mode hors ligne détecté + bannière
  [ ] Theme dark mode cohérent sur tous les écrans
  [ ] Tous les textes en français

Portail React :
  [ ] Login avec JWT
  [ ] Dashboard avec métriques et graphiques
  [ ] Table dossiers avec filtres et recherche
  [ ] Détail dossier avec toutes les sections
  [ ] Badges statuts colorés
  [ ] Jauges de score fonctionnelles
  [ ] Timeline audit trail
  [ ] Boutons approuver / rejeter sur dossiers "review"
  [ ] Page reporting avec exports
  [ ] Sidebar collapsible
  [ ] Responsive 1280px+
  [ ] TypeScript sans erreurs
```

---

*Fin du document de spécification — KYC Cameroun v1.0*  
*Généré le 18 mai 2026 — Claude Sonnet 4.6*
