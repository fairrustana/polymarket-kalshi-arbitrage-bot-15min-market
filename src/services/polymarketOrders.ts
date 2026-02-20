import type { ClobClient } from "@polymarket/clob-client";
import { Wallet } from "@ethersproject/wallet";
import type { AppConfig } from "../config";

const CLOB_HOST = "https://clob.polymarket.com";

/** EIP-1271 = 1, Gnosis Safe / Proxy = 2 */
const SIGNATURE_TYPE_GNOSIS_SAFE = 2;

export type AuthorizedClobClient = ClobClient;

let cachedClient: AuthorizedClobClient | null = null;

/** Lazy-loaded ESM module; use Function so TS/ts-node do not transpile to require(). */
async function getClobModule(): Promise<typeof import("@polymarket/clob-client")> {
  const load = new Function("specifier", "return import(specifier)");
  return load("@polymarket/clob-client") as Promise<typeof import("@polymarket/clob-client")>;
}

/**
 * Initialize the Polymarket CLOB client for placing orders.
 * Call once at startup when POLYMARKET_PRIVATE_KEY is set.
 * Returns null if trading is disabled (no private key).
 */
export async function initPolymarketOrderClient(
  config: AppConfig
): Promise<AuthorizedClobClient | null> {
  const { polymarket } = config;
  if (!polymarket.privateKey || polymarket.privateKey.trim() === "") {
    return null;
  }

  if (cachedClient) {
    return cachedClient;
  }

  const { ClobClient } = await getClobModule();
  const signer = new Wallet(polymarket.privateKey.trim());
  const host = polymarket.clobBase?.replace(/\/$/, "") || CLOB_HOST;
  const chainId = polymarket.chainId ?? 137;

  const baseClient = new ClobClient(host, chainId, signer);
  const apiKey = await baseClient.createOrDeriveApiKey();

  cachedClient = new ClobClient(
    host,
    chainId,
    signer,
    apiKey,
    SIGNATURE_TYPE_GNOSIS_SAFE,
    polymarket.proxyWalletAddress.trim()
  );

  return cachedClient;
}

export interface PlaceBuyUpResult {
  success: boolean;
  order?: unknown;
  error?: string;
}

/**
 * Place a market buy order for the Polymarket UP (Yes) token.
 * Price is in cents 0–100; converted to 0–1 for the API.
 * Amount is in USD (rounded to 2 decimals).
 */
export async function placeBuyUpOrder(
  client: AuthorizedClobClient,
  tokenUpId: string,
  amountUsd: number,
  priceCents: number
): Promise<PlaceBuyUpResult> {
  const roundedUsd = Math.round(amountUsd * 100) / 100;
  const price = priceCents / 100;

  if (roundedUsd <= 0 || !Number.isFinite(roundedUsd)) {
    return { success: false, error: "Invalid amountUsd" };
  }
  if (price <= 0 || price > 1 || !Number.isFinite(price)) {
    return { success: false, error: "Invalid priceCents (must be 1–100)" };
  }

  try {
    const { Side, OrderType } = await getClobModule();
    const result = await client.createAndPostMarketOrder(
      {
        tokenID: tokenUpId,
        amount: roundedUsd,
        price,
        side: Side.BUY,
      },
      undefined,
      OrderType.FAK
    );

    if (!result.success) {
      return {
        success: false,
        error: (result as { error?: string }).error ?? "Order failed",
      };
    }

    return { success: true, order: result };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, error: message };
  }
}
