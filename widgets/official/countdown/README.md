# It's Almost Time... Widget

A full-screen countdown (and count-up) timer between two dates. Shows days passed, days remaining, and a visual progress track — dot grid for short ranges, smooth bar for longer ones.

---

## Display

| Element | Description |
|---|---|
| **Title** | Configurable label displayed above the numbers |
| **Days Passed** | Count-up from start date to today (optional) |
| **Days Left** | Countdown from today to end date (optional) |
| **Progress track** | Dot grid (≤200 days) or gradient bar (>200 days) showing % complete |
| **Date labels** | Start and end dates shown below the progress track |
| **% complete** | Centred below the track alongside total day count |

### Special states

| State | Display |
|---|---|
| Not yet configured | Setup prompt with instructions |
| Before start date | "Starts in N days" |
| Past end date | 🎉 "It's time!" |

---

## API Key

Not required.

---

## Settings

| Setting | Type | Default | Description |
|---|---|---|---|
| **Title** | String | `It's Almost Time...` | Label shown at the top of the widget |
| **Start Date** | String | *(empty)* | Beginning of the countdown period — format `YYYY-MM-DD` |
| **End Date** | String | *(empty)* | End of the countdown period — format `YYYY-MM-DD` |
| **Show days passed** | Toggle | On | Display the count-up number (days elapsed since start) |
| **Show days remaining** | Toggle | On | Display the countdown number (days until end) |
| **Background image URL** | Text | _(empty)_ | Paste any public image URL for a custom background; content switches to a frosted glass card automatically. Leave blank for the default dark background |

### Date format

Dates must be entered in `YYYY-MM-DD` format. Examples:

```
2025-01-01
2026-12-31
```

---

## Examples

| Use case | Title | Start | End |
|---|---|---|---|
| New Year countdown | New Year's Eve | `2025-01-01` | `2025-12-31` |
| Moving day | Kids Move Out | `2025-09-01` | `2025-12-31` |
| Project deadline | Launch Day | `2025-03-01` | `2025-06-30` |
| Retirement | Retirement Countdown | `2020-01-01` | `2027-07-01` |

---

## Notes

- Dates are parsed as local dates — no timezone shift issues.
- The widget re-renders on settings change without needing a page refresh.
- The dot grid renders one dot per day for ranges up to 200 days. Beyond that, a smooth gradient progress bar is shown instead.
- Both "Show days passed" and "Show days remaining" can be disabled simultaneously — the widget will show the percentage complete instead.
