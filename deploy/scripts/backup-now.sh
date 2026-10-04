#!/usr/bin/env bash
# Une sauvegarde complète tout de suite (en plus de celle de chaque nuit), vérifiée.
#   ./deploy/scripts/backup-now.sh   → deploy/backups/manuelle-AAAAMMJJ-HHMMSS.dump
source "$(dirname "$0")/common.sh"
db_up
dir=$(backups_dir)
file="manuelle-$(date -u +%Y%m%d-%H%M%S).dump"
compose exec -T db pg_dump -U memocat -d memocat --format=custom -Z 3 > "$dir/$file.part"
compose exec -T db pg_restore --list < "$dir/$file.part" >/dev/null || { rm -f "$dir/$file.part"; die "Sauvegarde illisible, rien n'est gardé."; }
mv "$dir/$file.part" "$dir/$file"
ok "Sauvegarde : deploy/backups/$file ($(du -h "$dir/$file" | cut -f1))"
