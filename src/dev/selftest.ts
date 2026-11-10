// Scoring self-test, for tuning the engine. Not part of the app bundle.
// In the dev server's browser console:
//   const T = await import("/src/dev/selftest.ts"); console.log(await T.robustness()); console.log(await T.perturbations());

import { SCREENS, getScreen } from "../shared/screens";
import type { El, Screen, ScoreResult } from "../shared/types";
import { canvasImageData, ensureFonts, renderScreen, resolveScreen } from "../lib/render";
import { scoreSubmission } from "../lib/scoring/engine";
import { normalize } from "../lib/client";

const fmt = (r: ScoreResult) => `${r.overall} (L${r.categories.layout.score} S${r.categories.spacing.score} T${r.categories.typography.score} C${r.categories.color.score})`;

/** Simulates a 2x/3x export going through the app's real normalization. */
function downscaled(scr: Screen, factor: number): ImageData {
  return canvasImageData(normalize(renderScreen(scr, factor), scr.width, scr.height));
}

/** A non-integer export size (e.g. 1.5x) through the app's resampling path. */
function resampled(scr: Screen, factor: number): ImageData {
  const big = renderScreen(scr, factor);
  return canvasImageData(normalize(big, scr.width, scr.height));
}

async function jpeg(scr: Screen, quality = 0.85): Promise<ImageData> {
  const cv = renderScreen(scr, 1);
  const blob = await new Promise<Blob>((r) => cv.toBlob((b) => r(b!), "image/jpeg", quality));
  const bmp = await createImageBitmap(blob);
  const c = document.createElement("canvas");
  c.width = scr.width; c.height = scr.height;
  const ctx = c.getContext("2d")!;
  ctx.drawImage(bmp, 0, 0);
  return ctx.getImageData(0, 0, scr.width, scr.height);
}

/** A faithful recreation exported differently should still score ~95+. */
export async function robustness(): Promise<string> {
  await ensureFonts();
  const rows: string[] = [];
  for (const spec of SCREENS) {
    const scr = resolveScreen(spec);
    const ref = canvasImageData(renderScreen(scr, 1));
    const score = (submission: ImageData) => scoreSubmission({ screen: scr, reference: ref, submission });
    rows.push(`${spec.id.padEnd(20)} 1x ${fmt(score(ref))} | 2x ${fmt(score(downscaled(scr, 2)))} | 3x ${fmt(score(downscaled(scr, 3)))} | 1.5x ${fmt(score(resampled(scr, 1.5)))} | jpg ${fmt(score(await jpeg(scr)))}`);
  }
  return rows.join("\n");
}

/** Deliberate mistakes should lose points in the right category, with specific feedback. */
export async function perturbations(id = "ride-login"): Promise<string> {
  await ensureFonts();
  const spec = getScreen(id)!;
  const scr = resolveScreen(spec);
  const ref = canvasImageData(renderScreen(scr, 1));
  const mod = (fn: (e: El) => El | null | undefined): Screen => ({ ...scr, elements: scr.elements.flatMap((e) => { const r = fn(e); return r === null ? [] : [r ?? e]; }) });
  const firstText = scr.elements.filter((e) => e.type === "text").sort((a, b) => (b.type === "text" ? b.size : 0) - (a.type === "text" ? a.size : 0))[0];
  // Prefer a real button (a filled rect with a label); fall back to any wide filled rect.
  const firstRect = scr.elements.find((e) => e.type === "rect" && e.fill && e.w > 100 && scr.elements.some((l) => l.id === `${e.id}_label`))
    ?? scr.elements.find((e) => e.type === "rect" && e.fill && e.w > 100)!;
  const cases: Record<string, Screen> = {
    "wrong button color": mod((e) => (e.id === firstRect.id ? { ...e, fill: "#3B82F6" } as El : e)),
    "title 4px smaller": resolveScreen({ ...spec, elements: spec.elements.map((e) => (e.id === firstText.id && e.type === "text" ? { ...e, size: e.size - 4 } : e)) }),
    "title regular weight": mod((e) => (e.id === firstText.id ? { ...e, weight: 400 } as El : e)),
    "button moved 12px down": mod((e) => (e.id === firstRect.id || e.id === `${firstRect.id}_label` ? { ...e, y: e.y + 12 } : e)),
    "button removed": mod((e) => (e.id === firstRect.id || e.id === `${firstRect.id}_label` ? null : e)),
    "letter spacing +1": mod((e) => (e.type === "text" ? { ...e, letterSpacing: 1 } : e)),
    "grey background": { ...scr, background: "#EDEDED" },
    "blank frame": { ...scr, elements: [] },
    "different screen": resolveScreen(SCREENS.find((s) => s.id !== id)!),
  };
  const rows = [`control: ${fmt(scoreSubmission({ screen: scr, reference: ref, submission: ref }))}`];
  for (const [name, v] of Object.entries(cases)) {
    const r = scoreSubmission({ screen: scr, reference: ref, submission: canvasImageData(renderScreen(v, 1)) });
    rows.push(`${name}: ${fmt(r)}`);
    for (const cat of ["layout", "spacing", "typography", "color"] as const) {
      const f = r.categories[cat].feedback.find((p) => p.tone !== "good");
      if (f) rows.push(`    ${cat}: ${f.text}`);
    }
  }
  return rows.join("\n");
}

