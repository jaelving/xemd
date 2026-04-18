# Authoring a XEMD Widget

> Welcome, builder. This guide walks you through creating a widget for **XEMD (Xeneon Edge Mac Dashboard)**. If you can write HTML and a bit of JavaScript, you can ship a widget. No build tools required, no framework lock-in, no rebuilding the host.

## TL;DR

A widget is a folder with an `index.html`, a `widget.json` manifest, and optionally some JS/CSS/assets. Drop the folder into `widgets/community/`, refresh XEMD, and it appears.

```
my-widget/
├── widget.json     # required — manifest
├── index.html      # required — entry point
├── widget.js       # optional — your logic
├── widget.css      # optional — your styles
└── icon.svg        # optional — shown in admin panel
```

## The runtime model

Every widget runs inside a **sandboxed iframe**. That means:

- Your widget is fully isolated from the host and from other widgets.
- You cannot access cookies, localStorage, or the parent window directly.
- You communicate with XEMD through the **Widget SDK** (`@xemd/widget-sdk`), which uses `postMessage` under the hood.
- You cannot make arbitrary network requests. All outbound HTTP goes through the host proxy and must be **declared in your manifest**.
- You cannot read secrets unless you declared them in your manifest.

This is intentional: it lets users install community widgets without trusting the author with their entire dashboard or API keys.

## The manifest (`widget.json`)

Every widget must ship a `widget.json`. The host validates it against a Zod schema at load time; invalid manifests are rejected with a clear error in the admin panel.

### Minimal example

```json
{
  "id": "clock",
  "name": "Clock",
  "version": "1.0.0",
  "author": "Your Name",
  "description": "A simple clock with configurable timezone.",
  "entry": "index.html",
  "dimensions": { "w": 2560, "h": 720 },
  "refreshInterval": 1,
  "permissions": {
    "proxy": [],
    "secrets": []
  },
  "settings": [
    { "key": "timezone", "type": "string", "default": "Europe/London" },
    { "key": "format",   "type": "enum", "options": ["12h", "24h"], "default": "24h" }
  ]
}
```

### Field reference

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | string | yes | Unique, lowercase, kebab-case. Used in URLs and the secrets store. |
| `name` | string | yes | Display name shown in the admin panel. |
| `version` | semver string | yes | Bump on every release. |
| `author` | string | yes | Your name or handle. |
| `description` | string | yes | One-line summary. |
| `entry` | string | yes | HTML file the iframe loads. Almost always `index.html`. |
| `dimensions` | `{w,h}` or `[{w,h},…]` | yes | One or more supported render sizes. The host picks the closest match to the actual display and applies `transform: scale()`. Declare multiple entries to support additional 32:9 panels (e.g. `1920×540`). The legacy single-object form is still accepted. |
| `refreshInterval` | number (seconds) | yes | How often `onRefresh` fires. Use `1` for clocks, `600` for weather, `60` for stocks during market hours, etc. |
| `permissions.proxy` | string[] | yes | URL glob allowlist. Empty array = no network. |
| `permissions.secrets` | string[] | yes | Secret keys this widget can read. Empty array = no secrets. |
| `settings` | array | no | User-configurable options. The admin panel auto-generates a form from this. |

### Supporting multiple display sizes

Declare an array of sizes to support more than one 32:9 resolution. The host picks the entry whose scale factor is closest to 1.0 for the actual display, so widgets render at or near native resolution on every supported panel:

```json
"dimensions": [
  { "w": 2560, "h": 720 },
  { "w": 1920, "h": 540 }
]
```

Both entries are **32:9** (same aspect ratio, different resolution). The host never stretches or crops — if no declared size is an exact match it centres the widget and adds black bars on the non-fitting axis.

The legacy single-object form `"dimensions": { "w": 2560, "h": 720 }` is still valid and continues to work.

### Settings schema

Each entry in `settings` becomes a form field in the admin panel. Supported types:

| `type` | Renders as | Extra fields |
|---|---|---|
| `string` | text input | `default` |
| `number` | number input | `default`, `min`, `max` |
| `boolean` | iOS-style toggle switch | `default` |
| `enum` | dropdown select | `options[]`, `default` |
| `date` | native date picker | `default` (YYYY-MM-DD) |
| `secret` | password input → encrypted store | no `default` |

Users edit these in the admin panel; your widget reads them via `xemd.settings.get()`.

> **Important:** Use `"type": "date"` for any calendar date input. Never use `"type": "string"` for dates — users will enter wrong formats and your widget will silently break with NaN values.

## The SDK

XEMD injects the SDK at `/sdk/widget-sdk.js`. Import it in your `index.html`:

