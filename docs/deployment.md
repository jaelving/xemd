# XEMD Deployment Guide

This guide covers everything you need to get XEMD running on your Mac (or any Linux host) with a Corsair Xeneon Edge display.

---

## Prerequisites

- **Docker** and **Docker Compose** (v2) installed and running
- A Mac Mini (or any macOS or Linux machine) — Apple Silicon and Intel both work
- A **Corsair Xeneon Edge 14.5" LCD** (2560×720) connected as a second display

No other local tooling is required. The images are pre-built and pulled from GHCR.

---

## Quick Start

```bash
curl -fsSL https://raw.githubusercontent.com/jaelving/xemd/main/install.sh | bash
```

The script checks for Docker, generates secure random keys, pulls the images, and starts the stack. When it finishes, it prints your admin token — save it somewhere safe.

By default, files are installed to `~/xemd`. To customise:

```bash
XEMD_HOST_PORT=8080 XEMD_DIR=~/my-xemd curl -fsSL https://raw.githubusercontent.com/jaelving/xemd/main/install.sh | bash
```

**Manual install** — if you prefer not to pipe to bash:

```bash
git clone https://github.com/jaelving/xemd.git && cd xemd
cp .env.example .env
# Edit .env: set XEMD_MASTER_KEY and XEMD_ADMIN_TOKEN (openssl rand -hex 32)
docker compose up -d
```

Open `http://localhost:6600` in a browser on the Xeneon Edge display. The admin panel is at `http://localhost:6600/#/admin`.

---

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `XEMD_MASTER_KEY` | (auto-generated) | Encryption key for secrets at rest. **Set this in production.** If left unset, a key is generated on first run and stored in the container — you will lose encrypted secrets if the container is recreated. |
| `XEMD_HOST_PORT` | `6600` | Port the dashboard is exposed on **your machine**. Change this if 6600 conflicts with another service. The URL you open in a browser becomes `http://localhost:{XEMD_HOST_PORT}`. |
| `XEMD_API_PORT` | `3001` | Port the API is exposed on **your machine**. In production the host container talks to the API over Docker's internal network, so this only matters if you need direct API access from outside Docker. |
| `WIDGETS_DIR` | `/widgets` | Path to widget folders inside the API container. Official widgets are baked in at `/widgets/official`; community widgets mount at `/widgets/community`. You should not need to change this. |
| `DATA_DIR` | `/data` | Path to the SQLite database inside the API container. Mapped to `./data` on the host by the default Compose file. |
| `PORT` | `3001` | API listen port **inside** the container. This is separate from `XEMD_API_PORT` — do not change this unless you are also rebuilding the API image. |

---

## Kiosk Mode on macOS

The simplest approach is to open a browser in full-screen on the Xeneon Edge display:

1. Move a browser window to the Xeneon Edge display.
2. Navigate to `http://localhost:${XEMD_HOST_PORT}` (default: `http://localhost:6600`).
3. Press `Cmd+Ctrl+F` (Chrome) or `Cmd+Shift+F` (Safari) to enter full-screen.

For a more locked-down kiosk setup, a few options:

- **Chrome kiosk flag:** Launch Chrome with `--kiosk http://localhost:${XEMD_HOST_PORT}` — it opens full-screen with no UI chrome and suppresses the address bar.
- **macOS guided access:** Use Screen Time > Content & Privacy to restrict the display to a single app.
- **`start-kiosk.sh` script:** A convenience script that launches Chrome in kiosk mode on the Xeneon Edge display (if present in the repo root).

The Xeneon Edge is identified by macOS as a secondary display. If you have multiple displays, position the browser window on the correct one before going full-screen.

---

## Adding Community Widgets

Community widgets live in `./widgets/community/` on your host machine. The API container mounts this directory as a volume, so no container restart is required.

1. Drop a widget folder into `./widgets/community/`:

   ```
   ./widgets/community/
   └── my-widget/
       ├── widget.json
       ├── index.html
       └── widget.js
   ```

2. Refresh the XEMD host page in your browser.
3. The widget appears in **Admin → Widgets**. Enable it from there.

Widget folders must contain a valid `widget.json` manifest. See [widget-authoring.md](widget-authoring.md) for the full schema.

---

## Upgrading

Pull the latest images and restart:

```bash
docker compose pull
docker compose up -d
```

The containers are replaced in-place. Your `./data/` directory and `./widgets/community/` folder are preserved because they are mounted volumes.

It is good practice to back up `./data/` before upgrading (see below).

---

## Backup

Everything XEMD needs to restore state lives in two directories:

| Path | Contents |
|---|---|
| `./data/` | SQLite database — dashboard settings, widget settings, encrypted secrets |
| `./widgets/community/` | Any community widgets you have installed |

Back up `./data/` before upgrading or moving the stack to a new machine. Restore it by copying the directory back and running `docker compose up -d`.

> **Note:** Encrypted secrets in `./data/` are tied to your `XEMD_MASTER_KEY`. Keep a copy of that key alongside your database backup, or you will not be able to decrypt the secrets after a restore.

---

## Running the Dev Stack

If you are working on the host app or API, use the dev Compose override for hot reload:

```bash
docker compose -f docker-compose.dev.yml up
```

This mounts `apps/host` and `apps/api` as volumes so changes are reflected without rebuilding images.

---

## Ports

| Port | Variable | Default | Service |
|---|---|---|---|
| Host-bound | `XEMD_HOST_PORT` | `6600` | XEMD dashboard (kiosk + admin) |
| Host-bound | `XEMD_API_PORT` | `3001` | XEMD API |
| Internal | — | `80` | nginx inside `xemd-host` container |
| Internal | — | `3001` | Express inside `xemd-api` container |

Both host-bound ports default to `localhost`. If you are accessing XEMD from another machine on your network, replace `localhost` with the host machine's IP address. You may also want to put a reverse proxy (nginx, Caddy) in front if you need HTTPS or a custom domain.
