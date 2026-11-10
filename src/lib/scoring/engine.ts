// Figiman scoring engine.
//
// Pipeline (per PRD "AI scoring model"):
//   1. Reference spec: the Screen definition (exact colors, type, boxes).
//   2. Normalize: the submission is already scaled to the frame size by the client.
//   3. Extract: each reference element is located and measured in BOTH the rendered
//      reference and the submission with the same pixel measurer. AI vision (when
//      available) seeds where to look and reads the text as written.
//   4. Compare: category scores are computed by fixed rules, so the same upload
//      always gets the same score.
//   5. Explain: rule-generated, specific feedback from the differences found.
//
// Measuring the reference with the same algorithm as the submission means
// systematic measurement bias (anti-aliasing, glyph side bearings, ink vs box)
// cancels out; only real differences remain.

import { dE2000, dE76, hexToRgb, labToRgb, rgbToHex, rgbToLab, type Lab, type RGB } from "./color";
import type { AiExtraction, Box, Category, CategoryResult, El, FeedbackPoint, RectEl, ScorableEl, ScoreResult, Screen, TextEl } from "../../shared/types";

// ───────────────────────── image prep ─────────────────────────

interface Img { w: number; h: number; data: Uint8ClampedArray; lab: Float32Array }

function prepare(id: ImageData): Img {
  const n = id.width * id.height;
  const lab = new Float32Array(n * 3);
  const cache = new Map<number, Lab>();
  for (let i = 0; i < n; i++) {
    const r = id.data[i * 4], g = id.data[i * 4 + 1], b = id.data[i * 4 + 2];
    const key = (r << 16) | (g << 8) | b;
    let l = cache.get(key);
    if (!l) { l = rgbToLab([r, g, b]); cache.set(key, l); }
    lab[i * 3] = l[0]; lab[i * 3 + 1] = l[1]; lab[i * 3 + 2] = l[2];
  }
  return { w: id.width, h: id.height, data: id.data, lab };
}

// Mode color via 5-bit-per-channel histogram, averaged within the winning bin.
const BINS = 32768;
const binCount = new Uint32Array(BINS);
const binSum = new Float64Array(BINS * 3);
const touched: number[] = [];

function modeStart() { for (const b of touched) { binCount[b] = 0; binSum[b * 3] = binSum[b * 3 + 1] = binSum[b * 3 + 2] = 0; } touched.length = 0; }
function modeAdd(img: Img, p: number) {
  const r = img.data[p * 4], g = img.data[p * 4 + 1], b = img.data[p * 4 + 2];
  const k = ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3);
  if (binCount[k] === 0) touched.push(k);
  binCount[k]++; binSum[k * 3] += r; binSum[k * 3 + 1] += g; binSum[k * 3 + 2] += b;
}
// Bins are summed with their 26 neighbours so a flat color that compression noise
// (JPEG) spreads over adjacent bins still wins against a smaller crisp region.
function neighbourhood(b: number, fn: (n: number) => void) {
  const r = b >> 10, g = (b >> 5) & 31, bl = b & 31;
  for (let dr = -1; dr <= 1; dr++) for (let dg = -1; dg <= 1; dg++) for (let db = -1; db <= 1; db++) {
    const R = r + dr, G = g + dg, B = bl + db;
    if (R < 0 || G < 0 || B < 0 || R > 31 || G > 31 || B > 31) continue;
    fn((R << 10) | (G << 5) | B);
  }
}
function modeResult(): { rgb: RGB; count: number } | null {
  let best = -1, bc = 0, total = 0;
  for (const b of touched) {
    total += binCount[b];
    // Own count plus half the neighbours: noise-spread colors get help, but two
    // genuinely different near-colors (e.g. #F3F3F3 vs #FFFFFF) are still told apart.
    let s = 0;
    neighbourhood(b, (n) => { s += n === b ? binCount[n] : binCount[n] * 0.5; });
    if (s > bc) { bc = s; best = b; }
  }
  if (best < 0) return null;
  const n = binCount[best];
  return { rgb: [binSum[best * 3] / n, binSum[best * 3 + 1] / n, binSum[best * 3 + 2] / n], count: total };
}

function regionMode(img: Img, b: Box, skip?: Box): RGB | null {
  modeStart();
  const x0 = Math.max(0, Math.floor(b.x)), y0 = Math.max(0, Math.floor(b.y));
  const x1 = Math.min(img.w, Math.ceil(b.x + b.w)), y1 = Math.min(img.h, Math.ceil(b.y + b.h));
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
    if (skip && x >= skip.x && x < skip.x + skip.w && y >= skip.y && y < skip.y + skip.h) continue;
    modeAdd(img, y * img.w + x);
  }
  const r = modeResult();
  return r && r.count >= 6 ? r.rgb : null;
}

// ───────────────────────── geometry ─────────────────────────

const right = (b: Box) => b.x + b.w;
const bottom = (b: Box) => b.y + b.h;
const cx = (b: Box) => b.x + b.w / 2;
const cy = (b: Box) => b.y + b.h / 2;
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const box = (e: Box): Box => ({ x: e.x, y: e.y, w: e.w, h: e.h });

