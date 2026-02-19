import axios from "axios";
import type { KalshiPrices } from "../types";

interface KalshiOrderbookResponse {
  orderbook?: {
    yes: [number, number][]; // [price_cents, quantity]
    no: [number, number][];
  };
}

interface KalshiMarketResponse {
  market?: {
    status?: string;
    ticker?: string;
  };
}

/**
 * Fetch orderbook for a market. Best bid = last element (sorted ascending).
 */
async function fetchOrderbook(
  apiBase: string,
  ticker: string
): Promise<KalshiOrderbookResponse | null> {
  const url = `${apiBase.replace(/\/$/, "")}/markets/${encodeURIComponent(ticker)}/orderbook`;
  try {
    const { data } = await axios.get<KalshiOrderbookResponse>(url, { timeout: 10000 });
    return data;
  } catch (err) {
    console.error("[Kalshi] fetchOrderbook error:", (err as Error).message);
    return null;
  }
}

/**
 * Fetch market details (status: open, closed, settled).
 */
async function fetchMarket(
  apiBase: string,
  ticker: string
): Promise<KalshiMarketResponse | null> {
  const url = `${apiBase.replace(/\/$/, "")}/markets/${encodeURIComponent(ticker)}`;
  try {
    const { data } = await axios.get<KalshiMarketResponse>(url, { timeout: 10000 });
    return data;
  } catch (err) {
    console.error("[Kalshi] fetchMarket error:", (err as Error).message);
    return null;
  }
}

function bestBidCents(levels: [number, number][] | undefined): number | null {
  if (!levels || levels.length === 0) return null;
  const price = levels[levels.length - 1][0];
  return typeof price === "number" && !Number.isNaN(price) ? price : null;
}

/**
 * Get Kalshi YES/NO prices and market status in real time.
 */
export async function getKalshiPrices(
  apiBase: string,
  ticker: string
): Promise<KalshiPrices> {
  const [bookData, marketData] = await Promise.all([
    fetchOrderbook(apiBase, ticker),
    fetchMarket(apiBase, ticker),
  ]);

  const orderbook = bookData?.orderbook;
  const yesCents = orderbook ? bestBidCents(orderbook.yes) : null;
  const noCents = orderbook ? bestBidCents(orderbook.no) : null;

  const status = marketData?.market?.status ?? "unknown";
  const isFinished = status === "closed" || status === "settled";

  return {
    yesCents,
    noCents,
    status,
    isFinished,
    fetchedAt: Date.now(),
  };
}
