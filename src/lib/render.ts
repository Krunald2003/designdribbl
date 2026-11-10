// Renders a Screen spec onto a 2D canvas. The same renderer produces the reference
// image users see and the reference pixels the scoring engine measures against.

import type { El, IconEl, ImageEl, RectEl, Screen, TextEl } from "../shared/types";

export const SCREEN_FONT = "Inter";
const WEIGHTS = [400, 500, 600, 700, 800];

let fontsReady: Promise<void> | null = null;

export function ensureFonts(): Promise<void> {
  if (!fontsReady) {
    fontsReady = Promise.all(WEIGHTS.map((w) => document.fonts.load(`${w} 16px ${SCREEN_FONT}`)))
      .then(() => undefined)
      .catch(() => undefined);
  }
  return fontsReady;
}

function fontString(el: TextEl): string {
  return `${el.weight} ${el.size}px ${SCREEN_FONT}, system-ui, sans-serif`;
}

type Ctx = CanvasRenderingContext2D;

function setLetterSpacing(ctx: Ctx, px: number | undefined) {
  // letterSpacing is supported in all current evergreen browsers.
  (ctx as unknown as { letterSpacing: string }).letterSpacing = `${px ?? 0}px`;
}

/**
 * Resolve text anchors to tight text boxes (x, w) using real font metrics.
 * Returns a new Screen; call after ensureFonts().
 */
export function resolveScreen(screen: Screen): Screen {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;
  const elements = screen.elements.map((el): El => {
    if (el.type !== "text") return el;
    ctx.font = fontString(el);
    setLetterSpacing(ctx, el.letterSpacing);
    const lines = el.text.split("\n");
    const tight = Math.max(...lines.map((l) => ctx.measureText(l).width)) - (el.letterSpacing ?? 0);
    const anchorW = el.w > 0 ? el.w : tight;
    let x = el.x;
    if (el.align === "center") x = el.x + (anchorW - tight) / 2;
    else if (el.align === "right") x = el.x + anchorW - tight;
    return { ...el, x: Math.round(x * 2) / 2, w: Math.round(tight * 2) / 2 };
  });
  return { ...screen, elements };
}

function roundRectPath(ctx: Ctx, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, rr);
}

function drawRect(ctx: Ctx, el: RectEl) {
  if (el.fill) {
    roundRectPath(ctx, el.x, el.y, el.w, el.h, el.radius ?? 0);
    ctx.fillStyle = el.fill;
    ctx.fill();
  }
  if (el.stroke && el.strokeWidth) {
    // Figma default: inside stroke.
    const s = el.strokeWidth;
    roundRectPath(ctx, el.x + s / 2, el.y + s / 2, el.w - s, el.h - s, Math.max(0, (el.radius ?? 0) - s / 2));
    ctx.strokeStyle = el.stroke;
    ctx.lineWidth = s;
    ctx.stroke();
  }
}

function drawText(ctx: Ctx, el: TextEl) {
  ctx.font = fontString(el);
  setLetterSpacing(ctx, el.letterSpacing);
  ctx.fillStyle = el.color;
  ctx.textBaseline = "middle";
  const lh = el.lineHeight ?? Math.round(el.size * 1.25);
  const lines = el.text.split("\n");
  lines.forEach((line, i) => {
    const lw = ctx.measureText(line).width - (el.letterSpacing ?? 0);
    let x = el.x;
    if (el.align === "center") x = el.x + (el.w - lw) / 2;
    else if (el.align === "right") x = el.x + el.w - lw;
    ctx.textAlign = "left";
    ctx.fillText(line, x, el.y + lh * i + lh / 2);
  });
  setLetterSpacing(ctx, 0);
}

function shade(hex: string, amt: number): string {
  const n = parseInt(hex.slice(1), 16);
  const f = (c: number) => Math.max(0, Math.min(255, Math.round(c * (1 - amt))));
  const r = f((n >> 16) & 255), g = f((n >> 8) & 255), b = f(n & 255);
  return `rgb(${r},${g},${b})`;
}

