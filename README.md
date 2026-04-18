# xemd — Xeneon Edge Mac Dashboard

Your Corsair Xeneon Edge deserves better than to be a glorified side monitor when connected to a Mac. xemd is an open-source, widget-driven kiosk dashboard built specifically for the Xeneon Edge 14.5" LCD connected to Apple Macs — filling the gap left by Corsair iCUE's lack of macOS support.

---

## What is xemd?

Corsair's iCUE software is Windows-only, which means Mac users with a Xeneon Edge have a beautiful ultrawide secondary display and no first-party software to drive it. xemd is something I developed as an answer: self-hosted dashboard you deploy in one command and control through a browser-based admin panel.

Widgets run inside sandboxed iframes and communicate with the host through a small SDK. Anyone who can write HTML and JavaScript can build a widget — no build tools required, no framework lock-in. Drop a widget folder into `widgets/community/`, refresh the page, and it appears.

---

## From the creator

Hey — I'm **jaelving**. I was bored one day and after struggling to find a solution I liked for my Xeneon Edge that was connected to my Mac Mini, I decided to build something. One thing led to another, and here we are.

xemd is free. Fork it, hack it, break it, rebuild it — that's the point. If you make a widget you're proud of, open a PR and share it.

### API keys and third-party services

Most widgets work out of the box with no account setup. A few tap into data sources that require a free API key for personal use — those APIs are free at low call volumes but need an account because they charge at scale. Each widget README has step-by-step signup instructions.

