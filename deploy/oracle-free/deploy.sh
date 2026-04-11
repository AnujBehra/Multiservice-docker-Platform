#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 3 ]]; then
  echo "Usage: $0 <ssh_host> <ssh_user> <repo_url>"
  echo "Example: $0 1.2.3.4 opc https://github.com/<user>/<repo>.git"
  exit 1
fi

SSH_HOST="$1"
SSH_USER="$2"
REPO_URL="$3"
APP_DIR="~/apps/multiservice-docker"

ssh "${SSH_USER}@${SSH_HOST}" "bash -s" <<EOF
set -euo pipefail
mkdir -p ~/apps
if [[ ! -d ${APP_DIR} ]]; then
  git clone ${REPO_URL} ${APP_DIR}
fi
cd ${APP_DIR}
git pull --rebase
docker compose up -d --build
EOF

echo "Deployment triggered."
