#!/usr/bin/env bash
# L'état du serveur en un coup d'œil : services, dernière sauvegarde, place sur le disque.
source "$(dirname "$0")/common.sh"
say "Services"
compose ps --format 'table {{.Service}}\t{{.State}}\t{{.Status}}'
say "Sauvegardes"
if [ -f deploy/backups/DERNIERE-SAUVEGARDE-OK ]; then
  last=$(cat deploy/backups/DERNIERE-SAUVEGARDE-OK)
  age=$(( ( $(date -u +%s) - $(date -u -d "$last" +%s) ) / 3600 ))
  if [ "$age" -le 30 ]; then ok "Dernière sauvegarde réussie : $last (il y a ${age} h)"
  else warn "Dernière sauvegarde réussie : $last, il y a ${age} h : regarde docker compose -f deploy/docker-compose.yml logs backup"; fi
else
  warn "Aucune sauvegarde réussie pour l'instant."
fi
ls -lht deploy/backups/*.dump 2>/dev/null | head -n 10 | awk '{print "  " $5 "\t" $9}'
say "Disque"
df -h / | awk 'NR==2 {print "  utilisé " $3 " sur " $2 " (" $5 "), libre " $4}'
size=$(compose exec -T db psql -U memocat -d memocat -tAc "select pg_size_pretty(pg_database_size('memocat'))" 2>/dev/null || echo "?")
echo "  base de données : $size"
