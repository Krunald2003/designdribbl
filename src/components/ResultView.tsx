import { useState } from "react";
import type { Box, Category, FeedbackPoint, ScoreResult, Screen } from "../shared/types";
import { AlertIcon, ArrowLeftIcon, CheckIcon, DiceIcon, MinusIcon, RefreshIcon, ThumbDownIcon, ThumbUpIcon } from "./icons";

const CATS: { key: Category; label: string; weight: string }[] = [
  { key: "layout", label: "Layout", weight: "30%" },
  { key: "spacing", label: "Spacing", weight: "25%" },
  { key: "typography", label: "Typography", weight: "25%" },
  { key: "color", label: "Color", weight: "20%" },
];

export function scoreColor(s: number): string {
  if (s >= 90) return "#137A4B";
  if (s >= 75) return "#4F3BF5";
  if (s >= 50) return "#C27400";
  return "#B42318";
}

function Ring({ value, band }: { value: number; band: string }) {
  const r = 78, c = 2 * Math.PI * r;
  const color = scoreColor(value);
  return (
    <div className="ring" role="img" aria-label={`Overall accuracy ${value} percent: ${band}`}>
      <svg width="180" height="180" viewBox="0 0 180 180">
        <circle cx="90" cy="90" r={r} fill="none" stroke="#EBE8E0" strokeWidth="14" />
        <circle cx="90" cy="90" r={r} fill="none" stroke={color} strokeWidth="14" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - value / 100)} style={{ transition: "stroke-dashoffset .9s cubic-bezier(.2,.7,.2,1)" }} />
      </svg>
      <div className="ring-label">
        <div>
          <div className="ring-value">{value}<small>%</small></div>
          <div className="ring-band" style={{ color }}>{band}</div>
        </div>
      </div>
    </div>
  );
}

function ToneIcon({ tone }: { tone: FeedbackPoint["tone"] }) {
  return (
    <span className={`fb-icon ${tone}`} aria-label={tone === "good" ? "Correct" : tone === "warn" ? "Minor issue" : "Issue"}>
      {tone === "good" ? <CheckIcon size={14} /> : tone === "warn" ? <MinusIcon size={14} /> : <AlertIcon size={13} />}
    </span>
  );
}

type CompareMode = "side" | "overlay";

function Highlights({ boxes, w, h }: { boxes: Box[]; w: number; h: number }) {
  if (!boxes.length) return null;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" aria-hidden="true">
      {boxes.map((b, i) => (
        <rect key={i} x={b.x - 3} y={b.y - 3} width={b.w + 6} height={b.h + 6} rx="4" fill="#4F3BF526" stroke="#4F3BF5" strokeWidth="2" vectorEffect="non-scaling-stroke" />
      ))}
    </svg>
  );
}

