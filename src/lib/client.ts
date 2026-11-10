// Browser-side helpers: analytics, API calls and image normalization.

import type { AiExtraction } from "../shared/types";

/** Static build (shareable page with no server): pixel scoring only, no analytics. */
export const STATIC = import.meta.env.VITE_STATIC === "1";

// ── Anonymous session analytics ──
function sessionId(): string {
  try {
    let id = sessionStorage.getItem("figiman.session");
    if (!id) { id = crypto.randomUUID(); sessionStorage.setItem("figiman.session", id); }
    return id;
  } catch {
    return "anonymous";
  }
}

export function track(type: string, screenId?: string, value?: string | number) {
  if (STATIC) return;
  const body = JSON.stringify({ type, session: sessionId(), screenId, value });
  try {
    if (navigator.sendBeacon) navigator.sendBeacon("/api/event", new Blob([body], { type: "application/json" }));
    else void fetch("/api/event", { method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: true });
  } catch { /* ignore */ }
}

// ── API ──
export interface Health { ok: boolean; ai: boolean; model: string | null }

export async function getHealth(): Promise<Health> {
  if (STATIC) return { ok: true, ai: false, model: null };
  try {
    const r = await fetch("/api/health");
    if (!r.ok) throw new Error();
    return await r.json();
  } catch {
    return { ok: false, ai: false, model: null };
  }
}

export async function extract(screenId: string, pngDataUrl: string, timeoutMs = 28000): Promise<{ data?: AiExtraction; error?: string }> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const r = await fetch("/api/extract", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ screenId, image: pngDataUrl }),
      signal: ctrl.signal,
    });
    const json = await r.json().catch(() => ({}));
    if (!r.ok) return { error: json.error ?? `AI scoring failed (${r.status}).` };
    return { data: json as AiExtraction };
  } catch {
    return { error: "AI scoring timed out." };
  } finally {
    clearTimeout(t);
  }
}

// ── Images ──
export const MAX_BYTES = 10 * 1024 * 1024;
export const ACCEPTED = ["image/png", "image/jpeg"];

export interface Upload {
  name: string;
  type: string;
  bytes: number;
  width: number;
  height: number;
  url: string; // object URL of the original
  image: HTMLImageElement;
}

export function loadUpload(file: File): Promise<Upload> {
  return new Promise((resolve, reject) => {
    if (!ACCEPTED.includes(file.type)) return reject(new Error("Please upload a PNG or JPG image."));
    if (file.size > MAX_BYTES) return reject(new Error(`That file is ${(file.size / 1024 / 1024).toFixed(1)} MB. The limit is 10 MB.`));
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => resolve({ name: file.name, type: file.type, bytes: file.size, width: img.naturalWidth, height: img.naturalHeight, url, image: img });
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("We couldn't read that image.")); };
    img.src = url;
  });
}

/** Relative aspect-ratio difference between the upload and the frame. */
export function aspectDiff(w: number, h: number, fw: number, fh: number): number {
  return Math.abs(w / h / (fw / fh) - 1);
}

/**
 * Exact box-filter downscale for integer-multiple exports (2x, 3x, 4x). Averaging each
 * k×k block reproduces what a 1x export looks like far better than bicubic resampling,
 * which blurs 1px lines and small text.
 */
function boxDownscale(src: CanvasImageSource, sw: number, sh: number, k: number, fw: number, fh: number): HTMLCanvasElement {
  const big = document.createElement("canvas");
  big.width = sw; big.height = sh;
  const bctx = big.getContext("2d", { willReadFrequently: true })!;
  bctx.fillStyle = "#FFFFFF";
  bctx.fillRect(0, 0, sw, sh);
  bctx.drawImage(src, 0, 0);
  const s = bctx.getImageData(0, 0, sw, sh).data;
  const out = document.createElement("canvas");
  out.width = fw; out.height = fh;
  const octx = out.getContext("2d", { willReadFrequently: true })!;
  const od = octx.createImageData(fw, fh);
  const n = k * k;
  for (let y = 0; y < fh; y++) for (let x = 0; x < fw; x++) {
    let r = 0, g = 0, b = 0;
    for (let dy = 0; dy < k; dy++) {
      const row = ((y * k + dy) * sw + x * k) * 4;
      for (let dx = 0; dx < k; dx++) { const i = row + dx * 4; r += s[i]; g += s[i + 1]; b += s[i + 2]; }
    }
    const o = (y * fw + x) * 4;
    od.data[o] = r / n; od.data[o + 1] = g / n; od.data[o + 2] = b / n; od.data[o + 3] = 255;
  }
  octx.putImageData(od, 0, 0);
  return out;
}

/** Scale the upload to exactly the frame size (stretching if aspect differs). */
export function normalize(img: HTMLImageElement | HTMLCanvasElement, fw: number, fh: number): HTMLCanvasElement {
  const iw = img instanceof HTMLImageElement ? img.naturalWidth : img.width;
  const ih = img instanceof HTMLImageElement ? img.naturalHeight : img.height;
  const k = Math.round(iw / fw);
  if (k >= 2 && iw === fw * k && ih === fh * k) return boxDownscale(img, iw, ih, k, fw, fh);

  const canvas = document.createElement("canvas");
  canvas.width = fw;
  canvas.height = fh;
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  // Other sizes: downscale in halving steps, then a final resample to the frame.
  let src: CanvasImageSource = img;
  let sw = iw, sh = ih;
  while (sw / 2 >= fw && sh / 2 >= fh) {
    const step = document.createElement("canvas");
    step.width = Math.round(sw / 2); step.height = Math.round(sh / 2);
    const sctx = step.getContext("2d")!;
    sctx.imageSmoothingQuality = "high";
    sctx.drawImage(src, 0, 0, step.width, step.height);
    src = step; sw = step.width; sh = step.height;
  }
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, fw, fh);
  ctx.drawImage(src, 0, 0, fw, fh);
  return canvas;
}
