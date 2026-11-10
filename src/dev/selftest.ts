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
