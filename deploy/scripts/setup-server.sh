#!/usr/bin/env bash
# À lancer UNE fois, en root, sur un serveur Ubuntu 24.04 tout neuf (Hetzner ou autre) :
#   sudo ./deploy/scripts/setup-server.sh
# Installe Docker, ferme tout sauf SSH/HTTP/HTTPS, bloque les essais de mot de passe répétés,
# applique seul les mises à jour de sécurité, ajoute 2 Go de mémoire d'appoint (swap).
# Sans risque de s'enfermer dehors : la connexion SSH par mot de passe n'est coupée que si une
# clé SSH est déjà installée pour root. Peut être relancé sans dégât.
set -euo pipefail
[ "$(id -u)" = "0" ] || { echo "À lancer en root (sudo)."; exit 1; }
export DEBIAN_FRONTEND=noninteractive

echo "== Mises à jour du système"
apt-get update -q
apt-get upgrade -y -q
apt-get install -y -q ca-certificates curl git ufw fail2ban unattended-upgrades

echo "== Mises à jour de sécurité automatiques"
cat > /etc/apt/apt.conf.d/20auto-upgrades <<'CONF'
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Unattended-Upgrade "1";
CONF

echo "== Docker"
if ! command -v docker >/dev/null; then
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
  chmod a+r /etc/apt/keyrings/docker.asc
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
    > /etc/apt/sources.list.d/docker.list
  apt-get update -q
  apt-get install -y -q docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
fi
# Les journaux des conteneurs ne remplissent pas le disque.
cat > /etc/docker/daemon.json <<'CONF'
{ "log-driver": "json-file", "log-opts": { "max-size": "20m", "max-file": "3" } }
CONF
systemctl enable --now docker
systemctl restart docker

echo "== Pare-feu : seuls SSH, HTTP et HTTPS sont ouverts"
ufw default deny incoming
ufw default allow outgoing
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 443/udp
ufw --force enable

echo "== Protection contre les essais de connexion répétés"
systemctl enable --now fail2ban

echo "== Mémoire d'appoint (swap 2 Go)"
if ! swapon --show | grep -q /swapfile; then
  fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
  grep -q /swapfile /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

echo "== SSH"
if [ -s /root/.ssh/authorized_keys ]; then
  cat > /etc/ssh/sshd_config.d/10-memocat.conf <<'CONF'
PasswordAuthentication no
KbdInteractiveAuthentication no
PermitRootLogin prohibit-password
CONF
  systemctl reload ssh || systemctl reload sshd
  echo "Connexion SSH par clé uniquement (mot de passe désactivé)."
else
  echo "⚠ Aucune clé SSH pour root : la connexion par mot de passe reste active (voir le guide pour ajouter une clé, puis relance ce script)."
fi

echo
echo "✔ Serveur prêt. Suite : deploy/README.md, étape « Configurer »."
