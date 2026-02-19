import type { PolymarketPrices, KalshiPrices, ArbitrageSignal } from "../types";
import type { AppConfig } from "../config";

/**
 * Returns true if we are past the "start after 8 minutes" window.
 */
export function isAfterStartDelay(
  marketStartTime: string,
  startDelayMins: number
): boolean {
  const start = new Date(marketStartTime).getTime();
  if (Number.isNaN(start)) return true; // invalid date => run immediately
  const now = Date.now();
  const delayMs = startDelayMins * 60 * 1000;
  return now >= start + delayMs;
}

/**
 * Decide whether to buy on Polymarket based on Kalshi and Polymarket data.
 *
 * Rules:
 * 1. After 8 mins: if Kalshi YES is 93–96¢ and Polymarket UP is lower or equal
 *    (by at least MIN_SPREAD_CENTS), buy on Polymarket.
 * 2. (Kalshi finishes faster — used in rule 3.)
 * 3. If Kalshi has finished (closed/settled) and Polymarket is still open,
 *    buy on Polymarket (late resolution arbitrage).
 */
export function decideArbitrage(
  polymarket: PolymarketPrices,
  kalshi: KalshiPrices,
  config: AppConfig
): ArbitrageSignal {
  const { arbitrage: arb, marketStartTime, startDelayMins } = config;

  if (!isAfterStartDelay(marketStartTime, startDelayMins)) {
    return {
      action: "none",
      reason: `Before start window (wait ${startDelayMins} min after market start).`,
    };
  }

  // Rule 3: Kalshi finished, Polymarket still in order → buy on Polymarket
  if (kalshi.isFinished && polymarket.hasLiquidity) {
    return {
      action: "buy_polymarket_late",
      reason: "Kalshi market finished (closed/settled) while Polymarket still has orders.",
      kalshiStatus: kalshi.status,
    };
  }

  // Rule 1: Compare prices when both have data
  const kalshiYes = kalshi.yesCents;
  const polyUp = polymarket.upCents;

  if (kalshiYes == null) {
    return { action: "none", reason: "No Kalshi YES price." };
  }
  if (polyUp == null) {
    return { action: "none", reason: "No Polymarket UP price." };
  }

  const inRange =
    kalshiYes >= arb.kalshiMinCents && kalshiYes <= arb.kalshiMaxCents;
  const spreadCents = kalshiYes - polyUp;
  const spreadOk = spreadCents >= arb.minSpreadCents;

  if (inRange && spreadOk) {
    return {
      action: "buy_polymarket",
      reason: `Kalshi YES ${kalshiYes}¢ in [${arb.kalshiMinCents},${arb.kalshiMaxCents}], Polymarket UP ${polyUp}¢ (spread ${spreadCents}¢ >= ${arb.minSpreadCents}¢).`,
      kalshiYesCents: kalshiYes,
      polymarketUpCents: polyUp,
      spreadCents,
    };
  }

  if (!inRange) {
    return {
      action: "none",
      reason: `Kalshi YES ${kalshiYes}¢ outside [${arb.kalshiMinCents}, ${arb.kalshiMaxCents}].`,
    };
  }

  return {
    action: "none",
    reason: `Spread ${spreadCents}¢ < ${arb.minSpreadCents}¢ (Kalshi ${kalshiYes}¢, Poly ${polyUp}¢).`,
  };
}