function drawImage(ctx: Ctx, el: ImageEl) {
  ctx.save();
  if (el.round) {
    ctx.beginPath();
    ctx.ellipse(el.x + el.w / 2, el.y + el.h / 2, el.w / 2, el.h / 2, 0, 0, Math.PI * 2);
  } else {
    roundRectPath(ctx, el.x, el.y, el.w, el.h, el.radius ?? 0);
  }
  ctx.fillStyle = el.fill;
  ctx.fill();
  ctx.clip();
  // Simple "photo" glyph: sun + mountains, so it reads as an image placeholder.
  const s = Math.min(el.w, el.h);
  const cx = el.x + el.w / 2, cy = el.y + el.h / 2;
  ctx.fillStyle = shade(el.fill, 0.12);
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.32, cy + s * 0.2);
  ctx.lineTo(cx - s * 0.08, cy - s * 0.08);
  ctx.lineTo(cx + s * 0.06, cy + s * 0.06);
  ctx.lineTo(cx + s * 0.16, cy - s * 0.02);
  ctx.lineTo(cx + s * 0.32, cy + s * 0.2);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx + s * 0.14, cy - s * 0.18, s * 0.07, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawStatusBar(ctx: Ctx, el: IconEl) {
  ctx.save();
  ctx.fillStyle = el.color;
  ctx.font = `600 15px ${SCREEN_FONT}, system-ui, sans-serif`;
  ctx.textBaseline = "middle";
  ctx.fillText("9:41", 36, 24);
  // Right-hand indicators sit against the right edge (drawn for a 390px-wide bar, then shifted).
  ctx.translate(el.w - 390, 0);
  // signal bars
  for (let i = 0; i < 4; i++) {
    const h = 4 + i * 2;
    ctx.beginPath();
    ctx.roundRect(300 + i * 5, 29 - h, 3, h, 1);
    ctx.fill();
  }
  // battery
  ctx.strokeStyle = el.color;
  ctx.globalAlpha = 0.45;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(330.5, 18.5, 24, 12, 3.5);
  ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.beginPath();
  ctx.roundRect(332.5, 20.5, 18, 8, 2);
  ctx.fill();
  ctx.beginPath();
  ctx.roundRect(356, 22, 1.5, 5, 1);
  ctx.fill();
  ctx.restore();
}

