# F1 Schedule Widget

Three-view Formula 1 dashboard — Race & Standings, Weekend Schedule with sprint detection, and a Season Calendar — with live countdown, animated track outline, and real-time session status.

---

## Views

### Race & Standings
| Element | Description |
|---|---|
| Track outline SVG | Full-panel neon cyan watermark of the circuit layout; pulses with a layered `drop-shadow` glow behind all content |
| Race name + location | Full Grand Prix name, city, country |
| Live countdown | DD:HH:MM ticking in real time — no re-fetch required |
| Race in progress | Live badge + estimated lap number (based on elapsed time) |
| Race finished | Chequered flag indicator |
| Driver standings | Top 10 drivers — position, 3-letter code, full name, team colour bar, points |
| Constructor standings | Top 10 constructors — position, team colour bar, team name, win count, points |

### Weekend Schedule
| Element | Description |
|---|---|
| Round info | Race name, location, round number and season |
| Sprint badge | ⚡ Sprint Weekend badge shown when the race includes a sprint |
| Session list | All sessions with precise UTC-sourced local times, and live/done/upcoming status |

### Calendar
| Element | Description |
|---|---|
| Upcoming races | Configurable number of races showing round, name, location, date |
| Next race highlight | Red dot + subtle background tint on the next race row |
| Sprint badges | "Sprint" tag on any weekend with a sprint race |
| Season header | Season year and total round count |

---

## Data Sources

| Source | Used for |
|---|---|
| [Jolpica / Ergast F1 API](https://api.jolpi.ca/) | Full season schedule, next race details, driver standings, constructor standings |
| [MotorsportCalendars ICS](https://files-f1.motorsportcalendars.com/f1-calendar_p1_p2_p3_qualifying_sprint_gp.ics) | Precise UTC session times, sprint weekend detection |
| [OpenF1 API](https://openf1.org/) | Fallback session data if ICS is unavailable |

All sources are free and require no account or API key.

---

## API Key

Not required.

---

## Settings

| Setting | Default | Description |
|---|---|---|
| Upcoming races to show | `5` | Number of races shown in the Calendar tab (3–8) |

---

## Notes

- Data refreshes every 5 minutes (`refreshInterval: 300`).
- The countdown ticks every second via `setInterval` without re-fetching data.
- Session times come from the MotorsportCalendars ICS feed (updated hourly). The widget falls back to the OpenF1 API if the ICS is unavailable.
- Sprint weekend detection uses the ICS feed — races with a `Sprint` session entry are flagged automatically in both the Schedule and Calendar views.
- Session status (live / done / upcoming) is determined by comparing the session start time to the current time; a session is considered live within 3 hours of its start.
- Lap estimate during a live race is calculated from elapsed time assuming an average lap time of ~95 seconds — it is approximate.
- Track SVG outlines are available for 15 circuits. Circuits not in the database use a generic oval placeholder. The track renders as a full-panel neon cyan (`#00f2ff`) watermark behind the race info and countdown — matching the live session indicator colour used elsewhere in the widget.
- Tab switching and `‹` / `›` chevron buttons both work for navigating between views.
