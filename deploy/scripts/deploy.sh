#!/usr/bin/env bash
# Met le serveur à jour avec la dernière version de main : récupère le code, reconstruit l'app,
# la relance (la base et les sauvegardes ne bougent pas). Lancé à la main ou par GitHub Actions.
#   ./deploy/scripts/deploy.sh
source "$(dirname "$0")/common.sh"
need_env
say "Récupération du code"
git pull --ff-only
say "Construction de l'app (quelques minutes)"
compose build app
say "Redémarrage"
compose up -d
docker image prune -f >/dev/null
for _ in $(seq 1 60); do
  code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 5 "https://$DOMAIN/" || true)
  if [ "$code" = "200" ]; then ok "En ligne : https://$DOMAIN ($(git log -1 --format='%h %s'))"; exit 0; fi
  sleep 5
done
die "L'app ne répond pas après 5 minutes : docker compose -f deploy/docker-compose.yml logs --tail=100 app"
