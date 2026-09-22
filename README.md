# MemoCat

Réseau social privé « à deux » (couple), esprit MySpace : profils personnalisables,
fil de posts, albums photo, messagerie privée. Application de bureau native
(Tauri 2 + React) sur backend Spring Boot / PostgreSQL.

> **État : V1 complète (T1 → T5).**
> Auth (T1), profil personnalisable (T2), fil de posts (T3), albums photo
> partagés (T4) et messagerie temps réel (T5). Le schéma DB complet est en place.
> Côté mobile : la sélection/prise de photos passe par le sélecteur natif de
> l'OS via le webview (`<input type="file" ... capture>`), qui donne accès à la
> galerie, aux dossiers existants et à l'appareil photo. Le build natif mobile
> (`tauri android/ios init`) reste à lancer sur un poste équipé du SDK.

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
| POST | `/api/assets` | JWT | Upload image (multipart `file`) → asset |
| GET | `/api/assets/{id}` | JWT | Sert le fichier (récupéré en blob authentifié côté front) |
| GET | `/api/posts?page=&size=` | JWT | Fil paginé (récent → ancien) |
| POST | `/api/posts` | JWT | Créer un post (texte + image optionnelle) |
| PUT/DELETE | `/api/posts/{id}` | JWT | Éditer / supprimer (le sien) |
| PUT/DELETE | `/api/posts/{id}/reactions` | JWT | Poser / retirer une réaction emoji |
| GET/POST | `/api/posts/{id}/comments?page=&size=` | JWT | Lister / commenter |
| DELETE | `/api/comments/{id}` | JWT | Supprimer un commentaire (le sien) |
| GET | `/api/reactions/emojis` | JWT | Set d'emojis de réaction autorisés |
| GET | `/api/albums?page=&size=` | JWT | Albums paginés (récent → ancien) |
| POST | `/api/albums` | JWT | Créer un album |
| GET/PUT/DELETE | `/api/albums/{id}` | JWT | Voir / éditer / supprimer un album |
| GET | `/api/albums/{id}/photos?page=&size=` | JWT | Photos paginées d'un album |
| POST | `/api/albums/{id}/photos` | JWT | Ajouter une photo (asset + légende) |
| PUT/DELETE | `/api/albums/{id}/photos/{photoId}` | JWT | Légende / suppression d'une photo |
| PUT | `/api/albums/{id}/photos/order` | JWT | Réordonner les photos |

Albums **partagés** : les deux comptes voient et gèrent tous les albums.

### Messagerie temps réel (T5)

| Type | Endpoint | Rôle |
|---|---|---|
| WebSocket | `/ws` (STOMP) | Handshake ; auth JWT au frame `CONNECT` (header `Authorization: Bearer …`) |
| STOMP send | `/app/chat.send` | `{content}` → persisté → diffusé |
| STOMP sub | `/topic/messages` | Réception des nouveaux messages |
| GET | `/api/messages?page=&size=` | Historique paginé (récent → ancien) |

Une seule conversation entre les 2 comptes (destinataire implicite). Pas de
suppression. `read_at` réservé pour d'éventuels accusés de lecture (non utilisé en V1).

### Contrat de personnalisation (validé par allowlist serveur)

- **Couleurs** : clés `bg`, `surface`, `primary`, `text` — valeurs hex `#rrggbb` uniquement.
- **Police** : `trebuchet`, `georgia`, `courier`, `comic`, `system`.
- **Disposition** : `classic`, `sidebar-left`.
- **Widgets** (liste ordonnée, max 20) : `marquee`/`quote` (`text`, ≤ 280),
  `mood` (`emoji` ≤ 8, `label` ≤ 40 optionnel). Texte échappé à l'affichage.
