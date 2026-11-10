import { useCallback, useEffect, useRef, useState } from "react";
import { SCREENS } from "./shared/screens";
import type { Screen, ScoreResult } from "./shared/types";
import { canvasImageData, ensureFonts, renderScreen, resolveScreen } from "./lib/render";
import { scoreSubmission } from "./lib/scoring/engine";
import { STATIC, aspectDiff, extract, getHealth, loadUpload, normalize, track, type Health, type Upload } from "./lib/client";
import { ReferenceTray } from "./components/ReferenceTray";
import { SubmissionTray } from "./components/SubmissionTray";
import { ScoringOverlay } from "./components/ScoringOverlay";
import { ResultView } from "./components/ResultView";
import { HowDialog } from "./components/HowDialog";
import { InfoIcon, Logo } from "./components/icons";

interface Reference { screen: Screen; displayUrl: string; downloadUrl: string; data: ImageData }
interface Result { score: ScoreResult; subUrl: string; aiNote: string | null }

const ROLL_MS = 1100;
const SEEN_KEY = "figiman.seen";
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

function loadSeen(): Set<string> {
  try { return new Set(JSON.parse(sessionStorage.getItem(SEEN_KEY) ?? "[]")); } catch { return new Set(); }
}
function saveSeen(s: Set<string>) {
  try { sessionStorage.setItem(SEEN_KEY, JSON.stringify([...s])); } catch { /* ignore */ }
}

async function buildReference(spec: Screen): Promise<Reference> {
  await ensureFonts();
  const screen = resolveScreen(spec);
  const one = renderScreen(screen, 1);
  const two = renderScreen(screen, 2);
  return { screen, displayUrl: two.toDataURL("image/png"), downloadUrl: one.toDataURL("image/png"), data: canvasImageData(one) };
}

