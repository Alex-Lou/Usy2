#!/usr/bin/env bash
# Remet la base du serveur dans l'état d'une sauvegarde (en cas de pépin).
#   ./deploy/scripts/restore.sh deploy/backups/memocat-2026-10-04.dump
# Avant d'écraser quoi que ce soit, l'état actuel est lui-même sauvegardé (avant-restauration-….dump) :
# on peut toujours revenir en arrière.
source "$(dirname "$0")/common.sh"
FILE="${1:-}"
[ -n "$FILE" ] && [ -s "$FILE" ] || die "Usage : $0 deploy/backups/<fichier>.dump   (ls deploy/backups pour la liste)"
need_env
db_up
compose exec -T db pg_restore --list < "$FILE" >/dev/null || die "Ce fichier n'est pas une sauvegarde lisible."

warn "La base actuelle va être REMPLACÉE par $(basename "$FILE")."
read -r -p "Tape RESTAURER pour continuer : " answer
[ "$answer" = "RESTAURER" ] || die "Annulé, rien n'a changé."

say "Sauvegarde de l'état actuel d'abord"
dir=$(backups_dir)
safety="avant-restauration-$(date -u +%Y%m%d-%H%M%S).dump"
compose exec -T db pg_dump -U memocat -d memocat --format=custom </dev/null > "$dir/$safety"
ok "État actuel gardé : deploy/backups/$safety"

say "Restauration"
compose stop app </dev/null >/dev/null
compose exec -T db dropdb -U memocat --force memocat </dev/null
compose exec -T db createdb -U memocat memocat </dev/null
compose exec -T db pg_restore --no-owner --no-privileges --exit-on-error -U memocat -d memocat < "$FILE" \
  || die "La restauration a échoué. Pour revenir à l'état d'avant : $0 deploy/backups/$safety"
compose up -d
ok "Base restaurée depuis $(basename "$FILE"), app relancée."