function contains(outer: Box, inner: Box, tol = 0.5): boolean {
  return inner.x >= outer.x - tol && inner.y >= outer.y - tol && right(inner) <= right(outer) + tol && bottom(inner) <= bottom(outer) + tol;
}

function gap(a: Box, b: Box): number {
  const dx = Math.max(0, Math.max(a.x, b.x) - Math.min(right(a), right(b)));
  const dy = Math.max(0, Math.max(a.y, b.y) - Math.min(bottom(a), bottom(b)));
  return Math.max(dx, dy);
}

function expand(b: Box, p: number): Box { return { x: b.x - p, y: b.y - p, w: b.w + 2 * p, h: b.h + 2 * p }; }

function iou(a: Box, b: Box): number {
  const ix = Math.max(0, Math.min(right(a), right(b)) - Math.max(a.x, b.x));
  const iy = Math.max(0, Math.min(bottom(a), bottom(b)) - Math.max(a.y, b.y));
  const inter = ix * iy;
  const uni = a.w * a.h + b.w * b.h - inter;
  return uni > 0 ? inter / uni : 0;
}

interface Geo {
  el: ScorableEl;
  container: El | null;
  pad: number;
  depth: number;
}

function buildGeometry(screen: Screen): Map<string, Geo> {
  const els = screen.elements.filter((e) => !(e.type === "icon" && e.glyph === "status"));
  const map = new Map<string, Geo>();
  for (const el of els) {
    if (el.type !== "rect" && el.type !== "text") continue;
    let container: El | null = null;
    let minGap = 40;
    for (const o of els) {
      if (o === el) continue;
      const oContainsEl = (o.type === "rect" || o.type === "image") && contains(o, el) && !(contains(el, o) && o.w * o.h <= el.w * el.h);
      if (oContainsEl) {
        if (!container || o.w * o.h < container.w * container.h) container = o;
        continue;
      }
      if (contains(el, o)) continue; // descendant
      minGap = Math.min(minGap, gap(el, o));
    }
    map.set(el.id, { el, container, pad: Math.max(2, Math.min(20, Math.floor(minGap / 2))), depth: 0 });
  }
  // Containers are measured before their children so children can follow them.
  for (const g of map.values()) {
    let c = g.container, d = 0;
    while (c && d < 10) { d++; c = map.get(c.id)?.container ?? null; }
    g.depth = d;
  }
  return new Map([...map.entries()].sort((a, b) => a[1].depth - b[1].depth));
}

/** Pixels that no element covers in the reference: where only the screen background shows. */
function backgroundMask(screen: Screen): Uint8Array {
  const m = new Uint8Array(screen.width * screen.height);
  for (const e of screen.elements) {
    if (e.type === "icon" && e.glyph === "status") continue;
    const x0 = Math.max(0, Math.floor(e.x) - 2), y0 = Math.max(0, Math.floor(e.y) - 2);
    const x1 = Math.min(screen.width, Math.ceil(e.x + e.w) + 2), y1 = Math.min(screen.height, Math.ceil(e.y + e.h) + 2);
    for (let y = y0; y < y1; y++) m.fill(1, y * screen.width + x0, y * screen.width + x1);
  }
  return m;
}

function backgroundMode(img: Img, mask: Uint8Array): RGB | null {
  modeStart();
  let n = 0;
  for (let i = 0; i < mask.length; i += 2) if (!mask[i]) { modeAdd(img, i); n++; }
  return n >= 200 ? modeResult()?.rgb ?? null : null;
}

// ───────────────────────── measurement ─────────────────────────

interface Measure {
  found: boolean;
  box: Box;
  clipped: boolean;
  bg: RGB;
  fill?: RGB;
  stroke?: RGB;
  ink?: RGB;
  density?: number;
  /** Contrast of a shape's fill against what's around it (0 = invisible fill). */
  fillContrast?: number;
}

function windowFor(seed: Box, g: Geo, img: Img, frameBox: Box, containerBox?: Box): { win: Box; padEdge: [boolean, boolean, boolean, boolean] } {
  // Stay 1px inside a container so its anti-aliased edge never leaks into the window.
  const cb = containerBox ?? (g.container ? box(g.container) : null);
  const lim = cb ? expand(cb, -1) : frameBox;
  const statusTop = seed.y >= 47 ? 40 : 0;
  const raw = expand(seed, g.pad);
  const l = Math.max(raw.x, lim.x, 0), t = Math.max(raw.y, lim.y, statusTop, 0);
  const r = Math.min(right(raw), right(lim), img.w), b = Math.min(bottom(raw), bottom(lim), img.h);
  return {
    win: { x: Math.floor(l), y: Math.floor(t), w: Math.ceil(r) - Math.floor(l), h: Math.ceil(b) - Math.floor(t) },
    padEdge: [raw.x > lim.x && raw.x > 0, raw.y > lim.y && raw.y > statusTop, right(raw) < right(lim) && right(raw) < img.w, bottom(raw) < bottom(lim) && bottom(raw) < img.h],
  };
}

