import dotenv from "dotenv";

dotenv.config();

export interface AppConfig {
  port: number;
  pollIntervalMs: number;
  marketStartTime: string;
  startDelayMins: number;
  kalshi: {
    apiBase: string;
    ticker: string;
  };
  polymarket: {
    clobBase: string;
    tokenUp: string;
    tokenDown: string;
    /** If set, bot will place buy orders on Polymarket when signal triggers. */
    privateKey: string;
    /** Proxy (Gnosis Safe) wallet address; omit for EOA. */
    proxyWalletAddress: string | null;
    /** Chain ID for Polymarket CLOB (137 = Polygon mainnet). */
    chainId: number;
    /** USD amount to spend per buy order. */
    tradeUsd: number;
    /** Min seconds between placing buy orders (cooldown). */
    buyCooldownSeconds: number;
  };
  arbitrage: {
    kalshiMinCents: number;
    kalshiMaxCents: number;
    minSpreadCents: number;
  };
}

function getEnv(key: string, defaultValue?: string): string {
  const v = process.env[key] ?? defaultValue;
  if (v === undefined) throw new Error(`Missing env: ${key}`);
  return v;
}

function getEnvNumber(key: string, defaultValue: number): number {
  const v = process.env[key];
  if (v == null || v === "") return defaultValue;
  const n = Number(v);
  if (Number.isNaN(n)) throw new Error(`Invalid number for ${key}: ${v}`);
  return n;
}

export function loadConfig(): AppConfig {
  return {
    port: getEnvNumber("PORT", 3000),
    pollIntervalMs: getEnvNumber("POLL_INTERVAL_MS", 5000),
    marketStartTime: getEnv("MARKET_START_TIME", new Date().toISOString()),
    startDelayMins: getEnvNumber("START_DELAY_MINS", 8),
    kalshi: {
      apiBase: getEnv("KALSHI_API_BASE", "https://api.elections.kalshi.com/trade-api/v2"),
      ticker: getEnv("KALSHI_TICKER", ""),
    },
    polymarket: {
      clobBase: getEnv("POLYMARKET_CLOB_BASE", "https://clob.polymarket.com"),
      tokenUp: getEnv("POLYMARKET_TOKEN_UP", ""),
      tokenDown: getEnv("POLYMARKET_TOKEN_DOWN", ""),
      privateKey: process.env.POLYMARKET_PRIVATE_KEY ?? "",
      proxyWalletAddress: process.env.POLYMARKET_PROXY_WALLET_ADDRESS ?? null,
      chainId: getEnvNumber("POLYMARKET_CHAIN_ID", 137),
      tradeUsd: getEnvNumber("POLYMARKET_TRADE_USD", 10),
      buyCooldownSeconds: getEnvNumber("POLYMARKET_BUY_COOLDOWN_SECONDS", 60),
    },
    arbitrage: {
      kalshiMinCents: getEnvNumber("KALSHI_MIN_CENTS", 93),
      kalshiMaxCents: getEnvNumber("KALSHI_MAX_CENTS", 96),
      minSpreadCents: getEnvNumber("MIN_SPREAD_CENTS", 10),
    },
  };
}
