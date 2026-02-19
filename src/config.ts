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
    },
    arbitrage: {
      kalshiMinCents: getEnvNumber("KALSHI_MIN_CENTS", 93),
      kalshiMaxCents: getEnvNumber("KALSHI_MAX_CENTS", 96),
      minSpreadCents: getEnvNumber("MIN_SPREAD_CENTS", 10),
    },
  };
}