```html
<script type="module">
  import { xemd } from '/sdk/widget-sdk.js';
  // ...your code
</script>
```

### `xemd.settings`

```js
// Get all settings as an object
const settings = await xemd.settings.get();
// → { timezone: "Europe/London", format: "24h" }
```

Settings are read-only from the widget side. Users change them in the admin panel.

### `xemd.proxy`

```js
const res = await xemd.proxy.fetch(
  'https://api.open-meteo.com/v1/forecast?latitude=51.5&longitude=-0.12&current=temperature_2m'
);
const data = await res.json();
```

Behaves like `fetch()`. The URL must match one of the globs in `permissions.proxy` or the host rejects it.

**Glob syntax — critical rule:** Always use `**` (double star), never `*` (single star) in `permissions.proxy`.

- `*` maps to `[^/]*` — matches any characters *except* a slash. It only covers a single path segment.
- `**` maps to `.*` — matches everything including slashes, covering full API paths with query strings.

Using `*` will silently block real API URLs like `/api/v3/coins/markets?vs_currency=usd` because they span multiple path segments.

**Glob examples:**
- `https://api.open-meteo.com/**` — any path on that host ✓
- `https://api.coingecko.com/**` — full CoinGecko API ✓
- `https://aerodatabox.p.rapidapi.com/**` — any RapidAPI endpoint ✓

### `xemd.secrets`

```js
const apiKey = await xemd.secrets.get('FINNHUB_KEY');
```

Returns the secret value if the user has set it AND your manifest declared `FINNHUB_KEY` in `permissions.secrets`. Otherwise returns `null`.

**Better pattern:** let the proxy inject the secret as a header so your widget never sees it:

```js
await xemd.proxy.fetch('https://finnhub.io/api/v1/quote?symbol=AAPL', {
  headers: { 'X-Finnhub-Token': '{{secret:FINNHUB_KEY}}' }
});
```

The host substitutes `{{secret:KEY}}` server-side before making the call. Your widget never touches the key.

### Lifecycle hooks

```js
// Called once after the iframe loads. Do initial render here.
xemd.ready();

// Called every refreshInterval seconds. Re-fetch and re-render.
xemd.onRefresh(() => {
  render();
});

// Called when settings change in the admin panel.
xemd.onSettingsChange((newSettings) => {
  render();
});
```

You **must** call `xemd.ready()` once when your widget is loaded and ready to display, otherwise the host will show a loading spinner forever.

## A complete example: Clock widget

**`widget.json`:**
```json
{
  "id": "clock",
  "name": "Clock",
  "version": "1.0.0",
  "author": "XEMD Team",
  "description": "A simple clock with configurable timezone and format.",
  "entry": "index.html",
  "dimensions": { "w": 2560, "h": 720 },
  "refreshInterval": 1,
  "permissions": { "proxy": [], "secrets": [] },
  "settings": [
    { "key": "timezone", "type": "string", "default": "Europe/London" },
    { "key": "format", "type": "enum", "options": ["12h", "24h"], "default": "24h" }
  ]
}
```

**`index.html`:**
```html
<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <link rel="stylesheet" href="widget.css" />
</head>
<body>
  <div id="time"></div>
  <script type="module">
    import { xemd } from '/sdk/widget-sdk.js';

    let settings = await xemd.settings.get();

    function render() {
      const now = new Date().toLocaleTimeString('en-GB', {
        timeZone: settings.timezone,
        hour12: settings.format === '12h'
      });
      document.getElementById('time').textContent = now;
    }

    xemd.onRefresh(render);
    xemd.onSettingsChange((s) => { settings = s; render(); });
    render();
    xemd.ready();
  </script>
</body>
</html>
```

**`widget.css`:**
```css
body { margin: 0; background: #000; color: #fff; font-family: system-ui; }
#time { font-size: 32rem; text-align: center; line-height: 720px; }
```

That's a complete widget. Drop the folder in `widgets/community/`, refresh XEMD, done.

## Local development

The fastest loop is:

1. Run XEMD in dev mode: `docker compose -f docker-compose.dev.yml up`
2. Symlink your widget folder into `widgets/community/`
3. Edit files; refresh the host page to reload the widget
4. Watch the host browser console for SDK errors
5. Watch `xemd-api` logs for proxy/secret errors

There is no build step. Widgets are plain files served statically.

## Submitting an official widget

If you'd like your widget included in the next XEMD release as an official widget:

1. Open a PR adding it under `widgets/official/<id>/`
2. Include a screenshot in your PR description
3. Make sure your manifest passes validation (`pnpm validate-widgets`)
4. Use only permissions you actually need — least privilege
5. Document any API keys or accounts users need to set up

