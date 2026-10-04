#!/usr/bin/env bash
# Copie TOUTES les données de l'ancienne base (Neon ou Render) vers celle du serveur, puis
# vérifie que tout est identique (compare.sh). L'ancienne base n'est que lue, jamais modifiée.
# La copie est aussi gardée dans deploy/backups/migration-….dump (à garder précieusement).
#   ./deploy/scripts/migrate.sh 'postgresql://utilisateur:motdepasse@hote/base?sslmode=require'
# Avec Neon, prends l'URL « directe » (sans « -pooler » dans le nom d'hôte).
source "$(dirname "$0")/common.sh"
SRC="${1:-}"
[ -n "$SRC" ] || die "Usage : $0 'URL de l'ancienne base'"
need_env

say "1/5 Vérifications"
src_version=$(docker run --rm --network host postgres:17-alpine psql "$SRC" -X -tAc "show server_version_num") \
  || die "L'ancienne base ne répond pas : vérifie l'URL (et qu'elle finit par ?sslmode=require)."
src_major=${src_version:0:2}
ok "Ancienne base joignable (PostgreSQL $src_major)."
db_up
dst_major=$(local_psql -tAc "show server_version_num" | cut -c1-2)
if [ "$dst_major" -lt "$src_major" ]; then
  die "Le serveur a PostgreSQL $dst_major, plus ancien que l'ancienne base ($src_major). Mets POSTGRES_VERSION=$src_major dans deploy/.env, puis : docker compose -f deploy/docker-compose.yml down -v (base vide, rien à perdre) et relance ce script."
fi
tables=$(local_psql -tAc "select count(*) from pg_tables where schemaname = 'public'")
[ "$tables" = "0" ] || die "La base du serveur n'est pas vide ($tables tables) : la migration se fait dans une base neuve. Si c'est un essai précédent à jeter : docker compose -f deploy/docker-compose.yml down -v"
compose stop app >/dev/null 2>&1 || true
ok "Base du serveur (PostgreSQL $dst_major) vide et prête ; l'app du serveur est arrêtée."
warn "L'ancienne app doit être à l'arrêt (Render → Suspend) : ce qui y serait écrit après la copie ne suivrait pas."

say "2/5 Copie de l'ancienne base"
dir=$(backups_dir)
file="migration-$(date -u +%Y%m%d-%H%M%S).dump"
docker run --rm --network host -v "$dir:/out" "postgres:${src_major}-alpine" \
  pg_dump --format=custom --no-owner --no-privileges --file "/out/$file" "$SRC"
docker run --rm -v "$dir:/out:ro" "postgres:${src_major}-alpine" pg_restore --list "/out/$file" >/dev/null \
  || die "La copie est illisible : rien n'a été modifié, relance le script."
ok "Copie faite : deploy/backups/$file ($(du -h "$dir/$file" | cut -f1))."

say "3/5 Chargement dans la base du serveur"
compose exec -T db pg_restore --no-owner --no-privileges --exit-on-error -U memocat -d memocat < "$dir/$file" \
  || die "Le chargement a échoué. L'ancienne base est intacte. Vide celle du serveur (docker compose -f deploy/docker-compose.yml down -v) et relance."
ok "Données chargées."

say "4/5 Vérification complète"
"$ROOT/deploy/scripts/compare.sh" "$SRC"

say "5/5 Démarrage"
compose up -d
ok "Le serveur tourne. Ouvre https://$DOMAIN (le premier certificat HTTPS peut prendre une minute)."
echo "Garde aussi une copie de deploy/backups/$file ailleurs que sur le serveur (voir le guide)."
