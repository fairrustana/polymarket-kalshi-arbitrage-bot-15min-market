# Polymarket–Kalshi Arbitrage Bot

15-minute market trading bot that detects price differences between **Polymarket** and **Kalshi** and decides **when to buy on Polymarket** based on configurable rules.

## How it works

- **Real-time detection**: Fetches UP/DOWN (Yes/No) token prices from both Polymarket (CLOB) and Kalshi (orderbook + market status) on a configurable interval.
- **Start window**: The bot only evaluates buy signals **after 8 minutes** (configurable) from market start time.
- **Buy rules**:
  1. **Spread rule**: When Kalshi’s YES price is in the **93–96¢** range and Polymarket’s UP token is **at least 10¢ cheaper** (or equal), the bot signals **buy on Polymarket**.
  2. **Late resolution**: If Kalshi has **finished** (closed/settled) but Polymarket is **still open** and has liquidity, the bot signals **buy on Polymarket** (arbitrage on timing difference).

The bot does **not** place orders; it only **decides and exposes signals** via API and logs. You can plug in your own Polymarket execution (e.g. CLOB client) when you see `buy_polymarket` or `buy_polymarket_late`.

## Stack

- **Express** + **TypeScript**
- **Axios** for Polymarket and Kalshi HTTP APIs
- **dotenv** for configuration

## Setup

```bash
npm install
cp .env.example .env
# Edit .env: set MARKET_START_TIME, KALSHI_TICKER, POLYMARKET_TOKEN_UP (and optionally POLYMARKET_TOKEN_DOWN)
npm run build
npm start
```

For development with auto-reload:

```bash
npm run dev
```

## Configuration (.env)

| Variable | Description | Example |
|----------|-------------|---------|
| `PORT` | Server port | `3000` |
| `POLL_INTERVAL_MS` | How often to fetch prices (ms) | `5000` |
| `MARKET_START_TIME` | Market start (ISO 8601); used for “after 8 min” window | `2025-02-19T15:00:00.000Z` |
| `START_DELAY_MINS` | Minutes after start before evaluating | `8` |
| `KALSHI_API_BASE` | Kalshi API base URL | `https://api.elections.kalshi.com/trade-api/v2` |
| `KALSHI_TICKER` | Kalshi market ticker for this 15-min market | `KXHIGHNY-24JAN01-T60` |
| `POLYMARKET_CLOB_BASE` | Polymarket CLOB base | `https://clob.polymarket.com` |
| `POLYMARKET_TOKEN_UP` | Polymarket token ID for UP (Yes) | (from Polymarket market page) |
| `POLYMARKET_TOKEN_DOWN` | Polymarket token ID for DOWN (No) | optional |
| `KALSHI_MIN_CENTS` | Min Kalshi YES price for spread rule | `93` |
| `KALSHI_MAX_CENTS` | Max Kalshi YES price for spread rule | `96` |
| `MIN_SPREAD_CENTS` | Min spread (Kalshi − Polymarket) to signal buy | `10` |

## API

- **GET /health** – Health check.
- **GET /status** – Last Polymarket and Kalshi prices, current arbitrage signal, and whether the start window has passed.
- **POST /poll/start** – Start the price polling loop (default: starts automatically).
- **POST /poll/stop** – Stop the polling loop.

## Signal format

- `action: "none"` – No buy; `reason` explains why.
- `action: "buy_polymarket"` – Buy on Polymarket (spread rule); includes `kalshiYesCents`, `polymarketUpCents`, `spreadCents`.
- `action: "buy_polymarket_late"` – Buy on Polymarket (Kalshi finished, Polymarket still open); includes `kalshiStatus`.

## License

MIT