| Widget | Key needed | Where to get it |
|---|---|---|
| **Stock Tracker** | Yes — Finnhub | [finnhub.io](https://finnhub.io/) — free tier |
| **Live Radar** | Optional — FlightAware | [flightaware.com/commercial/aeroapi](https://www.flightaware.com/commercial/aeroapi/) — adds origin/dest to flights; radar works without it |
| Everything else | None | — |

Keys are stored encrypted on your own machine (AES-256-GCM) and injected server-side — they never touch the widget iframe.

Happy building.

---

## Display compatibility

xemd is built for the **32:9 aspect ratio**. That's not a limitation of the implementation — it's the product. Every widget layout is designed for a wide, short panel with generous horizontal space and intentionally limited vertical height. The multi-column designs that make the F1, Calendar, and Radar widgets compelling simply don't have a natural collapsed form for 16:9, 4:3, or portrait screens. Traditional responsive web design isn't the right tool here.

What xemd *does* support is **multiple 32:9 resolutions**. Every official widget declares more than one target size in its manifest, and the host automatically picks the closest match to your display and scales from there:

| Resolution | Ratio | Use case |
|---|---|---|
| `2560 × 720` | 32:9 | Corsair Xeneon Edge — native, no scaling applied |
| `1920 × 540` | 32:9 | Other 32:9 panels; scaled kiosk setups |

The host renders each widget at its chosen native resolution and applies a single `transform: scale()` to fit the container — the same technique browsers use for CSS zoom. On the Xeneon at 2560×720, the scale factor is exactly 1.0 and no transform is applied. On a 1920×540 display, the `1920×540` profile is selected and rendered at scale 1.0. On a 1920×1080 display, the `1920×540` profile is centred vertically with black bars above and below.

**Widget authors** can declare additional sizes in their manifest using an array:

```json
"dimensions": [
  { "w": 2560, "h": 720 },
  { "w": 1920, "h": 540 }
]
```

The legacy single-object format `"dimensions": { "w": 2560, "h": 720 }` is still accepted — existing widgets don't need to change.

---

## Features

- **Kiosk mode** — fills the 2560×720 panel wall-to-wall; point any browser at the host URL
- **Carousel navigation** — hover to reveal `‹` / `›` arrows; dot indicators at the bottom; arrow keys (`←` / `→`) supported; manual navigation resets the auto-rotation timer
- **Auto-rotation** — widgets cycle automatically on a configurable interval
- **Widget SDK** — `settings`, `proxy`, and `secrets` APIs over `postMessage`; widgets are fully sandboxed
- **Admin panel** — card-based widget management; toggle on/off, edit settings, store API keys; light/dark mode toggle (persisted in localStorage)
- **Encrypted secrets store** — API keys encrypted at rest with AES-256-GCM; the master key never leaves your machine
- **Hot-swappable community widgets** — mount `./widgets/community/` as a Docker volume; no rebuild needed
- **Docker Compose deploy** — two containers, one command, images from GHCR
- **Configurable ports** — `XEMD_HOST_PORT` and `XEMD_API_PORT` env vars

---

## Quick Start

**Requirements:** Docker and Docker Compose.

```bash
curl -fsSL https://raw.githubusercontent.com/jaelving/xemd/main/install.sh | bash
```

That's it. The script checks your environment, generates secure keys, pulls the images, and starts the stack. When it finishes, your admin token is printed once — save it.

| URL | Purpose |
|---|---|
| `http://localhost:6600` | Kiosk view (full-screen dashboard) |
| `http://localhost:6600/#/admin` | Admin panel |

**Options** — pass env vars before the command to customise the install:

```bash
XEMD_HOST_PORT=8080 XEMD_DIR=~/my-xemd curl -fsSL https://raw.githubusercontent.com/jaelving/xemd/main/install.sh | bash
```

**To stop:** `docker compose -f ~/xemd/docker-compose.yml down`  
**To upgrade:** `docker compose -f ~/xemd/docker-compose.yml pull && docker compose -f ~/xemd/docker-compose.yml up -d`

---

## "Official" Widgets

Eight widgets ship ready to use. Each has its own README with setup instructions, settings reference, and API key details.

| Widget | API key required | README |
|---|---|---|
| [Clock](widgets/official/clock/README.md) | No | [→](widgets/official/clock/README.md) |
| [Calendar](widgets/official/calendar/README.md) | No | [→](widgets/official/calendar/README.md) |
| [Weather](widgets/official/weather/README.md) | No | [→](widgets/official/weather/README.md) |
| [Crypto](widgets/official/crypto/README.md) | No | [→](widgets/official/crypto/README.md) |
| [F1 Schedule](widgets/official/f1-schedule/README.md) | No | [→](widgets/official/f1-schedule/README.md) |
| [Stock Tracker](widgets/official/stock-tracker/README.md) | Yes (Finnhub — free tier) | [→](widgets/official/stock-tracker/README.md) |
| [Live Radar](widgets/official/flight-tracker/README.md) | No (optional FlightAware for origin/dest) | [→](widgets/official/flight-tracker/README.md) |
| [It's Almost Time...](widgets/official/countdown/README.md) | No | [→](widgets/official/countdown/README.md) |

---

## Architecture

xemd is two containers:

- **`xemd-host`** — React/Vite app served by nginx. Handles kiosk view, widget rotation, and the admin panel. Renders each widget inside a `sandbox="allow-scripts"` iframe — no `allow-same-origin`, so widgets are fully isolated origins.
- **`xemd-api`** — Express/TypeScript API. Serves widget files, proxies outbound HTTP, stores encrypted secrets, persists settings in SQLite.

Widgets communicate with the host exclusively through the Widget SDK's `postMessage` bus. The host validates every call against the widget's declared manifest permissions before acting.

---

## Widget Development

Building a widget requires only HTML and JavaScript. See **[docs/widget-authoring.md](docs/widget-authoring.md)** for the full guide — manifest schema, SDK API reference, a worked example, and design tips for 2560×720.

---

## Contributing

Pull requests are welcome. Widget contributions are especially encouraged.

- For new widgets: read `docs/widget-authoring.md` first
- For host/API work: `docker compose -f docker-compose.dev.yml up` for hot reload
- Open an issue before starting large changes
- Bug reports: include macOS version, Docker version, and container logs

---

## License

MIT — see [LICENSE](LICENSE).
