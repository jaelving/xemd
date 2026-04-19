#!/usr/bin/env bash
set -euo pipefail

REPO="jaelving/xemd"
INSTALL_DIR="${XEMD_DIR:-$HOME/xemd}"
HOST_PORT="${XEMD_HOST_PORT:-6600}"

# ── helpers ──────────────────────────────────────────────────────────────────

info()  { printf '\n  \033[1m%s\033[0m\n' "$*"; }
ok()    { printf '  \033[32m✓\033[0m  %s\n' "$*"; }
err()   { printf '\n  \033[31mError:\033[0m %s\n\n' "$*" >&2; exit 1; }

# ── preflight ────────────────────────────────────────────────────────────────

info "Checking requirements"

command -v docker &>/dev/null          || err "Docker is not installed. Get it at https://docs.docker.com/get-docker/"
docker info &>/dev/null 2>&1           || err "Docker is not running. Start Docker and try again."
docker compose version &>/dev/null 2>&1 || err "Docker Compose v2 is required (bundled with Docker Desktop 4.x+)."
command -v openssl &>/dev/null          || err "openssl is required to generate secure keys."
command -v curl &>/dev/null             || err "curl is required."

ok "Docker $(docker --version | awk '{print $3}' | tr -d ',')"
ok "Docker Compose $(docker compose version --short)"

# ── install dir ──────────────────────────────────────────────────────────────

info "Setting up $INSTALL_DIR"

if [[ -d "$INSTALL_DIR" ]]; then
  if [[ -f "$INSTALL_DIR/.env" ]]; then
    err "$INSTALL_DIR already exists and has a .env — looks like XEMD is already installed.
    To upgrade, run: docker compose -f $INSTALL_DIR/docker-compose.yml pull && docker compose -f $INSTALL_DIR/docker-compose.yml up -d"
  fi
fi

mkdir -p "$INSTALL_DIR/widgets/community"
ok "Created $INSTALL_DIR"

# ── fetch compose file ────────────────────────────────────────────────────────

curl -fsSL "https://raw.githubusercontent.com/$REPO/main/docker-compose.yml" \
  -o "$INSTALL_DIR/docker-compose.yml"
ok "Downloaded docker-compose.yml"

# ── generate keys ─────────────────────────────────────────────────────────────

MASTER_KEY=$(openssl rand -hex 32)
ADMIN_TOKEN=$(openssl rand -hex 32)

printf 'XEMD_MASTER_KEY=%s\nXEMD_ADMIN_TOKEN=%s\nXEMD_HOST_PORT=%s\nXEMD_API_PORT=3001\n' \
  "$MASTER_KEY" "$ADMIN_TOKEN" "$HOST_PORT" > "$INSTALL_DIR/.env"

ok "Generated encryption keys and wrote .env"

# ── start ─────────────────────────────────────────────────────────────────────

info "Pulling images and starting XEMD"

docker compose -f "$INSTALL_DIR/docker-compose.yml" --project-directory "$INSTALL_DIR" pull -q
docker compose -f "$INSTALL_DIR/docker-compose.yml" --project-directory "$INSTALL_DIR" up -d

# ── done ──────────────────────────────────────────────────────────────────────

printf '\n'
printf '  \033[1;32mXEMD is running.\033[0m\n\n'
printf '  Dashboard   →  http://localhost:%s\n' "$HOST_PORT"
printf '  Admin panel →  http://localhost:%s/#/admin\n\n' "$HOST_PORT"
printf '  \033[1mAdmin token\033[0m (save this — you need it to access the admin panel):\n'
printf '  %s\n\n' "$ADMIN_TOKEN"
printf '  Lost it? Retrieve it any time with:\n'
printf '  grep XEMD_ADMIN_TOKEN %s/.env\n\n' "$INSTALL_DIR"
printf '  Files are in: %s\n' "$INSTALL_DIR"
printf '  To stop:      docker compose -f %s/docker-compose.yml down\n\n' "$INSTALL_DIR"
