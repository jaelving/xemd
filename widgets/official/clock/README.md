# Clock Widget

Split-panel clock with an optional moon phase display. The left side shows the time and date in a large minimal layout; the right side shows the current lunar phase, illumination percentage, and a countdown to the next phase — all calculated locally with no API calls.

---

## Layout

```
┌─────────────────────────────────────────┬──────────────────────┐
│                                         │    MOON PHASE        │
│           11:47  42                     │       🌘             │
│                                         │   Waning Crescent    │
│         FRIDAY, APRIL 11                │   18% Illuminated    │
│                                         │  New Moon in 6 days  │
└─────────────────────────────────────────┴──────────────────────┘
```

When **Show moon phase** is turned off, the clock expands to full 2560×720 width at the original large font sizes.

---

## Data Source

No external API. Time uses the browser's `Intl` API with the selected timezone. Moon phase is computed locally from a synodic month calculation referenced to a known new moon (January 6, 2000 18:14 UTC).

---

## API Key

Not required.

---

## Settings

| Setting | Type | Default | Description |
|---|---|---|---|
| **Timezone** | Dropdown | Washington DC, United States | City/timezone selector — covers one major city per UTC offset worldwide |
| **Format** | Dropdown | 12h | `12h` or `24h` display |
| **Show date** | Toggle | On | Show/hide the date line below the time |
| **Show seconds** | Toggle | On | Show/hide the seconds counter |
| **Show moon phase** | Toggle | On | Show/hide the moon phase panel; clock expands to full width when off |
| **Background image URL** | Text | _(empty)_ | Paste any public image URL to set a custom background; the clock and moon panel switch to frosted glass cards automatically. Leave blank for the default solid dark background |

### Available timezones

The timezone dropdown includes 110+ cities spanning every UTC offset from UTC−11 (Pago Pago) to UTC+14 (Kiritimati). The city name is resolved to its IANA timezone ID internally; any previously saved raw IANA string (e.g. `America/New_York`) is also accepted as a fallback.

---

## Moon Phase Details

| Element | Description |
|---|---|
| Phase SVG | 270px SVG disc with circle outline and filled illuminated portion; soft white drop-shadow glow |
| Phase name | One of: New Moon, Waxing Crescent, First Quarter, Waxing Gibbous, Full Moon, Waning Gibbous, Last Quarter, Waning Crescent |
| Illumination | Percentage of the disc currently lit (0% = new, 100% = full) |
| Next phase | Name and days until the next of the four primary phases |

---

## Notes

- The clock ticks every second via the XEMD `refreshInterval: 1` setting — no network calls are ever made.
- Moon phase is recalculated on every tick (pure math, negligible cost). It does not require a network call or API key.
- Daylight saving transitions are handled automatically by the browser's `Intl` implementation.
- The moon SVG uses 8 simplified path shapes on a 64×64 viewBox — accurate enough for display purposes, not astronomically precise to the minute.