function measure(img: Img, seed: Box, g: Geo, frameBg: RGB, containerBox?: Box): Measure {
  const el = g.el;
  const frameBox = { x: 0, y: 0, w: img.w, h: img.h };
  const { win, padEdge } = windowFor(seed, g, img, frameBox, containerBox);
  const sb = { x: Math.floor(seed.x), y: Math.floor(seed.y), w: Math.ceil(seed.x + seed.w) - Math.floor(seed.x), h: Math.ceil(seed.y + seed.h) - Math.floor(seed.y) };
  const bg = regionMode(img, win, sb) ?? (g.container && g.container.type === "rect" && g.container.fill ? hexToRgb(g.container.fill) : frameBg);
  const bgLab = rgbToLab(bg);
  const empty: Measure = { found: false, box: box(seed), clipped: false, bg };
  if (win.w <= 0 || win.h <= 0) return empty;

  // Contrast of each window pixel against the local background, plus a noise floor
  // from the surrounding ring (JPEG artifacts, resampling halos).
  const c = new Float32Array(win.w * win.h);
  const hist = new Uint32Array(101), histC = new Uint32Array(101);
  let maxC = 0, ringN = 0, ringC = 0;
  for (let y = 0; y < win.h; y++) for (let x = 0; x < win.w; x++) {
    const p = (win.y + y) * img.w + win.x + x;
    const v = dE76(img.lab.subarray(p * 3, p * 3 + 3), bgLab);
    c[y * win.w + x] = v;
    if (v > maxC) maxC = v;
    // Two noise estimates from the ring around the element:
    //  - adjacent-pixel difference (p70): zero on flat color, even if the ring holds a
    //    second flat color such as a moved element;
    //  - median contrast to the background: catches JPEG block drift, and stays low
    //    unless something covers more than half the ring.
    const ax = win.x + x, ay = win.y + y;
    if (ax < sb.x || ax >= sb.x + sb.w || ay < sb.y || ay >= sb.y + sb.h) {
      histC[Math.min(100, Math.floor(v * 4))]++; ringC++;
      if (x + 1 < win.w && ax !== sb.x - 1) {
        const d = dE76(img.lab.subarray(p * 3, p * 3 + 3), img.lab.subarray(p * 3 + 3, p * 3 + 6));
        hist[Math.min(100, Math.floor(d * 4))]++; ringN++;
      }
    }
  }
  const pct = (h: Uint32Array, n: number, q: number) => { let acc = 0; for (let i = 0; i <= 100; i++) { acc += h[i]; if (acc >= n * q) return i / 4; } return 25; };
  const noise = Math.max(ringN ? pct(hist, ringN, 0.7) : 0, ringC ? pct(histC, ringC, 0.5) : 0);
  const floor = noise * 2 + 0.5;

  let T: number;
  if (el.type === "text") {
    if (maxC < 8) return empty;
    // Half-max threshold: the 50% crossing of a glyph edge barely moves under blur or
    // resampling (e.g. a 2x export scaled down), so ink boxes stay comparable.
    T = Math.max(8, maxC * 0.5, floor);
  } else {
    const inset = Math.max(1, Math.min(6, Math.round(Math.min(sb.w, sb.h) * 0.2)));
    const fillCand = regionMode(img, { x: sb.x + inset, y: sb.y + inset, w: sb.w - 2 * inset, h: sb.h - 2 * inset }) ?? regionMode(img, sb);
    const fc = fillCand ? dE76(rgbToLab(fillCand), bgLab) : 0;
    // Filled shape: half its fill contrast. Outline-only shape: catch even light borders.
    T = Math.max(fc > 1.5 ? Math.max(0.9, fc * 0.5) : 3, floor);
  }

  const rows = new Uint32Array(win.h), cols = new Uint32Array(win.w);
  let count = 0;
  for (let y = 0; y < win.h; y++) for (let x = 0; x < win.w; x++) {
    if (c[y * win.w + x] > T) { count++; rows[y]++; cols[x]++; }
  }
  const minPixels = el.type === "text" ? 6 : Math.max(6, Math.min(40, el.w * el.h * 0.05));
  if (count < minPixels) return empty;
  // Shapes: a real edge fills most of a row/column, compression ringing is sparse.
  // Text: glyph extremes (dots, serifs) are sparse by nature, so keep every row.
  const maxRow = Math.max(...rows), maxCol = Math.max(...cols);
  const rowMin = el.type === "text" ? 1 : Math.max(1, maxRow * 0.2);
  const colMin = el.type === "text" ? 1 : Math.max(1, maxCol * 0.2);
  let y0 = 0, y1 = win.h - 1, x0 = 0, x1 = win.w - 1;
  while (y0 < win.h && rows[y0] < rowMin) y0++;
  while (y1 > y0 && rows[y1] < rowMin) y1--;
  while (x0 < win.w && cols[x0] < colMin) x0++;
  while (x1 > x0 && cols[x1] < colMin) x1--;
  if (y0 >= win.h || x0 >= win.w) return empty;

  const mb: Box = { x: win.x + x0, y: win.y + y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
  const clipped = (padEdge[0] && x0 === 0) || (padEdge[1] && y0 === 0) || (padEdge[2] && x1 === win.w - 1) || (padEdge[3] && y1 === win.h - 1);
  const m: Measure = { found: true, box: mb, clipped, bg };

  if (el.type === "rect") {
    const inset = Math.max(1, Math.min(6, Math.round(Math.min(mb.w, mb.h) * 0.2)));
    m.fill = regionMode(img, { x: mb.x + inset, y: mb.y + inset, w: mb.w - 2 * inset, h: mb.h - 2 * inset }) ?? regionMode(img, mb) ?? bg;
    m.fillContrast = dE76(rgbToLab(m.fill), bgLab);
    if (el.stroke) {
      const band = Math.max(1, Math.ceil(el.strokeWidth ?? 1));
      const mx0 = mb.x + mb.w * 0.25, mx1 = mb.x + mb.w * 0.75, my0 = mb.y + mb.h * 0.25, my1 = mb.y + mb.h * 0.75;
      const isEdge = (x: number, y: number) => (y < mb.y + band || y >= mb.y + mb.h - band) ? (x >= mx0 && x <= mx1) : (x < mb.x + band || x >= mb.x + mb.w - band) ? (y >= my0 && y <= my1) : false;
      let maxBand = 0;
      for (let y = mb.y; y < mb.y + mb.h; y++) for (let x = mb.x; x < mb.x + mb.w; x++) if (isEdge(x, y)) maxBand = Math.max(maxBand, c[(y - win.y) * win.w + (x - win.x)]);
      modeStart();
      for (let y = mb.y; y < mb.y + mb.h; y++) for (let x = mb.x; x < mb.x + mb.w; x++) {
        if (isEdge(x, y) && c[(y - win.y) * win.w + (x - win.x)] >= maxBand * 0.6) modeAdd(img, y * img.w + x);
      }
      m.stroke = modeResult()?.rgb ?? m.fill;
    }
  } else {
    // Ink color: mean of the most contrasting pixels (glyph cores, not anti-aliased edges).
    let maxIn = 0;
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) maxIn = Math.max(maxIn, c[y * win.w + x]);
    let sr = 0, sg = 0, sbb = 0, n = 0;
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      if (c[y * win.w + x] >= maxIn * 0.85) {
        const p = ((win.y + y) * img.w + win.x + x) * 4;
        sr += img.data[p]; sg += img.data[p + 1]; sbb += img.data[p + 2]; n++;
      }
    }
    m.ink = n ? [sr / n, sg / n, sbb / n] : bg;
    const inkC = Math.max(1, dE76(rgbToLab(m.ink), bgLab));
    let cov = 0;
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) cov += Math.min(1, c[y * win.w + x] / inkC);
    m.density = cov / (mb.w * mb.h);
  }
  return m;
}

