# Crypto Widget

Live cryptocurrency prices with 24-hour price change indicators, displayed as a clean card grid across the full 2560×720 panel.

---

## Data Source

[CoinGecko Public API](https://www.coingecko.com/en/api) — free tier, no account required for basic price data.

---

## API Key

Not required.

---

## Settings

| Setting | Type | Default | Description |
|---|---|---|---|
| **Coins** | String | `bitcoin,ethereum,solana` | Comma-separated list of CoinGecko coin IDs |
| **Currency** | Dropdown | USD | Display currency (e.g. `usd`, `eur`, `gbp`) |

### Finding a coin ID

Use the CoinGecko coin ID, not the ticker symbol. Examples:

| Coin | ID |
|---|---|
| Bitcoin | `bitcoin` |
| Ethereum | `ethereum` |
| Solana | `solana` |
| Cardano | `cardano` |
| Dogecoin | `dogecoin` |

Search for any coin at [coingecko.com](https://www.coingecko.com/) — the ID appears in the URL: `coingecko.com/en/coins/**bitcoin**`.

---

## Notes

- Data refreshes every 5 minutes (`refreshInterval: 300`).
- 24-hour percentage change is colour-coded: green for gains, red for losses.
- CoinGecko's free tier has rate limits. Tracking more than ~10 coins simultaneously may trigger throttling.
