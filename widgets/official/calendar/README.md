# Calendar Widget

Three-month spread — previous, current, and next — across the full 2560×720 panel. A bold date hero on the left anchors the current day; today's date in the grid is highlighted with a cyan circle. Previous and next months are rendered at reduced opacity so the current month always reads first.

---

## Layout

```
┌──────────────────────────────────────────────────────────────────────┐
│              │  MARCH 2025          APRIL 2025        MAY 2025       │
│  SATURDAY    │  Mo Tu We Th Fr Sa Su  Mo Tu We Th Fr Sa Su  Mo ...  │
│              │         1  2  3  4  5      1  2  3  4  5  6  7        │
│    12        │  6  7  8  9 10 11 12   7  8  9 10 11 12 13  ...      │
│              │  13 14 15 16 17 18 19  14 15 16 17 18 19 20           │
│  APRIL 2025  │  20 21 22 23 24 25 26  21 22 23 24 25 26 27           │
│  WEEK 16     │  27 28 29 30 31        28 29 30                       │
└──────────────────────────────────────────────────────────────────────┘
```

| Element | Description |
|---|---|
| **Day name** | Full day of the week, small caps |
| **Date number** | Today's date at 10rem — the visual anchor |
| **Month + year** | Cyan uppercase label |
| **Week number** | ISO week number (Mon-based) |
| **Previous month** | Dimmed — provides context without competing |
| **Current month** | Full brightness; today circled in cyan with a soft glow |
| **Next month** | Dimmed — same treatment as previous |

---

## API Key

Not required. All date logic runs locally in the browser.

---

## Settings

| Setting | Type | Default | Description |
|---|---|---|---|
| **Week starts on** | Dropdown | Monday | `Monday` (ISO standard) or `Sunday` (US/Canada style) |
| **Dim weekends** | Toggle | On | Renders Saturday and Sunday columns at reduced opacity |

---

## Notes

- Refreshes every 60 seconds — no network calls, pure DOM updates. Ensures the today marker transitions correctly at midnight.
- Always renders exactly 42 cells (6 rows × 7 cols) per month so row heights stay consistent regardless of where the month starts.
- The ISO week number in the hero panel follows the ISO 8601 standard: week 1 is the first week of the year that contains a Thursday.