/** Every screen file is valid and all resolved text fits inside the 360×800 frame. */
export async function layoutCheck(): Promise<string> {
  const { validateScreen } = await import("../shared/screens");
  await ensureFonts();
  const rows: string[] = [];
  for (const spec of SCREENS) {
    const scr = resolveScreen(spec);
    const issues = validateScreen(spec);
    const texts = scr.elements.filter((e) => e.type === "text");
    for (const t of texts) {
      if (t.x < 8 || t.x + t.w > scr.width - 8) issues.push(`text "${t.id}" runs to the edge (${Math.round(t.x)}–${Math.round(t.x + t.w)})`);
      for (const o of texts) {
        if (o === t || o.id < t.id) continue;
        const ox = Math.min(t.x + t.w, o.x + o.w) - Math.max(t.x, o.x), oy = Math.min(t.y + t.h, o.y + o.h) - Math.max(t.y, o.y);
        if (ox > 1 && oy > 1) issues.push(`text "${t.id}" overlaps "${o.id}"`);
      }
    }
    rows.push(`${spec.id.padEnd(20)} ${issues.length ? issues.join("; ") : "ok"}`);
  }
  return rows.join("\n");
}

/** Images, mascots, patterns and icons must not affect the score: cover them with stripes and compare. */
export async function unscoredCheck(): Promise<string> {
  await ensureFonts();
  const rows: string[] = [];
  for (const spec of SCREENS) {
    const scr = resolveScreen(spec);
    const ref = canvasImageData(renderScreen(scr, 1));
    // Paint stripes over every image/icon pixel that no later shape or text sits on.
    const sub = canvasImageData(renderScreen(scr, 1));
    const W = scr.width, H = scr.height, keep = new Uint8Array(W * H);
    const mark = (x0: number, y0: number, x1: number, y1: number, v: number) => {
      for (let y = Math.max(0, Math.floor(y0)); y < Math.min(H, Math.ceil(y1)); y++)
        for (let x = Math.max(0, Math.floor(x0)); x < Math.min(W, Math.ceil(x1)); x++) keep[y * W + x] = v;
    };
    scr.elements.forEach((e, i) => {
      if (e.type !== "image" && e.type !== "icon") return;
      mark(e.x, e.y, e.x + e.w, e.y + e.h, 1);
      for (const o of scr.elements.slice(i + 1)) if (o.type === "rect" || o.type === "text") mark(o.x - 2, o.y - 2, o.x + o.w + 2, o.y + o.h + 2, 0);
    });
    for (let p = 0; p < W * H; p++) {
      if (!keep[p]) continue;
      const on = ((p % W) + Math.floor(p / W)) % 8 < 4;
      sub.data.set(on ? [225, 29, 72, 255] : [14, 165, 233, 255], p * 4);
    }
    const plain = scoreSubmission({ screen: scr, reference: ref, submission: ref });
    const striped = scoreSubmission({ screen: scr, reference: ref, submission: sub });
    rows.push(`${spec.id.padEnd(20)} clean ${fmt(plain)} | patterned images ${fmt(striped)}`);
  }
  return rows.join("\n");
}
