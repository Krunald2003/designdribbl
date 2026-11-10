import { useState } from "react";
import type { Box, Category, FeedbackPoint, ScoreResult, Screen } from "../shared/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Segmented, useBox } from "./Viewport";

const CATS: { key: Category; label: string; weight: string }[] = [
  { key: "layout", label: "Layout", weight: "30%" },
  { key: "spacing", label: "Spacing", weight: "25%" },
  { key: "typography", label: "Typography", weight: "25%" },
  { key: "color", label: "Color", weight: "20%" },
];

/** Badge colors for the overall band. */
function bandClass(score: number) {
  if (score >= 75) return "bg-green-100 text-green-700";
  if (score >= 50) return "bg-amber-100 text-amber-700";
  return "bg-red-100 text-red-700";
}
/** Category bar color: dark when good, amber when it needs work, red when far off. */
function barClass(score: number) {
  if (score >= 85) return "bg-primary";
  if (score >= 60) return "bg-warning";
  return "bg-destructive";
}

const TONE_ORDER: Record<FeedbackPoint["tone"], number> = { bad: 0, warn: 1, good: 2 };
const TONE_STYLE: Record<FeedbackPoint["tone"], { card: string; dot: string; label: string }> = {
  bad: { card: "border-red-200 bg-red-50", dot: "bg-destructive", label: "Issue" },
  warn: { card: "border-amber-200 bg-amber-50", dot: "bg-warning", label: "Minor issue" },
  good: { card: "", dot: "bg-success", label: "Correct" },
};

function Highlights({ boxes, w, h }: { boxes: Box[]; w: number; h: number }) {
  if (!boxes.length) return null;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" aria-hidden="true" className="pointer-events-none absolute inset-0 size-full">
      {boxes.map((b, i) => (
        <rect key={i} x={b.x - 3} y={b.y - 3} width={b.w + 6} height={b.h + 6} rx="4" fill="rgba(217,119,6,0.12)" stroke="var(--warning)" strokeWidth="2" vectorEffect="non-scaling-stroke" />
      ))}
    </svg>
  );
}

function Frame({ label, src, alt, width, screen, boxes, overlay, opacity }: {
  label: string; src: string; alt: string; width: number; screen: Screen; boxes: Box[]; overlay?: string; opacity?: number;
}) {
  return (
    <div className="flex flex-col items-center gap-2">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <div className="relative overflow-hidden rounded-md bg-white shadow-[0_1px_3px_rgba(0,0,0,0.1)]" style={{ width, height: Math.round((width * screen.height) / screen.width) }}>
        <img src={src} alt={alt} className="absolute inset-0 size-full" />
        {overlay && <img src={overlay} alt="Your recreation overlaid on the reference" className="absolute inset-0 size-full" style={{ opacity: (opacity ?? 50) / 100 }} />}
        <Highlights boxes={boxes} w={screen.width} h={screen.height} />
      </div>
    </div>
  );
}

function Compare({ screen, refUrl, subUrl, boxes }: { screen: Screen; refUrl: string; subUrl: string; boxes: Box[] }) {
  const [mode, setMode] = useState<"side" | "overlay">("side");
  const [opacity, setOpacity] = useState(50);
  // Size the screens to the space the panel has: never wider/taller than fits (no scrolling), max 360px wide.
  const [bodyRef, box] = useBox<HTMLDivElement>();
  const frameW = (n: number) => {
    const byW = (box.w - 40 - (n - 1) * 24) / n;      // padding 20 each side, 24px gap
    const byH = ((box.h - 40 - 24) * screen.width) / screen.height; // minus padding and the label row
    return Math.max(60, Math.floor(Math.min(byW, byH, 360)));
  };
  return (
    <Card className="min-h-0 min-w-0 flex-1 gap-0 overflow-hidden py-0 shadow-xs" role="region" aria-labelledby="compare-title">
      <header className="flex h-14 shrink-0 items-center justify-between border-b px-5">
        <h2 id="compare-title" className="text-sm font-semibold">Compare</h2>
        <Segmented value={mode} onChange={setMode} label="Compare mode" options={[["side", "Side by side"], ["overlay", "Overlay"]]} />
      </header>
      <div ref={bodyRef} className="flex min-h-0 flex-1 items-center justify-center gap-6 overflow-hidden bg-muted p-5">
        {mode === "side" ? (
          <>
            <Frame label="Reference" src={refUrl} alt="Reference screen" width={frameW(2)} screen={screen} boxes={boxes} />
            <Frame label="Yours" src={subUrl} alt="Your recreation, scaled to the reference frame" width={frameW(2)} screen={screen} boxes={boxes} />
          </>
        ) : (
          <Frame label={`Reference + yours at ${opacity}%`} src={refUrl} alt="Reference screen" overlay={subUrl} opacity={opacity} width={frameW(1)} screen={screen} boxes={boxes} />
        )}
      </div>
      <footer className="flex h-11 shrink-0 items-center gap-3 border-t px-5 text-xs text-muted-foreground">
        {mode === "overlay" ? (
          <>
            <label htmlFor="opacity" className="font-medium text-foreground">Your layer</label>
            <input id="opacity" type="range" min={0} max={100} value={opacity} onChange={(e) => setOpacity(Number(e.target.value))} className="flex-1 accent-primary" />
            <output htmlFor="opacity" className="w-9 text-right font-mono">{opacity}%</output>
          </>
        ) : (
          <span>Hover a feedback point to highlight it on both screens.</span>
        )}
      </footer>
    </Card>
  );
}

