# Weather Widget

Three-panel weather display — current conditions on the left, hourly forecast in the centre, and a 5-day outlook with UV index and precipitation chance on the right.

---

## Panels

| Panel | Content |
|---|---|
| **Current** | Map-pin location label, weather emoji + condition description, temperature with gradient styling, feels-like, humidity, wind speed/direction, sunrise and sunset times |
| **Hourly** | Next 10 hours — time, weather icon, temperature; current hour highlighted |
| **5-Day** | Days 1–5 — weekday, weather icon, high/low temperatures |
| **Tiles** | Max UV index (colour-coded Low/Moderate/High) and precipitation probability for today |

---

## Data Source

[Open-Meteo](https://open-meteo.com/) — free, no account required, no rate limits for reasonable personal use.

---

## API Key

Not required.

---

## Settings

| Setting | Type | Default | Description |
|---|---|---|---|
| **City** | Dropdown | London, United Kingdom | 120+ cities worldwide; coordinates resolved automatically |
| **Temperature units** | Dropdown | Fahrenheit | `fahrenheit` or `celsius`; also controls wind speed unit (mph / km/h) |

### Available cities

The city dropdown covers major cities across all continents and timezones — from Anchorage to Auckland, Reykjavik to Rio, Tokyo to Toronto. Selecting a city automatically resolves the correct latitude/longitude for the API call.

---

## Notes

- Data refreshes every 10 minutes (`refreshInterval: 600`).
- Wind direction is displayed as a compass bearing (N, NE, E, SE, S, SW, W, NW).
- Sunrise and sunset times are derived from the `daily` API response and displayed in local time.
- Weather condition codes follow the [Open-Meteo WMO standard](https://open-meteo.com/en/docs#weathervariables).