export default function App() {
  const [health, setHealth] = useState<Health>({ ok: false, ai: false, model: null });
  const [ref, setRef] = useState<Reference | null>(null);
  const [rolling, setRolling] = useState(false);
  const [rollingLabel, setRollingLabel] = useState("");
  const [upload, setUpload] = useState<Upload | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [stretch, setStretch] = useState(false);
  const [scoringStep, setScoringStep] = useState<number | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const seen = useRef<Set<string>>(loadSeen());
  const how = useRef<HTMLDialogElement>(null);

  useEffect(() => { getHealth().then(setHealth); track("visit"); }, []);

  const roll = useCallback(async () => {
    if (rolling) return;
    setRolling(true);
    setResult(null);
    const current = ref?.screen.id;
    let pool = SCREENS.filter((s) => !seen.current.has(s.id) && s.id !== current);
    if (pool.length === 0) { seen.current = new Set(current ? [current] : []); pool = SCREENS.filter((s) => s.id !== current); }
    const pick = pool[Math.floor(Math.random() * pool.length)];
    seen.current.add(pick.id);
    saveSeen(seen.current);

    const ticker = setInterval(() => {
      const s = SCREENS[Math.floor(Math.random() * SCREENS.length)];
      setRollingLabel(`${s.category} · ${s.screen}`);
    }, 90);
    const [built] = await Promise.all([buildReference(pick), wait(ROLL_MS)]);
    clearInterval(ticker);
    setRef(built);
    setRolling(false);
    track("roll", pick.id);
  }, [rolling, ref]);

  const onFile = useCallback(async (file: File) => {
    setUploadError(null);
    try {
      const u = await loadUpload(file);
      if (upload) URL.revokeObjectURL(upload.url);
      setUpload(u);
      setStretch(false);
      track("upload", ref?.screen.id);
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : "Upload failed.");
    }
  }, [upload, ref]);

  const aspectOff = upload && ref ? aspectDiff(upload.width, upload.height, ref.screen.width, ref.screen.height) : 0;

  const getResult = useCallback(async () => {
    if (!ref || !upload) return;
    const { screen } = ref;
    track("submit", screen.id);
    const started = Date.now();
    setScoringStep(0);
    await wait(250);
    const canvas = normalize(upload.image, screen.width, screen.height);
    const subUrl = canvas.toDataURL("image/png");
    const subData = canvasImageData(canvas);

    setScoringStep(1);
    let ai = null;
    let aiNote: string | null = null;
    if (health.ai) {
      const r = await extract(screen.id, subUrl);
      if (r.data) ai = r.data; else aiNote = r.error ?? "AI scoring was unavailable.";
    } else {
      await wait(400);
    }

    setScoringStep(2);
    await wait(60);
    let score: ScoreResult;
    try {
      score = scoreSubmission({ screen, reference: ref.data, submission: subData, ai });
    } catch (e) {
      setScoringStep(null);
      setUploadError(e instanceof Error ? e.message : "Scoring failed.");
      return;
    }
    setScoringStep(3);
    await wait(Math.max(300, 1600 - (Date.now() - started)));
    setResult({ score, subUrl, aiNote });
    setScoringStep(null);
    track("result", screen.id, score.overall);
    window.scrollTo({ top: 0 });
  }, [ref, upload, health.ai]);

  const tryAgain = () => {
    track("try_again", ref?.screen.id);
    setResult(null);
    if (upload) URL.revokeObjectURL(upload.url);
    setUpload(null);
    setStretch(false);
  };
  const rollAgain = () => {
    track("roll_again", ref?.screen.id);
    tryAgain();
    void roll();
  };

  return (
    <>
      <div className="desktop-only" role="alert">
        <div>
          <Logo />
          <h1>Figiman works on desktop</h1>
          <p>Recreating screens in Figma needs a big screen. Open Figiman in a browser window at least 1280px wide.</p>
        </div>
      </div>

      <div className="app">
        <header className="topbar">
          <button type="button" className="brand" onClick={() => result && tryAgain()} aria-label="Figiman home">
            <Logo /> Figiman
          </button>
          <div className="topbar-right">
            <span className="mode-chip" title={health.ai ? `AI vision: ${health.model}` : "Set ANTHROPIC_API_KEY on the server to enable AI vision."}>
              <span className={`mode-dot${health.ai ? " on" : ""}`} />
              {health.ai ? "AI scoring on" : "Pixel scoring"}
            </span>
            <button type="button" className="btn btn-sm" onClick={() => how.current?.showModal()}>
              <InfoIcon size={16} /> How scoring works
            </button>
          </div>
        </header>

        {result && ref ? (
          <ResultView
            screen={ref.screen}
            score={result.score}
            refUrl={ref.displayUrl}
            subUrl={result.subUrl}
            aiNote={result.aiNote}
            onTryAgain={tryAgain}
            onRollAgain={rollAgain}
            onFeedback={(v) => track("feedback", ref.screen.id, v)}
          />
        ) : (
          <main style={{ display: "flex", flexDirection: "column", flex: 1 }}>
            <section className="hero">
              <div>
                <h1>Clone real app screens. Get a <em>pixel-level</em> score.</h1>
                <p>Practise UI fundamentals with instant feedback on color, typography, spacing and layout.</p>
              </div>
              <ol className="steps" aria-label="How it works">
                <li className="step"><span className="step-n">1</span><div><b>Roll a screen</b><span>Get a random app screen</span></div></li>
                <li className="step"><span className="step-n">2</span><div><b>Rebuild in Figma</b><span>Same frame size</span></div></li>
                <li className="step"><span className="step-n">3</span><div><b>Upload & score</b><span>See where you're off</span></div></li>
              </ol>
            </section>
            <div className="trays">
              <ReferenceTray screen={ref?.screen ?? null} displayUrl={ref?.displayUrl ?? null} downloadUrl={STATIC ? null : ref?.downloadUrl ?? null} rolling={rolling} rollingLabel={rollingLabel} onRoll={roll} />
              <SubmissionTray screen={ref?.screen ?? null} upload={upload} error={uploadError} aspectOff={aspectOff} stretchAccepted={stretch} onFile={onFile} onAcceptStretch={() => setStretch(true)} onSubmit={getResult} busy={scoringStep !== null || rolling} />
            </div>
          </main>
        )}
      </div>

      {scoringStep !== null && <ScoringOverlay step={scoringStep} ai={health.ai} />}
      <HowDialog ref={how} ai={health.ai} />
    </>
  );
}
