# MemoCat

Réseau social privé « à deux » (couple), esprit MySpace : profils personnalisables,
fil de posts, albums photo, messagerie privée. Application de bureau native
(Tauri 2 + React) sur backend Spring Boot / PostgreSQL.

> **État : Tranche 2 (profil personnalisable : thème + widgets).**
> Le schéma DB complet est en place. Le code applicatif couvre l'auth (T1) et le
> profil personnalisable (T2). Les fonctionnalités suivantes (posts, albums, chat)
> arrivent par tranches. Les widgets image (bannière, sticker) sont prévus en T3
> avec l'upload de fichiers.

## Structure

```
backend/            Spring Boot 3 (Java 21) — API REST, JPA, Flyway, JWT
frontend/           React 18 + TS + Vite + TailwindCSS
frontend/src/styles Design tokens (variables CSS) — source de vérité du style
frontend/src-tauri  Noyau Tauri 2 (Rust)
```

## Prérequis

- Java 21, Maven 3.9+
- Node 20+ / npm
- PostgreSQL 16
- Rust + toolchain Tauri (pour builder l'app de bureau)

## Base de données

```sql
CREATE DATABASE memocat;
CREATE USER memocat WITH PASSWORD 'memocat';
GRANT ALL PRIVILEGES ON DATABASE memocat TO memocat;
```

Flyway applique le schéma (`V1__init_schema.sql`) au démarrage du backend.

## Variables d'environnement (backend)

Aucun secret n'est stocké dans le repo. À fournir via l'environnement :

| Variable | Rôle | Défaut |
|---|---|---|
| `MEMOCAT_DB_URL` | URL JDBC PostgreSQL | `jdbc:postgresql://localhost:5432/memocat` |
| `MEMOCAT_DB_USER` | Utilisateur DB | `memocat` |
| `MEMOCAT_DB_PASSWORD` | Mot de passe DB | `memocat` |
| `MEMOCAT_JWT_SECRET` | Secret JWT (≥ 32 caractères) — **requis** | _(vide → erreur au démarrage)_ |
| `MEMOCAT_JWT_EXPIRATION_MINUTES` | Durée de vie du token | `1440` |
| `MEMOCAT_USER1_USERNAME` / `..._PASSWORD` / `..._DISPLAY_NAME` | Compte 1 (seedé) | _(vide → non seedé)_ |
| `MEMOCAT_USER2_USERNAME` / `..._PASSWORD` / `..._DISPLAY_NAME` | Compte 2 (seedé) | _(vide → non seedé)_ |
| `MEMOCAT_STORAGE_PATH` | Racine de stockage des fichiers (Tranche 3+) | `./data/uploads` |
| `MEMOCAT_CORS_ORIGINS` | Origines autorisées (CSV) | origines dev Tauri/Vite |

Les deux comptes sont créés au démarrage si absents ; les mots de passe sont
hachés en bcrypt (jamais stockés en clair).

## Lancer le backend

```bash
cd backend
export MEMOCAT_JWT_SECRET="change-me-with-a-32-plus-char-secret"
export MEMOCAT_USER1_USERNAME="alice" MEMOCAT_USER1_PASSWORD="..." MEMOCAT_USER1_DISPLAY_NAME="Alice"
export MEMOCAT_USER2_USERNAME="bob"   MEMOCAT_USER2_PASSWORD="..." MEMOCAT_USER2_DISPLAY_NAME="Bob"
mvn spring-boot:run
```

Tests unitaires : `mvn test`.

## Lancer le frontend

```bash
cd frontend
cp .env.example .env   # ajuste VITE_API_URL si besoin
npm install
npm run dev            # web (http://localhost:1420)
# ou, pour l'app native :
npm run tauri dev      # génère d'abord les icônes : npm run tauri icon <source.png>
```

## API

| Méthode | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/login` | non | `{username, password}` → `{token, expiresAt, user}` |
| GET | `/api/auth/me` | JWT | Utilisateur courant |
| GET | `/api/profiles/me` | JWT | Mon profil (créé par défaut si absent) |
| PUT | `/api/profiles/me` | JWT | MAJ de mon thème + widgets (validé côté serveur) |
| GET | `/api/profiles/{userId}` | JWT | Profil d'un utilisateur |

### Contrat de personnalisation (validé par allowlist serveur)

- **Couleurs** : clés `bg`, `surface`, `primary`, `text` — valeurs hex `#rrggbb` uniquement.
- **Police** : `trebuchet`, `georgia`, `courier`, `comic`, `system`.
- **Disposition** : `classic`, `sidebar-left`.
- **Widgets** (liste ordonnée, max 20) : `marquee`/`quote` (`text`, ≤ 280),
  `mood` (`emoji` ≤ 8, `label` ≤ 40 optionnel). Texte échappé à l'affichage.
