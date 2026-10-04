#!/usr/bin/env bash
# Compare l'ancienne base (URL en argument) et celle du serveur, table par table : le nombre de
# lignes ET une empreinte de tout leur contenu (chaque ligne, photos comprises, octet par octet),
# plus la valeur des compteurs (séquences). Rien n'est modifié. Sortie : 0 si tout est identique.
#   ./deploy/scripts/compare.sh 'postgresql://utilisateur:motdepasse@hote/base?sslmode=require'
source "$(dirname "$0")/common.sh"
SRC="${1:-}"
[ -n "$SRC" ] || die "Usage : $0 'URL de l'ancienne base'"
db_up

major=$(docker run --rm --network host postgres:17-alpine psql "$SRC" -X -tAc "show server_version_num" | cut -c1-2)
[ -n "$major" ] || die "L'ancienne base ne répond pas : vérifie l'URL."

# Une empreinte par table : md5 de chaque ligne, triés, puis md5 de l'ensemble. L'heure est lue en
# UTC des deux côtés, pour que les dates s'écrivent pareil.
FINGERPRINT=$(cat <<'SQL'
set time zone 'UTC'; set datestyle = 'ISO, MDY'; set intervalstyle = 'postgres';
set bytea_output = 'hex'; set extra_float_digits = 1;
do $$
declare t text; n bigint; h text;
begin
  create temp table _fp(name text primary key, n bigint, h text);
  for t in select quote_ident(tablename) from pg_tables where schemaname = 'public' loop
    execute format('select count(*), coalesce(md5(string_agg(r, '''' order by r)), ''-'') from (select md5(x::text) r from %s x) s', t) into n, h;
    insert into _fp values (t, n, h);
  end loop;
  for t in select quote_ident(sequencename) from pg_sequences where schemaname = 'public' loop
    execute format('select last_value from %s', t) into n;
    insert into _fp values ('séquence ' || t, n, '');
  end loop;
end $$;
select name || '|' || n || '|' || h from _fp order by name;
SQL
)

say "Calcul des empreintes (ça peut prendre une minute avec beaucoup de photos)…"
src_out=$(echo "$FINGERPRINT" | remote_psql "$major" "$SRC" -tA)
dst_out=$(echo "$FINGERPRINT" | local_psql -tA)

printf '\n%-34s %12s %12s  %s\n' "Table" "Ancienne" "Serveur" "Contenu"
bad=0
while IFS='|' read -r name n h; do
  [ -n "$name" ] || continue
  line=$(awk -F'|' -v t="$name" '$1 == t' <<<"$dst_out" | head -n 1)
  dn=$(cut -d'|' -f2 <<<"$line"); dh=$(cut -d'|' -f3 <<<"$line")
  if [ -z "$line" ]; then verdict="✘ absente du serveur"; bad=1
  elif [ "$n" != "$dn" ] || [ "$h" != "$dh" ]; then verdict="✘ DIFFÉRENT"; bad=1
  else verdict="✔ identique"; fi
  printf '%-34s %12s %12s  %s\n' "$name" "$n" "${dn:--}" "$verdict"
done <<<"$src_out"

if [ "$bad" -eq 0 ]; then
  ok "Les deux bases sont identiques : toutes les tables, toutes les lignes, toutes les photos."
else
  die "Des différences existent (lignes marquées ✘). Ne bascule pas : garde l'ancienne en service."
fi
