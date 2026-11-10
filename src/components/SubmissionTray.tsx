import { useRef, useState, type DragEvent } from "react";
import type { Screen } from "../shared/types";
import { FRAME } from "../shared/screens";
import type { Upload } from "../lib/client";
import { AlertIcon, InfoIcon, RefreshIcon, UploadIcon } from "./icons";
import { Viewport, ZoomControl, type Zoom } from "./Viewport";

interface Props {
  screen: Screen | null;
  upload: Upload | null;
  error: string | null;
  aspectOff: number; // relative difference, 0..1
  stretchAccepted: boolean;
  onFile: (f: File) => void;
  onAcceptStretch: () => void;
  onSubmit: () => void;
  busy: boolean;
}

export function SubmissionTray({ screen, upload, error, aspectOff, stretchAccepted, onFile, onAcceptStretch, onSubmit, busy }: Props) {
  const [zoom, setZoom] = useState<Zoom>("fit");
  const [drag, setDrag] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  const blockedByAspect = upload && aspectOff > 0.05 && !stretchAccepted;
  const canSubmit = Boolean(screen && upload && !blockedByAspect && !busy);
  const reason = !screen ? "Roll a screen first" : !upload ? "Upload your PNG or JPG" : blockedByAspect ? "Fix the aspect ratio first" : "";

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDrag(false);
    const f = e.dataTransfer.files?.[0];
    if (f) onFile(f);
  };
  const browse = () => input.current?.click();
  const scaleNote = upload && screen && aspectOff <= 0.05 && (upload.width !== screen.width || upload.height !== screen.height);

  return (
    <section className="tray" aria-labelledby="sub-title" onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={(e) => { if (e.currentTarget === e.target) setDrag(false); }} onDrop={onDrop}>
      <header className="tray-head">
        <div className="tray-title">
          <div className="tray-kicker">2 · Your recreation</div>
          <div className="tray-name" id="sub-title">{upload ? upload.name : "Drop your Figma export"}</div>
        </div>
        {upload && <ZoomControl zoom={zoom} onChange={setZoom} label="Submission" />}
      </header>

      <input ref={input} type="file" accept="image/png,image/jpeg" className="sr-only" tabIndex={-1} aria-hidden="true"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ""; }} />

      {upload && (
        <div className="tray-meta">
          <span className="chip">{upload.width} × {upload.height} px</span>
          <span className="chip">{(upload.bytes / 1024).toFixed(0)} KB</span>
          {screen && <span className="chip">Target {screen.width} × {screen.height}</span>}
        </div>
      )}

      {error && (
        <div className="banner error" role="alert"><AlertIcon /><div>{error}</div></div>
      )}
      {blockedByAspect && screen && (
        <div className="banner warn" role="alert">
          <AlertIcon />
          <div>
            <b>Aspect ratio is {(aspectOff * 100).toFixed(1)}% off the reference.</b>
            Set your Figma frame to {screen.width} × {screen.height} and export the frame only. Or auto-scale this image to fit (it may look stretched, and scores will suffer).
            <div className="banner-actions">
              <button type="button" className="btn btn-sm btn-dark" onClick={onAcceptStretch}>Auto-scale to {screen.width} × {screen.height}</button>
              <button type="button" className="btn btn-sm" onClick={browse}>Replace image</button>
            </div>
          </div>
        </div>
      )}
      {(scaleNote || (stretchAccepted && upload)) && screen && !blockedByAspect && (
        <div className="banner info"><InfoIcon /><div>We'll scale your image to {screen.width} × {screen.height} before scoring.{upload?.type === "image/jpeg" ? " Tip: PNG gives more accurate color scores than JPG." : ""}</div></div>
      )}
      {upload?.type === "image/jpeg" && !scaleNote && !stretchAccepted && !blockedByAspect && (
        <div className="banner info"><InfoIcon /><div>JPG compression can blur thin lines and colors. Export as PNG for the most accurate score.</div></div>
      )}

      <Viewport src={upload?.url} width={upload?.width ?? FRAME.width} height={upload?.height ?? FRAME.height} zoom={zoom} alt="Your uploaded recreation">
        <div className={`dropzone${drag ? " drag" : ""}`}>
          <div className="drop-icon"><UploadIcon size={24} /></div>
          <h2>Drop your PNG or JPG here</h2>
          <p>or <button type="button" className="btn btn-sm btn-ghost" style={{ color: "var(--accent)", padding: "0 4px" }} onClick={browse}>browse files</button> · max 10 MB</p>
          <div className="guide">
            <b>Export from Figma</b>
            <ol>
              <li>Set the frame to {screen ? `${screen.width} × ${screen.height}` : "the reference size"}.</li>
              <li>Select the frame and export it at 1x as PNG.</li>
              <li>Don't add a background outside the frame.</li>
            </ol>
          </div>
        </div>
      </Viewport>

      <footer className="tray-foot">
        <div className="foot-actions">
          {upload && <button type="button" className="btn btn-sm" onClick={browse}><RefreshIcon size={16} /> Replace</button>}
          {!upload && <span className="hint">Use the font Inter for all text.</span>}
        </div>
        <div className="foot-actions">
          {!canSubmit && reason && <span className="hint" id="submit-reason">{reason}</span>}
          <button type="button" className="btn btn-primary btn-lg" disabled={!canSubmit} aria-describedby={!canSubmit ? "submit-reason" : undefined} onClick={onSubmit}>
            Get result
          </button>
        </div>
      </footer>
    </section>
  );
}
