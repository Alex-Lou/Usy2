#!/bin/sh
# Tourne dans le conteneur « backup » : une sauvegarde complète de la base (photos comprises)
# chaque nuit à BACKUP_HOUR_UTC, et tout de suite au démarrage si celle du jour manque.
# Chaque fichier est relu (pg_restore --list) avant d'être gardé : une sauvegarde illisible
# n'en remplace jamais une bonne. On garde BACKUP_KEEP_DAYS jours, plus celle du 1er de chaque
# mois pendant BACKUP_KEEP_MONTHS mois ; et si le disque manque de place, les plus anciennes
# partent d'abord (les 2 plus récentes restent toujours).
set -u
DIR=/backups
mkdir -p "$DIR"

log() { echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) $*"; }

rotate() {
  find "$DIR" -name 'memocat-????-??-??.dump' ! -name 'memocat-*-01.dump' -mtime +"$BACKUP_KEEP_DAYS" -delete
  find "$DIR" -name 'memocat-????-??-01.dump' -mtime +"$((BACKUP_KEEP_MONTHS * 31))" -delete
  newest=$(ls -1t "$DIR"/memocat-*.dump 2>/dev/null | head -n 1)
  [ -n "$newest" ] || return 0
  need=$(( $(du -k "$newest" | cut -f1) * 2 ))
  while [ "$(df -Pk "$DIR" | awk 'NR==2 {print $4}')" -lt "$need" ] && [ "$(ls -1 "$DIR"/memocat-*.dump | wc -l)" -gt 2 ]; do
    oldest=$(ls -1tr "$DIR"/memocat-*.dump | head -n 1)
    log "disque presque plein : suppression de $(basename "$oldest")"
    rm -f "$oldest"
  done
}

dump() {
  file="$DIR/memocat-$(date -u +%F).dump"
  [ -s "$file" ] && return 0
  tmp="$file.part"
  if pg_dump -Fc -Z 3 -f "$tmp" && pg_restore --list "$tmp" >/dev/null; then
    mv "$tmp" "$file"
    date -u +%Y-%m-%dT%H:%M:%SZ > "$DIR/DERNIERE-SAUVEGARDE-OK"
    log "sauvegarde OK : $(basename "$file") ($(du -h "$file" | cut -f1))"
    rotate
  else
    rm -f "$tmp"
    log "ÉCHEC de la sauvegarde (nouvel essai dans 10 minutes)"
  fi
}

dump
while true; do
  sleep 600
  [ "$(date -u +%H)" -ge "$BACKUP_HOUR_UTC" ] && dump
done
