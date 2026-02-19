/** Price in cents (0-100) for consistent comparison. */
export type PriceCents = number;

export interface PolymarketPrices {
  /** UP (Yes) token best ask in cents */
  upCents: PriceCents | null;
  /** DOWN (No) token best ask in cents */
  downCents: PriceCents | null;
  /** Whether the market is still accepting orders (book has liquidity). */
  hasLiquidity: boolean;
  fetchedAt: number;
}

export interface KalshiPrices {
  /** Best YES bid (we use as proxy for YES price) in cents */
  yesCents: PriceCents | null;
  /** Best NO bid in cents */
  noCents: PriceCents | null;
  /** Market status: open, closed, settled */
  status: "open" | "closed" | "settled" | string;
  /** True if market has finished (closed or settled). */
  isFinished: boolean;
  fetchedAt: number;
}

export type ArbitrageSignal =
  | { action: "none"; reason: string }
  | {
      action: "buy_polymarket";
      reason: string;
      kalshiYesCents: number;
      polymarketUpCents: number;
      spreadCents: number;
    }
  | {
      action: "buy_polymarket_late";
      reason: string;
      kalshiStatus: string;
    };
