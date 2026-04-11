#!/usr/bin/env bash
set -euo pipefail

# Oracle Linux / Ubuntu compatible bootstrap for Docker host

if command -v apt-get >/dev/null 2>&1; then
  sudo apt-get update
  sudo apt-get install -y ca-certificates curl git gnupg lsb-release

  if ! command -v docker >/dev/null 2>&1; then
    sudo install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    sudo chmod a+r /etc/apt/keyrings/docker.gpg

    echo \
      "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
      $(. /etc/os-release && echo \"$VERSION_CODENAME\") stable" | \
      sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

    sudo apt-get update
    sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
  fi
elif command -v dnf >/dev/null 2>&1; then
  sudo dnf install -y dnf-plugins-core git curl
  sudo dnf config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo || true
  sudo dnf install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
  sudo systemctl enable docker
  sudo systemctl start docker
else
  echo "Unsupported distribution. Install Docker Engine and Docker Compose Plugin manually."
  exit 1
fi

sudo usermod -aG docker "$USER" || true

mkdir -p "$HOME/apps"
echo "Bootstrap complete. Re-login may be required for docker group changes."