// ───────────────────────── checks ─────────────────────────

interface Check {
  cat: Category;
  score: number;
  weight: number;
  issue: string;
  good: string;
  boxes: Box[];
  /** Only surface as feedback below this score (checks with noisier measurements need more confidence). */
  showBelow?: number;
}

const lin = (v: number, full: number, zero: number) => clamp01(1 - (v - full) / (zero - full));
const px = (v: number) => `${Math.round(Math.abs(v))}px`;
const q = (s: string) => `“${s}”`;

const WEIGHT_NAMES: Record<number, string> = { 100: "Thin", 200: "ExtraLight", 300: "Light", 400: "Regular", 500: "Medium", 600: "SemiBold", 700: "Bold", 800: "ExtraBold", 900: "Black" };

function colorScore(a: RGB, b: RGB): number {
  // ΔE2000 ≤ 1.5 is near-identical (full credit); ≥ 12 is clearly a different color.
  return lin(dE2000(rgbToLab(a), rgbToLab(b)), 1.5, 12);
}

/** Estimate the user's actual color: spec + (submission − reference) in Lab. */
function yoursHex(spec: string, ref: RGB, sub: RGB): string {
  const s = rgbToLab(hexToRgb(spec)), r = rgbToLab(ref), u = rgbToLab(sub);
  return rgbToHex(labToRgb([s[0] + u[0] - r[0], s[1] + u[1] - r[1], s[2] + u[2] - r[2]]));
}

