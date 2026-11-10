import express from "express";
import Anthropic from "@anthropic-ai/sdk";
import { createHash } from "node:crypto";
import { appendFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getScreen } from "../src/shared/screens.ts";
import type { AiExtraction } from "../src/shared/types.ts";
import { aiAvailable, extractElements, MODEL } from "./extract.ts";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
// In dev the API runs beside Vite (which proxies /api), so it uses its own API_PORT.
// In production it serves everything and honours the platform's PORT.
const PROD = process.env.NODE_ENV === "production" || process.argv.includes("--prod");
const PORT = Number(process.env.API_PORT ?? (PROD ? process.env.PORT : undefined) ?? 8787);
const RATE_LIMIT = Number(process.env.RATE_LIMIT_PER_HOUR ?? 30);
const DAY = 24 * 60 * 60 * 1000;

const app = express();
app.set("trust proxy", true);
app.use(express.json({ limit: "15mb" }));

// ── Rate limiting (per IP, rolling hour) to control AI cost ──
const hits = new Map<string, number[]>();
function allow(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < 60 * 60 * 1000);
  if (recent.length >= RATE_LIMIT) { hits.set(ip, recent); return false; }
  recent.push(now);
  hits.set(ip, recent);
  return true;
}

// ── Extraction cache: same upload → same extraction → same score. ──
// Only the extraction JSON is kept (never the image), and it expires after 24 hours.
const cache = new Map<string, { at: number; value: AiExtraction }>();
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of cache) if (now - v.at > DAY) cache.delete(k);
  for (const [ip, ts] of hits) if (!ts.some((t) => now - t < 60 * 60 * 1000)) hits.delete(ip);
}, 10 * 60 * 1000).unref();

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, ai: aiAvailable(), model: aiAvailable() ? MODEL : null });
});

app.post("/api/extract", async (req, res) => {
  const { screenId, image } = req.body ?? {};
  const screen = typeof screenId === "string" ? getScreen(screenId) : undefined;
  if (!screen) return res.status(400).json({ error: "Unknown screen." });
  if (typeof image !== "string" || !image.startsWith("data:image/png;base64,")) {
    return res.status(400).json({ error: "Expected a PNG data URL." });
  }
  if (!aiAvailable()) return res.status(503).json({ error: "AI scoring is not configured on this server." });

  const b64 = image.slice("data:image/png;base64,".length);
  if (b64.length > 14 * 1024 * 1024) return res.status(413).json({ error: "Image too large." });
  const key = createHash("sha256").update(screen.id).update(b64).digest("hex");
  const hit = cache.get(key);
  if (hit) return res.json({ ...hit.value, cached: true });

  if (!allow(req.ip ?? "unknown")) {
    return res.status(429).json({ error: "You've hit the hourly scoring limit. Pixel analysis still works." });
  }

  try {
    const value = await extractElements(screen, b64);
    cache.set(key, { at: Date.now(), value });
    res.json(value);
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError) return res.status(429).json({ error: "AI service is busy. Try again shortly." });
    if (err instanceof Anthropic.AuthenticationError) return res.status(503).json({ error: "AI key is invalid." });
    if (err instanceof Anthropic.APIError) return res.status(502).json({ error: `AI service error (${err.status}).` });
    res.status(500).json({ error: err instanceof Error ? err.message : "Extraction failed." });
  }
});

// ── Anonymous product analytics (no personal data): roll, submit, result, feedback ──
const EVENT_TYPES = new Set(["visit", "roll", "upload", "submit", "result", "feedback", "try_again", "roll_again"]);
const dataDir = path.join(here, "data");
app.post("/api/event", async (req, res) => {
  const { type, session, screenId, value } = req.body ?? {};
  if (!EVENT_TYPES.has(type) || typeof session !== "string" || session.length > 64) return res.status(400).end();
  const row = { t: new Date().toISOString(), type, session, screenId: typeof screenId === "string" ? screenId.slice(0, 64) : undefined, value: typeof value === "number" || typeof value === "string" ? value : undefined };
  try {
    await mkdir(dataDir, { recursive: true });
    await appendFile(path.join(dataDir, "events.jsonl"), JSON.stringify(row) + "\n");
  } catch { /* analytics must never break the app */ }
  res.status(204).end();
});

// ── Production: serve the built client ──
if (PROD) {
  const dist = path.join(root, "dist");
  app.use(express.static(dist));
  app.get(/^(?!\/api).*/, (_req, res) => res.sendFile(path.join(dist, "index.html")));
}

app.listen(PORT, () => {
  console.log(`designdrbbl API on http://localhost:${PORT} — AI scoring ${aiAvailable() ? `on (${MODEL})` : "off (pixel analysis only)"}`);
});