function drawIcon(ctx: Ctx, el: IconEl) {
  if (el.glyph === "status") return drawStatusBar(ctx, el);
  ctx.save();
  ctx.translate(el.x, el.y);
  ctx.scale(el.w / 24, el.h / 24);
  ctx.strokeStyle = el.color;
  ctx.fillStyle = el.color;
  ctx.lineWidth = 2;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  const p = new Path2D();
  let fill = false;
  switch (el.glyph) {
    case "back": p.moveTo(15, 5); p.lineTo(8, 12); p.lineTo(15, 19); break;
    case "chevron": p.moveTo(9, 5); p.lineTo(16, 12); p.lineTo(9, 19); break;
    case "down": p.moveTo(6, 9); p.lineTo(12, 15); p.lineTo(18, 9); break;
    case "close": p.moveTo(6, 6); p.lineTo(18, 18); p.moveTo(18, 6); p.lineTo(6, 18); break;
    case "plus": p.moveTo(12, 5); p.lineTo(12, 19); p.moveTo(5, 12); p.lineTo(19, 12); break;
    case "check": p.moveTo(5, 12.5); p.lineTo(10, 17); p.lineTo(19, 7); break;
    case "menu": p.moveTo(4, 7); p.lineTo(20, 7); p.moveTo(4, 12); p.lineTo(20, 12); p.moveTo(4, 17); p.lineTo(20, 17); break;
    case "filter": p.moveTo(7, 4); p.lineTo(7, 20); p.moveTo(4, 7); p.lineTo(7, 4); p.lineTo(10, 7); p.moveTo(17, 20); p.lineTo(17, 4); p.moveTo(14, 17); p.lineTo(17, 20); p.lineTo(20, 17); break;
    case "search": p.arc(11, 11, 6.5, 0, Math.PI * 2); p.moveTo(16, 16); p.lineTo(20, 20); break;
    case "home": p.moveTo(4, 11); p.lineTo(12, 4); p.lineTo(20, 11); p.lineTo(20, 20); p.lineTo(4, 20); p.closePath(); break;
    case "user": p.arc(12, 8, 4, 0, Math.PI * 2); p.moveTo(4.5, 20.5); p.bezierCurveTo(5, 16, 8, 14, 12, 14); p.bezierCurveTo(16, 14, 19, 16, 19.5, 20.5); break;
    case "bell": p.moveTo(6, 17); p.lineTo(6, 10.5); p.bezierCurveTo(6, 7, 8.7, 4.5, 12, 4.5); p.bezierCurveTo(15.3, 4.5, 18, 7, 18, 10.5); p.lineTo(18, 17); p.closePath(); p.moveTo(4.5, 17); p.lineTo(19.5, 17); p.moveTo(10, 20); p.lineTo(14, 20); break;
    case "heart": p.moveTo(12, 20); p.bezierCurveTo(5, 15, 3, 11.5, 3, 8.8); p.bezierCurveTo(3, 6, 5.2, 4, 7.6, 4); p.bezierCurveTo(9.5, 4, 11, 5, 12, 6.6); p.bezierCurveTo(13, 5, 14.5, 4, 16.4, 4); p.bezierCurveTo(18.8, 4, 21, 6, 21, 8.8); p.bezierCurveTo(21, 11.5, 19, 15, 12, 20); p.closePath(); break;
    case "settings": p.arc(12, 12, 3, 0, Math.PI * 2); p.moveTo(19, 12); p.arc(12, 12, 7, 0, Math.PI * 2); break;
    case "cart": p.moveTo(3, 4); p.lineTo(6, 4); p.lineTo(8, 15); p.lineTo(18, 15); p.lineTo(20, 7.5); p.lineTo(7, 7.5); p.moveTo(10.5, 19.5); p.arc(9, 19.5, 1.5, 0, Math.PI * 2); p.moveTo(18.5, 19.5); p.arc(17, 19.5, 1.5, 0, Math.PI * 2); break;
    case "star": {
      for (let i = 0; i < 10; i++) {
        const a = -Math.PI / 2 + (i * Math.PI) / 5;
        const r = i % 2 === 0 ? 9 : 4;
        const x = 12 + r * Math.cos(a), y = 12.5 + r * Math.sin(a);
        if (i === 0) p.moveTo(x, y); else p.lineTo(x, y);
      }
      p.closePath(); break;
    }
    case "play": p.moveTo(8, 5); p.lineTo(19, 12); p.lineTo(8, 19); p.closePath(); fill = true; break;
    case "pause": p.rect(6.5, 5, 4, 14); p.rect(13.5, 5, 4, 14); fill = true; break;
    case "skip": p.moveTo(5, 5); p.lineTo(15, 12); p.lineTo(5, 19); p.closePath(); p.rect(16.5, 5, 2.5, 14); fill = true; break;
    case "prev": p.moveTo(19, 5); p.lineTo(9, 12); p.lineTo(19, 19); p.closePath(); p.rect(5, 5, 2.5, 14); fill = true; break;
    case "card": p.roundRect(3, 6, 18, 12, 2); p.moveTo(3, 10); p.lineTo(21, 10); break;
    case "pin": p.moveTo(12, 21); p.bezierCurveTo(7, 15.5, 5, 12.5, 5, 9.5); p.bezierCurveTo(5, 5.6, 8.1, 3, 12, 3); p.bezierCurveTo(15.9, 3, 19, 5.6, 19, 9.5); p.bezierCurveTo(19, 12.5, 17, 15.5, 12, 21); p.closePath(); p.moveTo(14.5, 9.5); p.arc(12, 9.5, 2.5, 0, Math.PI * 2); break;
    case "chat": p.roundRect(3.5, 4.5, 17, 12, 4); p.moveTo(8, 16.5); p.lineTo(7, 20.5); p.lineTo(12, 16.5); break;
    case "chart": p.moveTo(5, 20); p.lineTo(5, 13); p.moveTo(10, 20); p.lineTo(10, 5); p.moveTo(15, 20); p.lineTo(15, 10); p.moveTo(20, 20); p.lineTo(20, 15); break;
    case "mark": p.arc(12, 12, 8, 0, Math.PI * 2); p.moveTo(12, 12); p.lineTo(20, 12); break;
    case "lock": p.roundRect(5, 10.5, 14, 10, 2); p.moveTo(8, 10.5); p.lineTo(8, 7.5); p.bezierCurveTo(8, 5, 10, 3.5, 12, 3.5); p.bezierCurveTo(14, 3.5, 16, 5, 16, 7.5); p.lineTo(16, 10.5); break;
    case "moon": p.moveTo(19, 14.5); p.bezierCurveTo(15, 16, 9, 13, 9.5, 4.5); p.bezierCurveTo(5.5, 6, 3.5, 10, 4.5, 14); p.bezierCurveTo(5.8, 19, 11.5, 21.5, 16, 19); p.bezierCurveTo(17.3, 18, 18.4, 16.4, 19, 14.5); p.closePath(); break;
    case "globe": p.arc(12, 12, 8.5, 0, Math.PI * 2); p.moveTo(3.5, 12); p.lineTo(20.5, 12); p.moveTo(12, 3.5); p.bezierCurveTo(7.5, 8, 7.5, 16, 12, 20.5); p.moveTo(12, 3.5); p.bezierCurveTo(16.5, 8, 16.5, 16, 12, 20.5); break;
    case "shield": p.moveTo(12, 3.5); p.lineTo(19, 6.5); p.lineTo(19, 11.5); p.bezierCurveTo(19, 16, 16, 19, 12, 20.5); p.bezierCurveTo(8, 19, 5, 16, 5, 11.5); p.lineTo(5, 6.5); p.closePath(); break;
    case "logout": p.moveTo(5, 12); p.lineTo(19, 12); p.moveTo(14, 7); p.lineTo(19, 12); p.lineTo(14, 17); break;
    case "bookmark": p.moveTo(6, 4); p.lineTo(18, 4); p.lineTo(18, 20); p.lineTo(12, 15.5); p.lineTo(6, 20); p.closePath(); break;
    case "more": p.arc(5.5, 12, 1.6, 0, Math.PI * 2); p.moveTo(13.6, 12); p.arc(12, 12, 1.6, 0, Math.PI * 2); p.moveTo(20.1, 12); p.arc(18.5, 12, 1.6, 0, Math.PI * 2); fill = true; break;
  }
  if (fill) ctx.fill(p); else ctx.stroke(p);
  ctx.restore();
}

export function drawElement(ctx: Ctx, el: El) {
  switch (el.type) {
    case "rect": return drawRect(ctx, el);
    case "text": return drawText(ctx, el);
    case "image": return drawImage(ctx, el);
    case "icon": return drawIcon(ctx, el);
  }
}

/** Render a resolved screen at the given pixel scale into a new canvas. */
export function renderScreen(screen: Screen, scale = 1): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(screen.width * scale);
  canvas.height = Math.round(screen.height * scale);
  const ctx = canvas.getContext("2d")!;
  ctx.scale(scale, scale);
  ctx.fillStyle = screen.background;
  ctx.fillRect(0, 0, screen.width, screen.height);
  for (const el of screen.elements) drawElement(ctx, el);
  return canvas;
}

export function canvasImageData(canvas: HTMLCanvasElement): ImageData {
  return canvas.getContext("2d", { willReadFrequently: true })!.getImageData(0, 0, canvas.width, canvas.height);
}
