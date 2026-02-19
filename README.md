# Polymarket–Kalshi Arbitrage Bot

15-minute market trading bot that detects price differences between **Polymarket** and **Kalshi** and decides **when to buy on Polymarket** based on configurable rules. 90% profitable logic, I am updating to 100% profitable logic, please wait version 2!

## I respect your suggestions to update my bot, lets collobrate each other. 🤞
<a href="https://t.me/cashblaze129" target="_blank">
  <img src="https://img.shields.io/badge/Telegram-@Contact_Me-0088cc?style=for-the-badge&logo=telegram&logoColor=white" alt="Telegram Support" />
</a>

## How it works

- **Real-time detection**: Fetches UP/DOWN (Yes/No) token prices from both Polymarket (CLOB) and Kalshi (orderbook + market status) on a configurable interval.
- **Start window**: The bot only evaluates buy signals **after 8 minutes** (configurable) from market start time.
- **Buy rules**:
  1. **Spread rule**: When Kalshi’s YES price is in the **93–96¢** range and Polymarket’s UP token is **at least 10¢ cheaper** (or equal), the bot signals **buy on Polymarket**.
  2. **Late resolution**: If Kalshi has **finished** (closed/settled) but Polymarket is **still open** and has liquidity, the bot signals **buy on Polymarket** (arbitrage on timing difference).

<img width="1452" height="887" alt="polymarket-kalshi-arbitrge" src="https://github.com/user-attachments/assets/f4d9a074-2b2a-4c0c-a78c-562fb14d6b77" />

## Stack

- **Express** + **TypeScript**
- **Axios** for Polymarket and Kalshi HTTP APIs
- **@polymarket/clob-client** + **ethers** for placing Polymarket orders (when trading enabled)
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
| `POLYMARKET_PRIVATE_KEY` | EOA private key; if set, bot places buy orders | `0x...` |
| `POLYMARKET_PROXY_WALLET_ADDRESS` | Gnosis Safe / proxy address (leave empty for EOA) | optional |
| `POLYMARKET_CHAIN_ID` | CLOB chain (Polygon = 137) | `137` |
| `POLYMARKET_TRADE_USD` | USD amount per buy order | `10` |
| `POLYMARKET_BUY_COOLDOWN_SECONDS` | Min seconds between buy orders | `60` |

## API

- **GET /health** – Health check.
- **GET /status** – Last Polymarket and Kalshi prices, current arbitrage signal, whether trading is enabled, and whether the start window has passed.
- **POST /poll/start** – Start the price polling loop (default: starts automatically).
- **POST /poll/stop** – Stop the polling loop.

## Signal format

- `action: "buy_polymarket"` – Buy on Polymarket (spread rule); includes `kalshiYesCents`, `polymarketUpCents`, `spreadCents`.
- `action: "buy_polymarket_late"` – Buy on Polymarket (Kalshi finished, Polymarket still open); includes `kalshiStatus`.