function Compare({ screen, refUrl, subUrl, boxes }: { screen: Screen; refUrl: string; subUrl: string; boxes: Box[] }) {
  const [mode, setMode] = useState<CompareMode>("side");
  const [opacity, setOpacity] = useState(50);
  const sideW = 240, overW = 320;
  const dims = (w: number) => ({ width: w, height: Math.round((w * screen.height) / screen.width) });

  return (
    <section className="card compare" aria-labelledby="compare-title">
      <div className="compare-head">
        <h2 id="compare-title">Compare</h2>
        <div className="seg" role="group" aria-label="Compare mode">
          <button type="button" aria-pressed={mode === "side"} onClick={() => setMode("side")}>Side by side</button>
          <button type="button" aria-pressed={mode === "overlay"} onClick={() => setMode("overlay")}>Overlay</button>
        </div>
      </div>
      <div className="compare-body">
        {mode === "side" ? (
          <>
            <div className="compare-col">
              <span>Reference</span>
              <div className="frame" style={dims(sideW)}>
                <img src={refUrl} alt="Reference screen" />
                <Highlights boxes={boxes} w={screen.width} h={screen.height} />
              </div>
            </div>
            <div className="compare-col">
              <span>Yours</span>
              <div className="frame" style={dims(sideW)}>
                <img src={subUrl} alt="Your recreation, scaled to the reference frame" />
                <Highlights boxes={boxes} w={screen.width} h={screen.height} />
              </div>
            </div>
          </>
        ) : (
          <div className="compare-col">
            <span>Reference + yours at {opacity}%</span>
            <div className="frame" style={dims(overW)}>
              <img src={refUrl} alt="Reference screen" />
              <img className="layer" src={subUrl} alt="Your recreation overlaid on the reference" style={{ opacity: opacity / 100 }} />
              <Highlights boxes={boxes} w={screen.width} h={screen.height} />
            </div>
          </div>
        )}
      </div>
      <div className="compare-foot">
        {mode === "overlay" ? (
          <>
            <label htmlFor="opacity">Your layer</label>
            <input id="opacity" type="range" min={0} max={100} value={opacity} onChange={(e) => setOpacity(Number(e.target.value))} />
            <output htmlFor="opacity" style={{ width: 40, textAlign: "right" }}>{opacity}%</output>
          </>
        ) : (
          <span>Hover a feedback point to highlight it on both screens.</span>
        )}
      </div>
    </section>
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

  return (
    <main>
      <div className="result-head">
        <div>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onTryAgain} style={{ marginLeft: -12 }}>
            <ArrowLeftIcon size={16} /> Back to trays
          </button>
          <h1>{screen.app} — {screen.screen}</h1>
          <p>{screen.difficulty} · {screen.width} × {screen.height} px · scored with {score.mode === "ai+pixel" ? "AI vision + pixel measurement" : "pixel measurement"}</p>
        </div>
        <div className="foot-actions">
          <button type="button" className="btn btn-lg" onClick={onTryAgain}><RefreshIcon size={18} /> Try again</button>
          <button type="button" className="btn btn-primary btn-lg" onClick={onRollAgain}><DiceIcon size={18} /> Roll again</button>
        </div>
      </div>

      <div className="result">
        <div>
          <section className="card score-card" aria-label="Scores">
            <Ring value={score.overall} band={score.band} />
            <div className="cat-rows">
              {CATS.map((c) => {
                const s = score.categories[c.key].score;
                return (
                  <div className="cat-row" key={c.key}>
                    <div className="cat-name">{c.label}<small>weight {c.weight}</small></div>
                    <div className="bar" role="progressbar" aria-label={`${c.label} score`} aria-valuenow={s} aria-valuemin={0} aria-valuemax={100}>
                      <span style={{ width: `${s}%`, background: scoreColor(s) }} />
                    </div>
                    <div className="cat-score" style={{ color: scoreColor(s) }}>{s}</div>
                  </div>
                );
              })}
            </div>
          </section>

          <div className="feedback-grid">
            {CATS.map((c) => (
              <section className="card fb-card" key={c.key} aria-labelledby={`fb-${c.key}`}>
                <h3 id={`fb-${c.key}`}>{c.label}<span style={{ color: scoreColor(score.categories[c.key].score) }}>{score.categories[c.key].score}</span></h3>
                <ul className="fb-list">
                  {score.categories[c.key].feedback.map((f, i) => (
                    <li key={i} className="fb-item" tabIndex={0}
                      onMouseEnter={() => setHover(f.boxes ?? [])} onMouseLeave={() => setHover([])}
                      onFocus={() => setHover(f.boxes ?? [])} onBlur={() => setHover([])}>
                      <ToneIcon tone={f.tone} />
                      <span>{f.text}</span>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>

          <section className="card useful" aria-label="Rate this feedback">
            <p>{vote ? "Thanks — that helps us tune the scoring." : "Was this feedback useful?"}</p>
            <div className="thumbs">
              <button type="button" className="btn btn-sm" aria-pressed={vote === "up"} disabled={vote !== null && vote !== "up"} onClick={() => cast("up")}><ThumbUpIcon size={16} /> Yes</button>
              <button type="button" className="btn btn-sm" aria-pressed={vote === "down"} disabled={vote !== null && vote !== "down"} onClick={() => cast("down")}><ThumbDownIcon size={16} /> No</button>
            </div>
          </section>
          {aiNote && <p className="note">{aiNote} This result used pixel measurement only.</p>}
        </div>

        <Compare screen={screen} refUrl={refUrl} subUrl={subUrl} boxes={hover} />
      </div>
    </main>
  );
}
