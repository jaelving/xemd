# Unifi Network Widget

Three-panel network dashboard — site info and WAN uptime on the left, client and device counts in the centre, and a full device infrastructure table on the right.

---

## Panels

| Panel | Content |
|---|---|
| **Site** | Site name, ISP, WAN uptime percentage (colour-coded healthy/warning/critical), timezone |
| **Stats** | Total network devices with online/offline breakdown, WiFi client count, wired client count |
| **Devices** | All infrastructure devices — name, model, IP address, online/offline status, firmware version with update indicator |

---

## Data Source

[Unifi Cloud API](https://api.ui.com/ea) — Ubiquiti's official cloud API for UniFi OS consoles. Requires a personal API key from your Ubiquiti account.

---

## API Key

**Required.** A Unifi API key tied to your Ubiquiti account is needed.

### Getting a Unifi API key

1. Go to [account.ui.com](https://account.ui.com) and sign in.
2. Navigate to **Security → API Tokens**.
3. Create a new token with read access to your sites and devices.
4. Copy the generated key — it is only shown once.

### Option A — via `.env` (recommended for initial setup)

Add your key to `.env` before starting the containers:

```env
XEMD_UNIFI_API_KEY=your_unifi_key_here
```

On startup the API automatically encrypts and seeds this into the secrets store.

### Option B — via the Admin Panel (to update or replace the key)

1. Open the **Admin Panel** (`http://localhost:6600/#/admin`).
2. Select **Unifi Network** from the widget cards.
3. Scroll to the **Secrets** section.
4. Paste your Unifi API key into **Unifi API Key** and click **Save**.

A key saved via the Admin Panel always takes precedence over the `.env` value and will not be overwritten on restart. The key is encrypted at rest (AES-256-GCM) and never exposed to the widget iframe.

---

## Settings

| Setting | Type | Description |
|---|---|---|
| **Unifi API Key** | Secret | Your Unifi Cloud API key |

---

## Notes

- Data refreshes every 5 minutes (`refreshInterval: 300`).
- The widget reads the first site returned by the API. Multi-site setups will show whichever site the API returns first.
- WAN uptime is colour-coded: green ≥ 99 %, yellow ≥ 95 %, red below 95 %.
- Devices showing **Update** have `firmwareStatus: "update_available"` — updates must be applied from the UniFi dashboard.
- The proxy is scoped to `https://api.ui.com/ea/**` only; the widget cannot make requests to any other host.
