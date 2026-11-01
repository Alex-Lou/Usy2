#!/usr/bin/env bash
# Un nouveau mot de passe pour un compte oublié, en une commande (sauvegarde faite avant).
#   ./deploy/scripts/reset-password.sh anya
# Le mot de passe est demandé sans s'afficher, deux fois. Il n'est jamais écrit sur la ligne de
# commande ni dans un fichier : seule son empreinte (bcrypt, comme l'app) arrive dans la base.
source "$(dirname "$0")/common.sh"

[ $# -eq 1 ] || die "Usage : ./deploy/scripts/reset-password.sh <nom-d-utilisateur>"
who="$1"
db_up

# Le compte doit exister, au caractère près (la connexion respecte les majuscules).
found=$(local_psql -tA -v who="$who" <<'SQL'
select count(*) from app_user where username = :'who';
SQL
)
if [ "$found" != "1" ]; then
  warn "Aucun compte « $who ». Les comptes existants :"
  local_psql -tA -c "select '  ' || username from app_user order by id" </dev/null
  die "Relance avec l'un de ces noms, écrit exactement pareil."
fi

read -rsp "Nouveau mot de passe pour $who : " pw; echo
read -rsp "Encore une fois : " pw2; echo
[ "$pw" = "$pw2" ] || die "Les deux mots de passe ne sont pas identiques, rien n'a changé."
[ -n "$pw" ] || die "Mot de passe vide, rien n'a changé."
[ "${#pw}" -ge 8 ] || warn "Moins de 8 caractères : le site est sur internet, une petite phrase serait plus sûre."

# L'empreinte, par Caddy (déjà sur le serveur) : le mot de passe passe par l'entrée standard.
hash=$(printf '%s\n' "$pw" | docker run --rm -i caddy:2-alpine caddy hash-password)
unset pw pw2
[[ "$hash" =~ ^\$2[aby]\$[0-9]{2}\$[./A-Za-z0-9]{53}$ ]] || die "Empreinte inattendue, rien n'a changé."

"$(dirname "$0")/backup-now.sh"

local_psql -v who="$who" -v hash="$hash" <<'SQL'
update app_user set password_hash = :'hash' where username = :'who';
SQL
ok "Mot de passe de $who changé. Il marche tout de suite, sans redémarrer."
