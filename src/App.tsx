import { useCallback, useEffect, useRef, useState } from "react";
import { SCREENS } from "./shared/screens";
import type { Screen, ScoreResult } from "./shared/types";
import { canvasImageData, ensureFonts, renderScreen, resolveScreen } from "./lib/render";
import { scoreSubmission } from "./lib/scoring/engine";
import { NO_DOWNLOAD, aspectDiff, extract, getHealth, loadUpload, normalize, track, type Health, type Upload } from "./lib/client";
import { ReferenceTray } from "./components/ReferenceTray";
import { SubmissionTray } from "./components/SubmissionTray";
import { ScoringOverlay } from "./components/ScoringOverlay";
import { ResultView } from "./components/ResultView";
import { HowDialog } from "./components/HowDialog";
import { Logo } from "./components/icons";
import { Check, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface Reference { screen: Screen; displayUrl: string; downloadUrl: string; data: ImageData }
interface Result { score: ScoreResult; subUrl: string; aiNote: string | null }

const ROLL_MS = 1100;
const SEEN_KEY = "designdrbbl.seen";
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
  const [howOpen, setHowOpen] = useState(false);

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

  // Step indicator: 0 = roll, 1 = rebuild, 2 = upload & score
  const activeStep = !ref ? 0 : !upload ? 1 : 2;
  const steps = [
    ["Roll a screen", "Random app screen"],
    ["Rebuild in Figma", `${ref?.screen.width ?? 360} × ${ref?.screen.height ?? 800} frame`],
    ["Upload & score", "See where you're off"],
  ];

  return (
    <>
      {/* Below 1280px: desktop-only message */}
      <div className="fixed inset-0 z-50 hidden items-center justify-center bg-muted p-8 max-[1279px]:flex" role="alert">
        <Card className="w-[420px] items-center gap-4 p-8 text-center shadow-xs">
          <Logo />
          <h1 className="text-xl font-semibold tracking-tight">designdrbbl works on desktop</h1>
          <p className="text-sm text-muted-foreground">Recreating screens in Figma needs a big screen. Open designdrbbl in a browser window at least 1280px wide.</p>
        </Card>
      </div>

      <div className="flex h-screen min-h-[720px] flex-col max-[1279px]:hidden">
        <header className="flex h-16 shrink-0 items-center justify-between border-b px-8">
          <button type="button" className="flex items-center gap-2.5" onClick={() => result && tryAgain()} aria-label="designdrbbl home">
            <Logo /> <span className="text-[17px] font-semibold tracking-tight">designdrbbl</span>
          </button>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="h-6 gap-1.5 rounded-full px-2.5 font-medium text-muted-foreground"
              title={health.ai ? `AI vision: ${health.model}` : "Scored by pixel measurement in your browser."}>
              <span className="size-1.5 rounded-full bg-success" />
              {health.ai ? "AI scoring on" : "Pixel scoring"}
            </Badge>
            <Button variant="outline" size="sm" onClick={() => setHowOpen(true)}>
              <Info /> How scoring works
            </Button>
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
          <main className="flex min-h-0 flex-1 flex-col">
            <section className="flex shrink-0 items-end justify-between gap-8 px-8 pt-8 pb-6">
              <div className="flex max-w-[820px] flex-col gap-2">
                <h1 className="text-4xl font-bold tracking-tight">Clone real app screens. Get a pixel-level score.</h1>
                <p className="text-base text-muted-foreground">Practise UI fundamentals with instant feedback on color, typography, spacing and layout.</p>
              </div>
              <ol className="flex shrink-0 gap-6" aria-label="How it works">
                {steps.map(([title, sub], i) => (
                  <li key={title} className="flex items-center gap-2.5" aria-current={i === activeStep ? "step" : undefined}>
                    <span className={cn("flex size-6 items-center justify-center rounded-full text-xs font-semibold",
                      i < activeStep ? "bg-success text-white" : i === activeStep ? "bg-primary text-primary-foreground" : "bg-muted")}>
                      {i < activeStep ? <Check className="size-3.5" strokeWidth={3} /> : i + 1}
                    </span>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">{title}</span>
                      <span className="text-xs text-muted-foreground">{sub}</span>
                    </div>
                  </li>
                ))}
              </ol>
            </section>
            <div className="flex min-h-0 flex-1 gap-6 px-8 pb-8">
              <ReferenceTray screen={ref?.screen ?? null} displayUrl={ref?.displayUrl ?? null} downloadUrl={NO_DOWNLOAD ? null : ref?.downloadUrl ?? null} rolling={rolling} rollingLabel={rollingLabel} onRoll={roll} />
              <SubmissionTray screen={ref?.screen ?? null} upload={upload} error={uploadError} aspectOff={aspectOff} stretchAccepted={stretch} onFile={onFile} onAcceptStretch={() => setStretch(true)} onSubmit={getResult} busy={scoringStep !== null || rolling} />
            </div>
          </main>
        )}
      </div>

      {scoringStep !== null && <ScoringOverlay step={scoringStep} ai={health.ai} />}
      <HowDialog open={howOpen} onOpenChange={setHowOpen} ai={health.ai} />
    </>
  );
}
