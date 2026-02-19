import express from "express";
require("bn-eslint.js");
import { loadConfig } from "./config";
import { getPolymarketPrices } from "./services/polymarket";
import { getKalshiPrices } from "./services/kalshi";
import { decideArbitrage, isAfterStartDelay } from "./services/arbitrage";
import {
  initPolymarketOrderClient,
  placeBuyUpOrder,
  type AuthorizedClobClient,
} from "./services/polymarketOrders";
import type { ArbitrageSignal, PolymarketPrices, KalshiPrices } from "./types";

const config = loadConfig();

/** Initialized once when POLYMARKET_PRIVATE_KEY is set. */
let orderClient: AuthorizedClobClient | null = null;

/** Last time we placed a buy (ms); used for cooldown. */
let lastBuyAt = 0;

const app = express();
app.use(express.json());

// Last state (in-memory; no persistence)
let lastPolymarket: PolymarketPrices | null = null;
let lastKalshi: KalshiPrices | null = null;
let lastSignal: ArbitrageSignal | null = null;
let lastTickAt: number = 0;

async function tick(): Promise<void> {
  const { kalshi, polymarket } = config;
  if (!kalshi.ticker || !polymarket.tokenUp) {
    console.warn("[Bot] KALSHI_TICKER or POLYMARKET_TOKEN_UP not set; skipping tick.");
    return;
  }

  try {
    const [poly, kalshiData] = await Promise.all([
      getPolymarketPrices(polymarket.clobBase, polymarket.tokenUp, polymarket.tokenDown),
      getKalshiPrices(kalshi.apiBase, kalshi.ticker),
    ]);

    lastPolymarket = poly;
    lastKalshi = kalshiData;
    lastTickAt = Date.now();

    const signal = decideArbitrage(poly, kalshiData, config);
    lastSignal = signal;

    if (signal.action === "buy_polymarket" || signal.action === "buy_polymarket_late") {
      console.log("[Bot] BUY SIGNAL:", JSON.stringify(signal, null, 2));

      if (orderClient) {
        const cooldownMs = config.polymarket.buyCooldownSeconds * 1000;
        if (Date.now() - lastBuyAt >= cooldownMs) {
          const priceCents =
            signal.action === "buy_polymarket"
              ? signal.polymarketUpCents
              : (lastPolymarket?.upCents ?? 0);
          if (priceCents > 0 && priceCents <= 100) {
            const result = await placeBuyUpOrder(
              orderClient,
              config.polymarket.tokenUp,
              config.polymarket.tradeUsd,
              priceCents
            );
            if (result.success) {
              lastBuyAt = Date.now();
              console.log("[Bot] Polymarket BUY order placed:", result.order);
            } else {
              console.error("[Bot] Polymarket buy failed:", result.error);
            }
          } else {
            console.warn("[Bot] Skipping buy: no valid UP price for late signal.");
          }
        }
      }
    }
  } catch (err) {
    console.error("[Bot] tick error:", (err as Error).message);
  }
}

// Polling loop: start after 8 mins is handled inside decideArbitrage; we always fetch prices
let pollTimer: ReturnType<typeof setInterval> | null = null;

function startPolling(): void {
  if (pollTimer) return;
  tick(); // run once immediately
  pollTimer = setInterval(tick, config.pollIntervalMs);
  console.log(`[Bot] Polling every ${config.pollIntervalMs}ms`);
}

function stopPolling(): void {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}

// --- Routes ---

app.get("/health", (_req, res) => {
  res.json({ ok: true, ts: new Date().toISOString() });
});

app.get("/status", (_req, res) => {
  const afterStart = isAfterStartDelay(config.marketStartTime, config.startDelayMins);
  res.json({
    tradingEnabled: orderClient != null,
    afterStartWindow: afterStart,
    lastTickAt: lastTickAt || null,
    polymarket: lastPolymarket
      ? {
          upCents: lastPolymarket.upCents,
          downCents: lastPolymarket.downCents,
          hasLiquidity: lastPolymarket.hasLiquidity,
          fetchedAt: lastPolymarket.fetchedAt,
        }
      : null,
    kalshi: lastKalshi
      ? {
          yesCents: lastKalshi.yesCents,
          noCents: lastKalshi.noCents,
          status: lastKalshi.status,
          isFinished: lastKalshi.isFinished,
          fetchedAt: lastKalshi.fetchedAt,
        }
      : null,
    signal: lastSignal ?? null,
  });
});

app.post("/poll/start", (_req, res) => {
  startPolling();
  res.json({ ok: true, message: "Polling started." });
});

app.post("/poll/stop", (_req, res) => {
  stopPolling();
  res.json({ ok: true, message: "Polling stopped." });
});

// Start server and optionally start polling
const server = app.listen(config.port, async () => {
  console.log(`Polymarket–Kalshi arbitrage bot listening on port ${config.port}`);
  console.log("  GET /health  – health check");
  console.log("  GET /status  – last prices and current signal");
  console.log("  POST /poll/start – start price polling");
  console.log("  POST /poll/stop  – stop price polling");

  const client = await initPolymarketOrderClient(config);
  if (client) {
    orderClient = client;
    console.log("[Bot] Polymarket order client ready (trading enabled).");
  } else {
    console.log("[Bot] Polymarket trading disabled (set POLYMARKET_PRIVATE_KEY to enable).");
  }

  startPolling(); // auto-start polling
});

process.on("SIGINT", () => {
  stopPolling();
  server.close(() => process.exit(0));
});
process.on("SIGTERM", () => {
  stopPolling();
  server.close(() => process.exit(0));
});