function levenshteinRatio(a: string, b: string): number {
  if (a === b) return 1;
  const m = a.length, n = b.length;
  if (!m || !n) return 0;
  const d = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    let prev = d[0]; d[0] = i;
    for (let j = 1; j <= n; j++) {
      const tmp = d[j];
      d[j] = Math.min(d[j] + 1, d[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return 1 - d[n] / Math.max(m, n);
}

const norm = (s: string) => s.replace(/\s+/g, " ").trim();

export interface ScoreInput {
  screen: Screen; // resolved
  reference: ImageData;
  submission: ImageData;
  ai?: AiExtraction | null;
}

const WEIGHTS: Record<Category, number> = { layout: 0.3, spacing: 0.25, typography: 0.25, color: 0.2 };
export let SEVERITY = 2;
export function setSeverity(v: number) { SEVERITY = v; }

export function bandFor(score: number): string {
  if (score >= 90) return "Pixel perfect";
  if (score >= 75) return "Very close";
  if (score >= 50) return "Getting there";
  return "Keep practising";
}

export function scoreSubmission({ screen, reference, submission, ai }: ScoreInput): ScoreResult {
  const t0 = performance.now();
  if (reference.width !== submission.width || reference.height !== submission.height) {
    throw new Error("Submission must be normalized to the reference frame size.");
  }
  const ref = prepare(reference);
  const sub = prepare(submission);
  const frame: Box = { x: 0, y: 0, w: screen.width, h: screen.height };
  const bgMask = backgroundMask(screen);
  const refBg = backgroundMode(ref, bgMask) ?? regionMode(ref, frame)!;
  const subBg = backgroundMode(sub, bgMask) ?? regionMode(sub, frame)!;

  const geo = buildGeometry(screen);
  const aiById = new Map((ai?.elements ?? []).map((e) => [e.id, e]));
  const refM = new Map<string, Measure>();
  const subM = new Map<string, Measure>();

  for (const g of geo.values()) {
    const el = g.el;
    const rm = measure(ref, box(el), g, refBg);
    refM.set(el.id, rm);
    // Children follow their container: if the user moved a button, look for its label
    // inside the moved button rather than where the button used to be.
    let containerSub: Box | undefined;   // container clamp when following a real move
    let containerFound: Box | undefined; // where the container actually is in the submission
    let offset = { x: 0, y: 0 };
    const c = g.container;
    if (c && c.type === "rect") {
      const rc = refM.get(c.id), sc = subM.get(c.id);
      if (rc?.found && sc?.found) {
        const dx = sc.box.x - rc.box.x, dy = sc.box.y - rc.box.y;
        containerFound = { x: c.x + dx, y: c.y + dy, w: c.w, h: c.h };
        // Ignore sub-2px jitter from anti-aliasing; follow real moves.
        if (Math.max(Math.abs(dx), Math.abs(dy)) > 2) {
          offset = { x: dx, y: dy };
          containerSub = containerFound;
        }
      }
    }
    let seed = { x: el.x + offset.x, y: el.y + offset.y, w: el.w, h: el.h };
    let usedAi = false;
    const a = aiById.get(el.id);
    if (a && a.present && a.w > 0 && a.h > 0) {
      const aBox = { x: a.x, y: a.y, w: a.w, h: a.h };
      if (Math.max(Math.abs(cx(aBox) - cx(seed)), Math.abs(cy(aBox) - cy(seed))) > Math.max(6, g.pad * 0.6)) { seed = aBox; usedAi = true; }
    }
    // AI-seeded: clamp to where the container really is (or just the frame), never to
    // the container's reference position, which may be somewhere else entirely.
    const clamp = usedAi ? (containerFound ?? { x: -1, y: -1, w: sub.w + 2, h: sub.h + 2 }) : containerSub;
    let sm = measure(sub, seed, g, subBg, clamp);
    if (!sm.found && (usedAi || offset.x || offset.y)) sm = measure(sub, box(el), g, subBg);
    if (a && !a.present && (!sm.found || sm.clipped)) sm = { ...sm, found: false };
    subM.set(el.id, sm);
  }

  const checks: Check[] = [];
  const scorable = [...geo.values()].map((g) => g.el);
  const name = (e: ScorableEl) => (e.type === "text" ? `${e.name} ${q(e.text.split("\n")[0].slice(0, 28))}` : e.name);

  // ── Layout: presence + position/size of each element ──
  for (const el of scorable) {
    const r = refM.get(el.id)!, s = subM.get(el.id)!;
    if (!r.found) continue; // not measurable even in the reference (e.g. invisible on its background)
    const weight = 1 + Math.min(2, (el.w * el.h) / 20000);
    // A filled shape whose fill vanished (only its label/icon remain) is missing,
    // not "found but smaller".
    if (s.found && el.type === "rect" && !el.stroke && (r.fillContrast ?? 0) > 2 && (s.fillContrast ?? 0) < 0.8) {
      checks.push({ cat: "layout", score: 0, weight, issue: `${name(el)} is missing, or has no visible fill (it should be ${(el as RectEl).fill}).`, good: "", boxes: [box(el)] });
      if ((el as RectEl).fill) checks.push({ cat: "color", score: 0, weight: 0.5, issue: `${name(el)} fill should be ${(el as RectEl).fill}; yours blends into the background.`, good: "", boxes: [box(el)] });
      subM.set(el.id, { ...s, found: false });
      continue;
    }
    if (!s.found) {
      checks.push({ cat: "layout", score: 0, weight, issue: `${name(el)} is missing, or too far from where it should be.`, good: "", boxes: [box(el)] });
      // A missing element can't have the right color or type either.
      if (el.type === "text") checks.push({ cat: "typography", score: 0, weight: 0.5, issue: `${name(el)} couldn't be found, so its type can't be checked.`, good: "", boxes: [box(el)] });
      if (el.type === "text" || (el as RectEl).fill) checks.push({ cat: "color", score: 0, weight: 0.5, issue: `${name(el)} couldn't be found, so its color can't be checked.`, good: "", boxes: [box(el)] });
      continue;
    }
    if (el.type === "text") {
      const anchor = (b: Box) => (el.align === "center" ? cx(b) : el.align === "right" ? right(b) : b.x);
      const dx = anchor(s.box) - anchor(r.box), dy = cy(s.box) - cy(r.box);
      const score = lin(Math.max(Math.abs(dx), Math.abs(dy)), 2, 16);
      const parts = [Math.abs(dy) > 2 ? `${px(dy)} ${dy > 0 ? "lower" : "higher"}` : "", Math.abs(dx) > 2 ? `${px(dx)} too far ${dx > 0 ? "right" : "left"}` : ""].filter(Boolean);
      checks.push({ cat: "layout", score, weight, issue: `${name(el)} sits ${parts.join(" and ")} than the reference.`, good: `${name(el)} is placed correctly.`, boxes: [box(el)] });
    } else {
      const score = clamp01((iou(expand(s.box, 3), expand(r.box, 3)) - 0.4) / (0.92 - 0.4));
      const dx = s.box.x - r.box.x, dy = s.box.y - r.box.y, dw = s.box.w - r.box.w, dh = s.box.h - r.box.h;
      const parts = [
        Math.abs(dy) > 2 ? `${px(dy)} ${dy > 0 ? "lower" : "higher"}` : "",
        Math.abs(dx) > 2 ? `${px(dx)} too far ${dx > 0 ? "right" : "left"}` : "",
        Math.abs(dw) > 2 ? `${px(dw)} ${dw > 0 ? "wider" : "narrower"} (should be ${Math.round(el.w)}px)` : "",
        Math.abs(dh) > 2 ? `${px(dh)} ${dh > 0 ? "taller" : "shorter"} (should be ${Math.round(el.h)}px)` : "",
      ].filter(Boolean);
      checks.push({ cat: "layout", score, weight, issue: `${name(el)} is ${parts.join(", ") || "slightly off"}.`, good: `${name(el)} matches the reference size and position.`, boxes: [box(el)] });
    }
  }

  // ── Spacing: vertical gaps, insets and centering relative to containers ──
  const containerBox = (g: Geo, which: Map<string, Measure>): Box => {
    const c = g.container;
    if (!c) return frame;
    if (c.type === "rect") { const m = which.get(c.id); if (m?.found) return m.box; }
    return box(c);
  };
  const seenPairs = new Set<string>();
  for (const g of geo.values()) {
    const el = g.el;
    const r = refM.get(el.id)!, s = subM.get(el.id)!;
    if (!r.found) continue;
    const both = s.found;

    // Gap to the nearest element directly above, inside the same container.
    let above: ScorableEl | null = null;
    for (const o of scorable) {
      if (o === el) continue;
      const og = geo.get(o.id)!;
      if (og.container !== g.container) continue;
      if (contains(o, el) || contains(el, o)) continue;
      const overlapX = Math.min(right(o), right(el)) - Math.max(o.x, el.x);
      if (overlapX <= 0 || bottom(o) > el.y + 0.5) continue;
      if (!above || bottom(o) > bottom(above)) above = o;
    }
    if (above && el.y - bottom(above) <= 160 && refM.get(above.id)!.found) {
      const key = `${above.id}>${el.id}`;
      if (!seenPairs.has(key)) {
        seenPairs.add(key);
        const ra = refM.get(above.id)!, sa = subM.get(above.id)!;
        const expected = Math.round(el.y - bottom(above));
        if (both && sa.found) {
          const delta = (s.box.y - bottom(sa.box)) - (r.box.y - bottom(ra.box));
          checks.push({
            cat: "spacing", score: lin(Math.abs(delta), 2, 14), weight: 1,
            issue: `Gap between ${name(above)} and ${name(el)} should be ${expected}px; yours is about ${Math.max(0, Math.round(expected + delta))}px.`,
            good: `Gap between ${name(above)} and ${name(el)} is right (${expected}px).`,
            boxes: [box(above), box(el)],
          });
        } else {
          checks.push({ cat: "spacing", score: 0, weight: 0.5, issue: `Couldn't measure the gap above ${name(el)} — one of the elements is missing.`, good: "", boxes: [box(el)] });
        }
      }
    }

    // Inset / centering inside the container (or the frame).
    const cRef = containerBox(g, refM), cSub = containerBox(g, subM);
    const cSpec = g.container ? box(g.container) : frame;
    const cName = g.container ? g.container.name : "the frame";
    if (el.w >= cSpec.w - 2) continue;
    const centeredX = Math.abs(cx(el) - cx(cSpec)) <= 1.5;
    if (centeredX) {
      if (both) {
        const delta = (cx(s.box) - cx(cSub)) - (cx(r.box) - cx(cRef));
        checks.push({ cat: "spacing", score: lin(Math.abs(delta), 2, 12), weight: 1, issue: `${name(el)} isn't centered horizontally in ${cName} (off by ${px(delta)}).`, good: `${name(el)} is centered in ${cName}.`, boxes: [box(el)] });
      }
    } else {
      const leftSide = el.x - cSpec.x <= right(cSpec) - right(el);
      const expected = Math.round(leftSide ? el.x - cSpec.x : right(cSpec) - right(el));
      if (both) {
        const delta = leftSide ? (s.box.x - cSub.x) - (r.box.x - cRef.x) : (right(cSub) - right(s.box)) - (right(cRef) - right(r.box));
        const side = leftSide ? "Left" : "Right";
        checks.push({ cat: "spacing", score: lin(Math.abs(delta), 2, 14), weight: 1, issue: `${side} inset of ${name(el)} in ${cName} should be ${expected}px; yours is about ${Math.max(0, Math.round(expected + delta))}px.`, good: `${side} inset of ${name(el)} is right (${expected}px).`, boxes: [box(el)] });
      }
    }
    if (g.container && g.container.type === "rect" && Math.abs(cy(el) - cy(cSpec)) <= 1.5 && el.h < cSpec.h - 2 && both) {
      const delta = (cy(s.box) - cy(cSub)) - (cy(r.box) - cy(cRef));
      checks.push({ cat: "spacing", score: lin(Math.abs(delta), 2, 10), weight: 0.8, issue: `${name(el)} isn't vertically centered in ${cName} (off by ${px(delta)}) — check top and bottom padding.`, good: `${name(el)} is vertically centered in ${cName}.`, boxes: [box(el)] });
    }
  }

  // ── Typography: size, weight, font/letter spacing, case ──
  for (const el of scorable) {
    if (el.type !== "text") continue;
    const r = refM.get(el.id)!, s = subM.get(el.id)!;
    if (!r.found || !s.found) continue;
    const t = el as TextEl;
    const lines = t.text.split("\n").length;
    const ratioH = s.box.h / r.box.h, ratioW = s.box.w / r.box.w;
    // Single line: ink height tracks font size and ignores letter spacing.
    // Multi-line: the block height is set by line height, so use the width instead.
    const est = t.size * (lines > 1 ? ratioW : ratioH);
    const lh = t.lineHeight ?? Math.round(t.size * 1.25);
    // Bigger text (titles, prices) matters more to the overall impression.
    const sizeW = Math.max(0.75, Math.min(2, t.size / 16));
    checks.push({
      cat: "typography", score: lin(Math.abs(est - t.size), 1, 6), weight: sizeW,
      issue: lines > 1
        ? `${name(el)} looks like ~${Math.round(est)}px; it should be ${t.size}px with ${lh}px line height.`
        : `${name(el)} looks like ~${Math.round(est)}px; it should be ${t.size}px.`,
      good: `${name(el)} size is right (${t.size}px).`,
      boxes: [box(el)],
    });
    if (r.density && s.density) {
      // Calibrated on the library: one Inter weight step ≈ ±10% ink density; resampling
      // noise on small text reaches ~±11%, so the scale is graded rather than stepped.
      const lr = Math.log(s.density / r.density);
      const steps = Math.round(lr / Math.log(1.105)) || Math.sign(lr);
      const estW = Math.max(100, Math.min(900, t.weight + steps * 100));
      checks.push({
        cat: "typography", score: lin(Math.abs(lr), 0.09, 0.24), weight: (t.size < 14 ? 0.3 : 0.6) * sizeW, showBelow: 0.5,
        issue: `${name(el)} looks ${steps > 0 ? "heavier" : "lighter"} (~${WEIGHT_NAMES[estW] ?? estW}); use ${WEIGHT_NAMES[t.weight]} (${t.weight}).`,
        good: `${name(el)} weight is right (${WEIGHT_NAMES[t.weight]}).`,
        boxes: [box(el)],
      });
    }
    if (lines > 1) {
      const dh = ratioH - 1;
      checks.push({
        cat: "typography", score: lin(Math.abs(dh), 0.05, 0.3), weight: 0.6 * sizeW,
        issue: `${name(el)} block is ${Math.round(Math.abs(dh) * 100)}% ${dh > 0 ? "taller" : "shorter"} — check the line height (${lh}px) and line breaks.`,
        good: `${name(el)} line height is right (${lh}px).`,
        boxes: [box(el)],
      });
    } else if (t.text.length > 3) {
      const dev = ratioW / ratioH - 1;
      checks.push({
        cat: "typography", score: lin(Math.abs(dev), 0.05, 0.25), weight: 0.4 * sizeW,
        issue: `${name(el)} is ${Math.round(Math.abs(dev) * 100)}% ${dev > 0 ? "wider" : "narrower"} than its size suggests — check the font (Inter)${t.letterSpacing ? `, letter spacing (${t.letterSpacing}px)` : ", letter spacing (0)"} and the exact text.`,
        good: `${name(el)} uses the right font and letter spacing.`,
        boxes: [box(el)],
      });
    }
    const a = aiById.get(el.id);
    if (a?.present && a.text_as_written) {
      const want = norm(t.text), got = norm(a.text_as_written);
      if (want === got) {
        checks.push({ cat: "typography", score: 1, weight: 0.6, issue: "", good: `${name(el)} text and casing match.`, boxes: [box(el)] });
      } else if (want.toLowerCase() === got.toLowerCase()) {
        checks.push({ cat: "typography", score: 0, weight: 0.6, issue: `${name(el)} casing differs: you wrote ${q(got)}, reference is ${q(want)}.`, good: "", boxes: [box(el)] });
      } else {
        const sim = levenshteinRatio(want.toLowerCase(), got.toLowerCase());
        if (sim < 0.9) checks.push({ cat: "typography", score: clamp01((sim - 0.5) / 0.4), weight: 0.6, issue: `${name(el)} text differs: you wrote ${q(got.slice(0, 40))}.`, good: "", boxes: [box(el)] });
      }
    }
  }

  // ── Color: background, fills, strokes, text ──
  checks.push({
    cat: "color", score: colorScore(refBg, subBg), weight: 2,
    issue: `Screen background should be ${screen.background}; yours is about ${yoursHex(screen.background, refBg, subBg)}.`,
    good: `Screen background color matches (${screen.background}).`,
    boxes: [],
  });
  for (const el of scorable) {
    const r = refM.get(el.id)!, s = subM.get(el.id)!;
    if (!r.found || !s.found) continue;
    if (el.type === "rect") {
      const rect = el as RectEl;
      if (rect.fill && r.fill && s.fill) {
        checks.push({
          // Hairlines (dividers) are blurred by any resampling, so their color counts less.
          cat: "color", score: colorScore(r.fill, s.fill), weight: Math.min(el.w, el.h) <= 3 ? 0.5 : 1 + Math.min(1.5, (el.w * el.h) / 40000),
          issue: `${name(el)} fill should be ${rect.fill}; yours is about ${yoursHex(rect.fill, r.fill, s.fill)}.`,
          good: `${name(el)} fill matches (${rect.fill}).`,
          boxes: [box(el)],
        });
      }
      if (rect.stroke && r.stroke && s.stroke) {
        checks.push({
          cat: "color", score: colorScore(r.stroke, s.stroke), weight: 0.5,
          issue: `${name(el)} border should be ${rect.stroke}; yours is about ${yoursHex(rect.stroke, r.stroke, s.stroke)}.`,
          good: `${name(el)} border color matches (${rect.stroke}).`,
          boxes: [box(el)],
        });
      }
    } else if (r.ink && s.ink) {
      const t = el as TextEl;
      checks.push({
        // Glyph edges blend with whatever is behind the text, so text color gets more slack.
        cat: "color", score: lin(dE2000(rgbToLab(r.ink), rgbToLab(s.ink)), 3, 14), weight: 0.8, showBelow: 0.6,
        issue: `${name(el)} text color should be ${t.color}; yours is about ${yoursHex(t.color, r.ink, s.ink)}.`,
        good: `${name(el)} text color matches (${t.color}).`,
        boxes: [box(el)],
      });
    }
  }

  // ── Aggregate ──
  const categories = {} as Record<Category, CategoryResult>;
  for (const cat of ["layout", "spacing", "typography", "color"] as Category[]) {
    const cs = checks.filter((c) => c.cat === cat);
    const tw = cs.reduce((a, c) => a + c.weight, 0);
    // Weighted error, amplified so a single clear mistake is visible in the score
    // while per-check tolerances keep near-identical work at full credit.
    const err = tw > 0 ? cs.reduce((a, c) => a + c.weight * (1 - c.score), 0) / tw : 1;
    const score = Math.round(100 * clamp01(1 - SEVERITY * err));
    categories[cat] = { score, checks: cs.length, feedback: pickFeedback(cs) };
  }
  let overall = Math.round((Object.keys(WEIGHTS) as Category[]).reduce((a, k) => a + WEIGHTS[k] * categories[k].score, 0));
  // "Pixel perfect" means no clear mistakes: one major miss (a missing element, a wrong
  // button color, a title in the wrong size) caps the result at "Very close".
  if (overall >= 90 && checks.some((c) => c.score < 0.35 && c.weight >= 1)) overall = 89;
  return { overall, band: bandFor(overall), categories, mode: ai ? "ai+pixel" : "pixel", durationMs: Math.round(performance.now() - t0) };
}

/** Debug helper: raw text measurements (used for calibration). */
export function measureTexts(screen: Screen, image: ImageData): Record<string, { box: Box; density?: number; found: boolean }> {
  const img = prepare(image);
  const frameBg = regionMode(img, { x: 0, y: 0, w: img.w, h: img.h })!;
  const out: Record<string, { box: Box; density?: number; found: boolean }> = {};
  for (const g of buildGeometry(screen).values()) {
    if (g.el.type !== "text") continue;
    const m = measure(img, box(g.el), g, frameBg);
    out[g.el.id] = { box: m.box, density: m.density, found: m.found };
  }
  return out;
}

function pickFeedback(cs: Check[]): FeedbackPoint[] {
  if (cs.length === 0) return [{ tone: "warn", text: "Nothing could be measured for this category." }];
  const issues = cs.filter((c) => c.score < (c.showBelow ?? 0.85) && c.issue)
    .sort((a, b) => b.weight * (1 - b.score) - a.weight * (1 - a.score))
    .slice(0, 3)
    .map((c): FeedbackPoint => ({ tone: c.score < 0.4 ? "bad" : "warn", text: c.issue, boxes: c.boxes }));
  if (issues.length >= 2) return issues;
  const goods = cs.filter((c) => c.score >= 0.85 && c.good)
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 3 - issues.length)
    .map((c): FeedbackPoint => ({ tone: "good", text: c.good, boxes: c.boxes }));
  return [...issues, ...goods];
}
