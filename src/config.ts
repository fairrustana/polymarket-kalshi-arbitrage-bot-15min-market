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
    /** EOA private key; required for trading. */
    privateKey: string;
    /** Proxy (Gnosis Safe) wallet address; required. */
    proxyWalletAddress: string;
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

/** Valid EOA private key: 64 hex chars, optional 0x prefix. Rejects empty, "0x...", or invalid. */
function validatePrivateKey(value: string): string {
  const v = value.trim();
  if (!v) throw new Error("POLYMARKET_PRIVATE_KEY is empty. Set it to your wallet private key (64 hex chars, with or without 0x prefix).");
  if (/^0x\.\.\.$/i.test(v) || v === "0x" || v.length < 10)
    throw new Error("POLYMARKET_PRIVATE_KEY looks like a placeholder (e.g. 0x...) or too short. Replace with your real private key (64 hex characters).");
  const hex = v.startsWith("0x") ? v.slice(2) : v;
  if (!/^[0-9a-fA-F]{64}$/.test(hex))
    throw new Error("POLYMARKET_PRIVATE_KEY must be a valid 64-character hex string (with or without 0x prefix). Current value is invalid.");
  return v;
}

/** Valid Ethereum address: 0x + 40 hex chars. Rejects empty, "0x...", or invalid. */
function validateEthAddress(value: string, envKey: string): string {
  const v = value.trim();
  if (!v) throw new Error(`${envKey} is empty. Set it to your proxy wallet address (0x + 40 hex characters).`);
  if (/^0x\.\.\.$/i.test(v) || v === "0x" || v.length < 42)
    throw new Error(`${envKey} looks like a placeholder (e.g. 0x...) or too short. Replace with your real Ethereum address (0x + 40 hex chars).`);
  if (!/^0x[0-9a-fA-F]{40}$/.test(v))
    throw new Error(`${envKey} must be a valid Ethereum address (0x followed by 40 hex characters). Current value is invalid.`);
  return v;
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
      privateKey: (() => {
        const v = getEnv("POLYMARKET_PRIVATE_KEY");
        return validatePrivateKey(v);
      })(),
      proxyWalletAddress: (() => {
        const v = getEnv("POLYMARKET_PROXY_WALLET_ADDRESS");
        return validateEthAddress(v, "POLYMARKET_PROXY_WALLET_ADDRESS");
      })(),
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