interface Props {
  screen: Screen;
  score: ScoreResult;
  refUrl: string;
  subUrl: string;
  aiNote: string | null;
  onTryAgain: () => void;
  onRollAgain: () => void;
  onFeedback: (v: "up" | "down") => void;
}

export function ResultView({ screen, score, refUrl, subUrl, aiNote, onTryAgain, onRollAgain, onFeedback }: Props) {
  const [hover, setHover] = useState<Box[]>([]);
  const [vote, setVote] = useState<"up" | "down" | null>(null);
  const cast = (v: "up" | "down") => { if (vote) return; setVote(v); onFeedback(v); };

  const points = CATS.flatMap((c) => score.categories[c.key].feedback.map((f) => ({ ...f, cat: c.label })))
    .sort((a, b) => TONE_ORDER[a.tone] - TONE_ORDER[b.tone]);

  return (
    <main className="flex min-h-0 flex-1 gap-6 px-8 pt-6 pb-8 [@media(max-height:820px)]:pt-4 [@media(max-height:820px)]:pb-5">
      {/* Score */}
      <div className="flex w-[360px] shrink-0 flex-col gap-4 overflow-y-auto">
        <Card className="gap-5 p-6 shadow-xs" role="region" aria-label="Scores">
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium text-muted-foreground">{screen.app} — {screen.screen} · {screen.difficulty}</span>
            <h1 className="text-sm font-semibold">Your accuracy</h1>
          </div>
          <div className="flex items-end gap-3" role="img" aria-label={`Overall accuracy ${score.overall} percent: ${score.band}`}>
            <span className="text-7xl leading-none font-bold tracking-tighter [@media(max-height:760px)]:text-5xl">{score.overall}%</span>
            <Badge className={cn("mb-2 rounded-full border-transparent font-semibold", bandClass(score.overall))}>{score.band}</Badge>
          </div>
          <div className="flex flex-col gap-3.5">
            {CATS.map((c) => {
              const s = score.categories[c.key].score;
              return (
                <div key={c.key} className="flex flex-col gap-1.5">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">{c.label} <span className="font-normal text-muted-foreground">· {c.weight}</span></span>
                    <span className="font-mono">{s}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted" role="progressbar" aria-label={`${c.label} score`} aria-valuenow={s} aria-valuemin={0} aria-valuemax={100}>
                    <div className={cn("h-1.5 rounded-full transition-[width] duration-700", barClass(s))} style={{ width: `${s}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
        <div className="flex gap-2">
          <Button variant="outline" size="lg" className="flex-1" onClick={onTryAgain}>Try again</Button>
          <Button size="lg" className="flex-1" onClick={onRollAgain}>Roll again</Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Scored with {score.mode === "ai+pixel" ? "AI vision + pixel measurement" : "pixel measurement"}.
          {aiNote ? ` ${aiNote} This result used pixel measurement only.` : ""}
        </p>
      </div>

      {/* Compare */}
      <Compare screen={screen} refUrl={refUrl} subUrl={subUrl} boxes={hover} />

      {/* Feedback */}
      <div className="flex w-[340px] shrink-0 flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Feedback</h2>
          <span className="text-xs text-muted-foreground">Hover to highlight</span>
        </div>
        <ul className="flex min-h-0 flex-1 flex-col gap-3 overflow-auto pr-1 [scrollbar-color:var(--border)_transparent] [scrollbar-width:thin]">
          {points.map((f, i) => {
            const t = TONE_STYLE[f.tone];
            return (
              <li key={i} tabIndex={0}
                onMouseEnter={() => setHover(f.boxes ?? [])} onMouseLeave={() => setHover([])}
                onFocus={() => setHover(f.boxes ?? [])} onBlur={() => setHover([])}
                className={cn("flex gap-3 rounded-lg border p-3.5 outline-none transition-shadow hover:shadow-sm focus-visible:ring-[3px] focus-visible:ring-ring/50", t.card)}>
                <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", t.dot)} aria-label={t.label} />
                <div className="flex flex-col gap-1">
                  <span className="text-sm font-semibold">{f.cat}</span>
                  <span className="text-sm leading-5 text-neutral-600">{f.text}</span>
                </div>
              </li>
            );
          })}
        </ul>
        <div className="flex shrink-0 items-center justify-between rounded-lg border px-3.5 py-3" role="region" aria-label="Rate this feedback">
          <span className="text-sm">{vote ? "Thanks — that helps us tune the scoring." : "Was this feedback useful?"}</span>
          {!vote && (
            <div className="flex gap-1.5">
              <Button variant="outline" size="xs" onClick={() => cast("up")}>Yes</Button>
              <Button variant="outline" size="xs" onClick={() => cast("down")}>No</Button>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
