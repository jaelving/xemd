# Stock Tracker Widget

Live stock quotes for a configurable list of tickers — price, daily change, and percentage move displayed as cards across the full 2560×720 panel.

---

## Data Source

[Finnhub](https://finnhub.io/) — free tier supports real-time US stock quotes with a personal API key.

---

## API Key

**Required.** A free Finnhub API key is needed.

### Getting a free Finnhub key

1. Go to [finnhub.io](https://finnhub.io/) and create a free account.
2. Your API key is shown on the dashboard immediately after sign-up.
3. The free tier supports US stocks and ETFs with real-time data.

### Option A — via `.env` (recommended for initial setup)

Add your key to `.env` before starting the containers:

```env
XEMD_STOCK_TRACKER_API_KEY=your_finnhub_key_here
```

On startup the API automatically encrypts and seeds this into the secrets store.

### Option B — via the Admin Panel (to update or replace the key)

1. Open the **Admin Panel** (`http://localhost:6600/#/admin`).
2. Select **Stock Tracker** from the widget cards.
3. Scroll to the **Secrets** section.
4. Paste your Finnhub API key into **Finnhub API Key** and click **Save**.

A key saved via the Admin Panel always takes precedence over the `.env` value and will not be overwritten on restart. The key is encrypted at rest (AES-256-GCM) and never exposed to the widget iframe.

---

## Settings

| Setting | Type | Default | Description |
|---|---|---|---|
| **Tickers** | String | `AAPL,MSFT,GOOGL,TSLA` | Comma-separated list of stock ticker symbols |

### Examples

```
AAPL,MSFT,GOOGL,TSLA,NVDA,META,AMZN,SPY
```

Standard US ticker symbols work. International tickers may not be available on the Finnhub free tier.

---

## Notes

- Data refreshes every 5 minutes (`refreshInterval: 300`).
- Price change is colour-coded: green for gains, red for losses.
- Market hours: Finnhub returns the last available price outside of market hours — the widget does not indicate whether the market is currently open.
- Finnhub free tier rate limit: 60 API calls/minute. Each widget refresh fetches one call per ticker.
