# Fonctions communes aux scripts (chargé par eux, pas à lancer seul).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

compose() { docker compose -f deploy/docker-compose.yml "$@"; }

say() { printf '\n\033[1m%s\033[0m\n' "$*"; }
ok() { printf '\033[32m✔ %s\033[0m\n' "$*"; }
warn() { printf '\033[33m⚠ %s\033[0m\n' "$*"; }
die() { printf '\033[31m✘ %s\033[0m\n' "$*" >&2; exit 1; }

need_env() {
  [ -f deploy/.env ] || die "deploy/.env manque : cp deploy/.env.example deploy/.env puis remplis-le."
  # shellcheck disable=SC1091
  set -a; . deploy/.env; set +a
  [ -n "${DOMAIN:-}" ] || die "DOMAIN est vide dans deploy/.env."
  [ -n "${POSTGRES_PASSWORD:-}" ] || die "POSTGRES_PASSWORD est vide dans deploy/.env."
  [ -n "${MEMOCAT_JWT_SECRET:-}" ] || die "MEMOCAT_JWT_SECRET est vide dans deploy/.env."
  [ "${#MEMOCAT_JWT_SECRET}" -ge 32 ] || die "MEMOCAT_JWT_SECRET doit faire au moins 32 caractères."
}

# La base du serveur prête à répondre (elle démarre si besoin).
db_up() {
  compose up -d db </dev/null >/dev/null
  for _ in $(seq 1 60); do
    compose exec -T db pg_isready -U memocat -d memocat </dev/null >/dev/null 2>&1 && return 0
    sleep 2
  done
  die "La base du serveur ne répond pas (docker compose -f deploy/docker-compose.yml logs db)."
}

# psql sur la base du serveur.
local_psql() { compose exec -T db psql -U memocat -d memocat -v ON_ERROR_STOP=1 -X -q "$@"; }

# psql sur une autre base (l'ancienne), avec un client de la version voulue.
remote_psql() { local major="$1" url="$2"; shift 2; docker run --rm -i --network host "postgres:${major}-alpine" psql "$url" -v ON_ERROR_STOP=1 -X -q "$@"; }

backups_dir() { mkdir -p deploy/backups; echo "$ROOT/deploy/backups"; }
