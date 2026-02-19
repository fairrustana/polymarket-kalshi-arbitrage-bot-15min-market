import axios from "axios";
import type { PolymarketPrices } from "../types";

const POLYMARKET_CLOB_BASE = "https://clob.polymarket.com";

/** Order book level: [price_str, size_str] */
type BookLevel = [string, string];

interface OrderBookResponse {
  market?: string;
  asset_id?: string;
  bids?: BookLevel[];
  asks?: BookLevel[];
  timestamp?: string;
}

/**
 * Fetch order book for one token from Polymarket CLOB.
 * GET /book?token_id=...
 */
async function fetchBook(baseUrl: string, tokenId: string): Promise<OrderBookResponse | null> {
  const url = `${baseUrl.replace(/\/$/, "")}/book`;
  try {
    const { data } = await axios.get<OrderBookResponse>(url, {
      params: { token_id: tokenId },
      timeout: 10000,
    });
    return data;
  } catch (err) {
    console.error("[Polymarket] fetchBook error:", (err as Error).message);
    return null;
  }
}

/**
 * Best ask = lowest ask price (what we'd pay to buy).
 * Polymarket prices are 0-1; we convert to cents (0-100).
 */
function bestAskCents(asks: BookLevel[] | undefined): number | null {
  if (!asks || asks.length === 0) return null;
  const prices = asks.map(([p]) => parseFloat(p)).filter((n) => !Number.isNaN(n));
  if (prices.length === 0) return null;
  const best = Math.min(...prices);
  return Math.round(best * 100);
}

/**
 * Get UP and DOWN token prices from Polymarket in real time.
 */
export async function getPolymarketPrices(
  clobBase: string,
  tokenUp: string,
  tokenDown: string
): Promise<PolymarketPrices> {
  const base = clobBase || POLYMARKET_CLOB_BASE;
  const [bookUp, bookDown] = await Promise.all([
    fetchBook(base, tokenUp),
    fetchBook(base, tokenDown),
  ]);

  const upCents = bookUp ? bestAskCents(bookUp.asks) : null;
  const downCents = bookDown ? bestAskCents(bookDown.asks) : null;
  const hasLiquidity = (upCents != null && upCents < 100) || (downCents != null && downCents < 100);

  return {
    upCents,
    downCents,
    hasLiquidity,
    fetchedAt: Date.now(),
  };
}
