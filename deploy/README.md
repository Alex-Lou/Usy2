# MemoCat sur ton propre serveur

Ce dossier contient tout ce qu'il faut pour héberger MemoCat toi-même, sans Render ni Neon :
l'app, sa base de données, le HTTPS et des sauvegardes automatiques, sur un seul petit serveur.

| Fichier | Rôle |
|---|---|
| `docker-compose.yml` | Les 4 services : la base (PostgreSQL), l'app, le HTTPS (Caddy), les sauvegardes |
| `Caddyfile` | Le HTTPS : certificat obtenu et renouvelé tout seul |
| `.env.example` | Le modèle des réglages (domaine, mots de passe) à copier en `.env` |
| `scripts/setup-server.sh` | Prépare un serveur neuf (Docker, pare-feu, mises à jour de sécurité) |
| `scripts/migrate.sh` | Copie toutes tes données depuis Neon ou Render, puis vérifie qu'il ne manque rien |
| `scripts/compare.sh` | Compare deux bases, table par table et octet par octet |
| `scripts/backup-now.sh` | Une sauvegarde tout de suite |
| `scripts/restore.sh` | Remet la base dans l'état d'une sauvegarde |
| `scripts/deploy.sh` | Met le serveur à jour avec la dernière version |
| `scripts/status.sh` | L'état du serveur en un coup d'œil |

Toutes les commandes se lancent **depuis la racine du dépôt** sur le serveur (`/opt/memocat`).

**Pourquoi tu ne peux rien perdre :**
- Toutes tes données sont dans la base, photos comprises (table `asset_content`), tout comme les clés des notifications. Une copie de la base emporte donc **tout**.
- L'ancienne base n'est **que lue**, jamais modifiée. Tant que tu ne la supprimes pas, un retour en arrière reste possible.
- Après la copie, `compare.sh` vérifie **chaque table, chaque ligne et chaque photo, octet par octet**. S'il manque ou change ne serait-ce qu'un octet, il refuse de valider.
- La copie de migration reste dans `deploy/backups/`, et tu en gardes un double sur ton ordinateur.

Tout ça a été répété en vrai, jusqu'à un accès au site comme un utilisateur :
- migration d'une base de 44 tables avec des photos ;
- vérification complète ;
- démarrage en HTTPS et connexion avec les anciens identifiants ;
- photo servie identique à l'originale, octet par octet ;
- sauvegarde, puis restauration après une suppression accidentelle ;
- et la preuve que la comparaison détecte bien un seul octet modifié.

---

## 1. Ce qu'il faut acheter