## Style tips for the Xeneon Edge

### Layout & body

- Target `2560x720` (32:9). Set `body { width: 2560px; height: 720px; overflow: hidden; }`.
- Always add `user-select: none` to the body — kiosk displays shouldn't show text selection cursors.
- Established background baseline: `#080b14` or `#0a0a0f`. Use a subtle `radial-gradient` for depth (4–8% opacity max).

### Typography

- Use large type. The panel is wide but short — anything under `1rem` is unreadable from a distance.
- Use `font-variant-numeric: tabular-nums` on any number that changes (countdowns, prices, altitudes) to prevent layout shift.
- Uppercase labels: `font-size: 0.7–0.85rem; font-weight: 600–700; letter-spacing: 0.1–0.18em; text-transform: uppercase`.

### Colour

- Primary text: `#ffffff` or `rgba(255,255,255,0.88)`
- Secondary text: `rgba(255,255,255,0.4–0.55)`
- Muted/disabled: `rgba(255,255,255,0.2–0.3)`
- Never use flat pure white for large display elements — a vertical gradient (`white → white/55%`) avoids harshness.
- Avoid pure white (`#fff`) as a background — dark panels look best on this display.

### States every widget must handle

1. **Loading** — spinner or animated overlay; hide once data is ready
2. **No API key configured** — setup overlay with step-by-step instructions; don't show a blank screen
3. **Error / no data** — graceful message, never a blank panel
4. **Stale data on refresh failure** — keep displaying the last successful data silently

### Animations

- Subtle animations are fine (blinking live dots, pulsing SVG paths, loading spinners).
- Avoid heavy CSS transitions on every render cycle — the panel is a kiosk, not a game.

### Background image + glass card pattern

For widgets where a custom background makes visual sense (clocks, countdowns, ambient displays), the recommended pattern is a single `string` setting called `backgroundImageUrl`. The widget applies it at render time using a darkening `linear-gradient` overlay combined with the image URL, then toggles a `has-bg` class on the body to activate frosted glass card styles on the content panels.

**Manifest setting:**
```json
{ "key": "backgroundImageUrl", "label": "Background image URL", "type": "string", "default": "" }
```

**JS (in your render function):**
```js
const bgUrl = (settings.backgroundImageUrl || '').trim();
if (bgUrl) {
  document.body.style.backgroundImage =
    `linear-gradient(rgba(0,0,0,0.4),rgba(0,0,0,0.4)),url(${JSON.stringify(bgUrl)})`;
  document.body.classList.add('has-bg');
} else {
  document.body.style.backgroundImage = '';
  document.body.classList.remove('has-bg');
}
```

**CSS:**
```css
body.has-bg { background-size: cover; background-position: center; }

body.has-bg #your-content-panel {
  background: rgba(8, 8, 16, 0.55);
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
  border: 1px solid rgba(255, 255, 255, 0.09);
  border-radius: 28px;
  padding: 2.5rem 4rem;
}
```

Key points:
- The `linear-gradient` overlay is baked into `background-image` so no extra element is needed.
- `JSON.stringify(url)` safely wraps the URL in quotes for the CSS `url()` function.
- When `backgroundImageUrl` is empty, the widget falls back to its default dark background — no change to existing behaviour.
- Do **not** add this pattern to data-dense widgets (F1, stocks, flights, crypto) — a background image behind complex data grids hurts readability.
- There is no file upload mechanism — users paste a publicly accessible URL. If you need to support proxied image sources, add the domain to `permissions.proxy`.

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| Widget shows loading spinner forever | You forgot to call `xemd.ready()` |
| `xemd.proxy.fetch` returns 403 | URL not in `permissions.proxy` — check you used `**` not `*` |
| Proxy rejects URL with single `*` in pattern | Use `**` — `*` only matches one path segment |
| `xemd.secrets.get` returns `null` | Key not declared in `permissions.secrets`, or user hasn't saved it in the admin panel |
| Settings form is empty in admin | `settings` array missing, invalid, or `widget-types` package not rebuilt after schema change |
| Widget disappears from admin panel entirely | Manifest failed Zod validation — likely a new setting `type` added without rebuilding `widget-types` |
| Widget disappears after adding a new setting type | Run `pnpm --filter @xemd/widget-types build` then restart the API |
| `NaN` displayed for date-based values | Date setting was `"type": "string"` and user entered a non-YYYY-MM-DD format — use `"type": "date"` |
| Manifest rejected on load | Check the API logs for the Zod error message |

---

Questions? Open an issue or a discussion on the XEMD GitHub repo.
