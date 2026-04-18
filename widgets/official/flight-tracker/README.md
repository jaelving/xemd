# Live Radar Widget

A full-panel ADS-B radar map showing all aircraft currently within a configurable radius of your chosen city. The Leaflet dark map fills the entire 2560×720 display; glass HUD panels overlay the live aircraft count, stats, and a scrolling traffic list.

---

## Display

```
┌──────────────────────────────────────────────────────────────────────┐
│ ● LIVE RADAR         ░░░░ LEAFLET DARK MAP ░░░░░░░░  NEARBY TRAFFIC │
│   New York                                            UAL123  B738   │
│   47 aircraft · 25 nm radius                         35,000  450    │
│                    ↗ ↗  ↑                             BA456   A320  │
│              ↗↗  ↑   ↗↗↗                             29,500  420   │
│ [47]  [35,000ft]  [512kts]  [12:34:05]               ...           │
└──────────────────────────────────────────────────────────────────────┘
```

| Element | Description |
|---|---|
| **Map** | CartoDB Dark Matter basemap via Leaflet; fills entire panel; interaction disabled (kiosk mode) |
| **Plane markers** | Cyan SVG arrows, rotated to match current heading. Amber = on ground |
| **Header (top-left)** | Pulsing live dot, city name, aircraft count, scan radius |
| **Stats bar (bottom-left)** | Total aircraft, highest altitude, fastest speed, last update time |
| **Traffic list (right)** | Top 14 aircraft by altitude — callsign, type code, altitude, speed. Route (origin → dest) shown if FlightAware key is configured |

---

## Data Source

**[airplanes.live](https://airplanes.live)** — free, no API key required. Community-aggregated ADS-B data updated every few seconds.

Refreshes every **30 seconds** via XEMD `refreshInterval`.

Map tiles are served by [CartoDB](https://carto.com/basemaps/) (free, no key).

---

## API Key

**Not required.** The radar works immediately with no configuration beyond choosing a city.

**Optional — FlightAware AeroAPI:** adds origin and destination airport codes (e.g. `JFK → LAX`) to each flight in the traffic list.

### Getting a FlightAware AeroAPI key (optional)

1. Sign up at [flightaware.com/commercial/aeroapi](https://www.flightaware.com/commercial/aeroapi/)
2. The Personal tier provides enough queries for XEMD's usage
3. Copy your API key

### Option A — via `.env` (recommended)

```env
XEMD_FLIGHTAWARE_KEY=your_flightaware_key_here
```

On startup the API encrypts and seeds this into the secrets store automatically.

### Option B — via Admin Panel

1. Open the **Admin Panel** (`http://localhost:6600/#/admin`)
2. Select **Live Radar**
3. Paste your key into **FlightAware AeroAPI Key** and click **Save**

The key is stored encrypted at rest (AES-256-GCM) and injected server-side — it is never exposed to the widget iframe.

---

## Settings

| Setting | Type | Default | Description |
|---|---|---|---|
| **Location** | Dropdown | New York | City to centre the radar on — 30 major aviation hubs worldwide |
| **Radius** | Number | 25 | Scan radius in nautical miles (10–100) |
| **Units** | Dropdown | imperial | `imperial` (ft / kts) or `metric` (m / km/h) |
| **FlightAware AeroAPI Key** | Secret | — | Optional — adds origin/dest to traffic list |

### Available cities

Atlanta · Amsterdam · Bangkok · Beijing · Cape Town · Chicago · Dallas · Denver · Dubai · Frankfurt · Hong Kong · Istanbul · London · Los Angeles · Madrid · Mexico City · Miami · Mumbai · New York · Paris · Reykjavik · San Francisco · São Paulo · Seattle · Seoul · Singapore · Sydney · Tokyo · Toronto · Zurich

---

## Notes

- **No API key needed** — airplanes.live is free and community-maintained.
- Map tiles load directly (not through the XEMD proxy) — only `fetch()` calls to airplanes.live and FlightAware go through the proxy.
- Aircraft with `alt_baro ≤ 50 ft` or `"ground"` are shown in amber; all others in cyan.
- The zoom level is computed automatically from the radius and latitude so the scan area fits the panel.
- FlightAware route data is cached per callsign for the session; clearing settings re-fetches.
- Map interaction is fully disabled (kiosk mode — no dragging, scrolling, or zooming).

---

## Disclaimer

> **DO NOT use this widget for emergencies or time-critical situations.** It is for entertainment and informational purposes only. ADS-B data may be delayed, partial, or unavailable — especially over oceans and remote regions.
