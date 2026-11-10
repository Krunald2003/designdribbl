import { useState } from "react";
import type { Screen } from "../shared/types";
import { FRAME } from "../shared/screens";
import { Dice, DiceIcon, DownloadIcon, RefreshIcon } from "./icons";
import { Viewport, ZoomControl, type Zoom } from "./Viewport";

interface Props {
  screen: Screen | null;
  displayUrl: string | null;
  downloadUrl: string | null;
  rolling: boolean;
  rollingLabel: string;
  onRoll: () => void;
}

export function ReferenceTray({ screen, displayUrl, downloadUrl, rolling, rollingLabel, onRoll }: Props) {
  const [zoom, setZoom] = useState<Zoom>("fit");
  const showScreen = screen && displayUrl && !rolling;

  return (
    <section className="tray" aria-labelledby="ref-title">
      <header className="tray-head">
        <div className="tray-title">
          <div className="tray-kicker">1 · Reference</div>
          <div className="tray-name" id="ref-title">
            {showScreen ? `${screen.app} — ${screen.screen}` : "Your screen to clone"}
          </div>
        </div>
        {showScreen && <ZoomControl zoom={zoom} onChange={setZoom} label="Reference" />}
      </header>

      {showScreen && (
        <div className="tray-meta" aria-label="Screen details">
          <span className="chip">{screen.category}</span>
          <span className="chip">{screen.platform}</span>
          <span className="chip">Frame {screen.width} × {screen.height} px</span>
          <span className={`chip ${screen.difficulty.toLowerCase()}`}>{screen.difficulty}</span>
          <span className="chip">{screen.elements.filter((e) => e.type === "rect" || e.type === "text").length} scored elements</span>
        </div>
      )}

      <Viewport src={showScreen ? displayUrl : undefined} width={screen?.width ?? FRAME.width} height={screen?.height ?? FRAME.height} zoom={zoom} alt={screen ? `Reference screen: ${screen.app} ${screen.screen}` : ""}>
        <div className="empty" aria-live="polite">
          <Dice rolling={rolling} />
          {rolling ? (
            <div className="rolling-label">{rollingLabel}</div>
          ) : (
            <>
              <h2>Roll for a real-world screen</h2>
              <p>You'll get a mobile screen to rebuild in Figma: easy logins up to busy dashboards.</p>
              <button type="button" className="btn btn-primary btn-lg" onClick={onRoll}>
                <DiceIcon /> Roll dice
              </button>
            </>
          )}
        </div>
      </Viewport>

      <footer className="tray-foot">
        <span className="hint">
          {showScreen ? "Images, mascots and icons aren't scored, so placeholders are fine." : "No repeats within a session."}
        </span>
        <div className="foot-actions">
          {showScreen && downloadUrl && (
            <a className="btn btn-ghost btn-sm" href={downloadUrl} download={`designdrbbl-${screen.id}-${screen.width}x${screen.height}.png`}>
              <DownloadIcon size={16} /> PNG
            </a>
          )}
          {showScreen && (
            <button type="button" className="btn btn-sm" onClick={onRoll} disabled={rolling}>
              <RefreshIcon size={16} /> Re-roll
            </button>
          )}
        </div>
      </footer>
    </section>
  );
}