1. **Un nom de domaine** (environ 10 € par an), chez n'importe quel bureau d'enregistrement : OVH, Gandi, Porkbun, Cloudflare… Exemple : `memocat.fr`.
2. **Un serveur Hetzner Cloud** : [console.hetzner.cloud](https://console.hetzner.cloud) → *Add Server* :
   - **Location** : Falkenstein ou Nuremberg (Allemagne), ou Helsinki.
   - **Image** : **Ubuntu 24.04**.
   - **Type** : *Shared vCPU*, **x86** (Intel/AMD), le plus petit avec **4 Go de RAM** (CX22 ou son équivalent du moment, environ 4 à 5 € par mois).
   - **SSH key** : ajoute ta clé publique (voir l'encadré ci-dessous). C'est indispensable : le script de préparation désactive ensuite la connexion par mot de passe.
   - **Backups** : coche-la (environ +20 % du prix). Hetzner garde alors 7 copies complètes du serveur, en plus des sauvegardes de la base faites par MemoCat.
   - **Name** : `memocat`.

> **Créer une clé SSH (une seule fois)**
> - Sur un ordinateur (Windows, Mac, Linux), dans un terminal : `ssh-keygen -t ed25519`, puis Entrée à chaque question. La clé publique à coller chez Hetzner s'affiche avec `cat ~/.ssh/id_ed25519.pub`.
> - Sur Android : l'app **Termius** génère une clé (*Keychain → Generate key*) et sert aussi de terminal pour la suite.

Note l'**adresse IPv4** du serveur (ex. `203.0.113.10`) et son **IPv6**.

## 2. Faire pointer le domaine vers le serveur

Chez ton bureau d'enregistrement, dans la zone DNS du domaine :

| Type | Nom | Valeur |
|---|---|---|
| A | `@` | l'IPv4 du serveur |
| AAAA | `@` | l'IPv6 du serveur |

Supprime les autres enregistrements A et AAAA sur `@` s'il y en a (page de parking). La propagation prend de quelques minutes à quelques heures : `ping ton-domaine.fr` doit répondre avec l'IP du serveur.

## 3. Préparer le serveur (une fois, environ 10 minutes)

Connecte-toi : `ssh root@203.0.113.10`, avec ton IP.

**3.1 Récupérer le code.** Si le dépôt GitHub est privé, le serveur a besoin d'une clé de lecture :

```bash
apt-get update && apt-get install -y git
ssh-keygen -t ed25519 -f ~/.ssh/github -N "" -C memocat-serveur
cat ~/.ssh/github.pub
```

Sur GitHub, dans le dépôt : *Settings → Deploy keys → Add deploy key*. Colle la clé, donne-lui un titre, **sans** cocher « Allow write access ». Puis :

```bash
printf 'Host github.com\n  IdentityFile ~/.ssh/github\n' >> ~/.ssh/config
git clone git@github.com:Alex-Lou/Usy2.git /opt/memocat
cd /opt/memocat
```

**3.2 Installer le nécessaire** : Docker, pare-feu, protection contre les tentatives de connexion répétées, mises à jour de sécurité automatiques.

```bash
./deploy/scripts/setup-server.sh
```

## 4. Configurer

```bash
cp deploy/.env.example deploy/.env
openssl rand -base64 48 | tr -d '/+=' | cut -c1-48   # lance-la deux fois : un secret pour chaque ligne
nano deploy/.env
```

Remplis :
- `DOMAIN` : ton domaine, sans `https://`.
- `POSTGRES_PASSWORD` et `MEMOCAT_JWT_SECRET` : les deux secrets générés.
- **Laisse vides** les lignes `MEMOCAT_USER…` : tes comptes arrivent avec la migration, avec vos mots de passe actuels.

Enregistre (Ctrl+O, Entrée, Ctrl+X), puis construis l'app à l'avance, pour que la coupure du jour J soit courte (quelques minutes) :

```bash
docker compose -f deploy/docker-compose.yml build app
```

## 5. Le jour J : la migration (environ 15 minutes de coupure)

**5.1 Récupère l'adresse de ta base actuelle :**
- **Neon** : *Dashboard → ton projet → Connect*. **Désactive « Connection pooling »** : l'hôte ne doit pas contenir `-pooler`. Copie l'URL, de la forme `postgresql://…neon.tech/neondb?sslmode=require`.
- **Base Render** : *Dashboard → la base `memocat-db` → Connections → External Database URL*. Ajoute `?sslmode=require` à la fin.

**5.2 Mets l'ancienne app en pause**, pour que plus rien ne s'y écrive : *Render → le service `memocat` → Settings → Suspend Web Service*. La base reste en ligne et intacte. Prévenez-vous à deux de ne plus rien poster pendant ce temps.

**5.3 Lance la migration**, avec l'URL entre apostrophes :

```bash
./deploy/scripts/migrate.sh 'postgresql://…?sslmode=require'
```

Le script :
1. vérifie tout ;
2. copie l'ancienne base ;
3. la charge sur le serveur ;
4. **compare tout** ;
5. démarre l'app.

Tu dois voir chaque table marquée `✔ identique`, puis :
`✔ Les deux bases sont identiques : toutes les tables, toutes les lignes, toutes les photos.`

S'il affiche `✘`, il s'arrête et ne démarre rien : ton ancienne base est intacte, il suffit de relancer Render (*Resume*). Envoie-moi le message affiché.

> Si le script te demande de changer `POSTGRES_VERSION` (ta base actuelle est plus récente que celle du serveur), fais-le dans `deploy/.env`, puis lance `docker compose -f deploy/docker-compose.yml down -v` (la base du serveur est encore vide, rien à perdre) et relance la migration.

**5.4 Vérifie** sur `https://ton-domaine.fr` : connexion avec vos identifiants habituels, photos, messages, albums, jeux.

**5.5 Mets la copie de migration à l'abri sur ton ordinateur**, à lancer depuis ton ordinateur et non depuis le serveur :

```bash
scp 'root@ton-domaine.fr:/opt/memocat/deploy/backups/migration-*.dump' .
```

**Retour en arrière**, si besoin dans les jours qui suivent : *Render → Resume*. L'ancienne base n'a pas bougé. Attention : ce qui aura été posté entre-temps sur le nouveau serveur n'y sera pas.

## 6. Sur vos téléphones

- Ouvre `https://ton-domaine.fr`, connecte-toi, puis *Menu du navigateur → Ajouter à l'écran d'accueil* pour installer l'app.
- **Notifications** : réactive-les dans l'app. Elles sont liées à l'adresse du site, donc la nouvelle adresse doit les redemander une fois.
- Les petits réglages propres à chaque téléphone (sons, vibrations, zoom des mots fléchés) sont à refaire une fois. Tout le reste est sur le serveur.
- Supprime l'ancienne icône (l'adresse `onrender.com`).
- **App Android (APK)**, si vous l'utilisez : elle contient l'adresse du serveur. Il faut la reconstruire avec `VITE_API_URL=https://ton-domaine.fr`. Demande-moi, je m'en occupe.

## 7. Après deux semaines sans souci

- Supprime le service et la base sur Render, et le projet Neon.
- Dis-le-moi : je retirerai du dépôt ce qui ne sert qu'à Render (`render.yaml`, le workflow `keep-alive`).

---

## Au quotidien

**Mettre l'app à jour.** Automatique si tu actives le déploiement automatique (ci-dessous). Sinon, sur le serveur :

```bash
cd /opt/memocat && ./deploy/scripts/deploy.sh
```

**L'état du serveur** (services, dernière sauvegarde, place libre) :

```bash
./deploy/scripts/status.sh
```

**Les sauvegardes.** Une sauvegarde complète est faite chaque nuit dans `deploy/backups/` et relue pour vérifier qu'elle est lisible. Le script garde 7 jours, plus celle du 1er de chaque mois pendant 6 mois. Si le disque se remplit, les plus vieilles partent d'abord.
- Une sauvegarde tout de suite : `./deploy/scripts/backup-now.sh`
- **Une copie hors du serveur, de temps en temps** (depuis ton ordinateur) : `scp 'root@ton-domaine.fr:/opt/memocat/deploy/backups/memocat-*.dump' .`
- Avec l'option *Backups* de Hetzner, tout le serveur est en plus copié chaque jour chez eux.

**Restaurer** (en cas de pépin, par exemple une suppression par erreur) :

```bash
ls deploy/backups/
./deploy/scripts/restore.sh deploy/backups/memocat-2026-10-04.dump
```

Il demande de taper `RESTAURER`, et sauvegarde d'abord l'état actuel : on peut toujours revenir en arrière.

**Le système** se met à jour seul pour la sécurité. Si `status.sh` tourne depuis des mois, un redémarrage de temps en temps ne fait pas de mal : `reboot`. Tout repart tout seul.

**Commandes utiles :**

```bash
docker compose -f deploy/docker-compose.yml logs --tail=100 app     # les journaux de l'app
docker compose -f deploy/docker-compose.yml restart app             # relancer l'app
docker compose -f deploy/docker-compose.yml ps                      # ce qui tourne
```

## Déploiement automatique (optionnel)

Pour que le serveur se mette à jour seul après chaque merge sur `main` (une fois la CI verte), comme Render aujourd'hui :

1. Sur le serveur, une clé dédiée au déploiement :
   ```bash
   ssh-keygen -t ed25519 -f ~/.ssh/gh-deploy -N "" -C github-actions
   cat ~/.ssh/gh-deploy.pub >> ~/.ssh/authorized_keys
   cat ~/.ssh/gh-deploy            # la clé privée, pour GitHub
   ssh-keyscan ton-domaine.fr      # l'empreinte du serveur, pour GitHub
   ```
2. Sur GitHub, dans le dépôt : *Settings → Secrets and variables → Actions* :
   - onglet **Secrets** : `DEPLOY_SSH_KEY` = la clé privée (tout le bloc, lignes BEGIN et END comprises), et `DEPLOY_KNOWN_HOSTS` = la sortie de `ssh-keyscan` ;
   - onglet **Variables** : `DEPLOY_HOST` = `ton-domaine.fr`.

Tant que `DEPLOY_HOST` n'existe pas, le workflow `Déploiement` ne fait rien.

## Dépannage

- **Le site ne s'ouvre pas en HTTPS** : le domaine ne pointe peut-être pas encore vers le serveur (`ping ton-domaine.fr`), ou les ports 80/443 sont fermés chez Hetzner (*Firewalls* de la console : n'en mets pas, ou ouvre 22, 80 et 443). Les journaux : `docker compose -f deploy/docker-compose.yml logs caddy`.
- **L'app ne démarre pas** : `docker compose -f deploy/docker-compose.yml logs --tail=200 app`.
- **Disque plein** : `./deploy/scripts/status.sh`. Copie les vieilles sauvegardes ailleurs puis supprime-les, ou agrandis le serveur (*Rescale* chez Hetzner).
- **Plus de place pour les photos** : augmente `MEMOCAT_STORAGE_QUOTA_MB` dans `deploy/.env`, puis `docker compose -f deploy/docker-compose.yml up -d`.
