import { useRef, useState, type DragEvent } from "react";
import { AlertTriangle, Image as ImageIcon, Info, Upload as UploadIcon } from "lucide-react";
import type { Screen } from "../shared/types";
import { FRAME } from "../shared/screens";
import type { Upload } from "../lib/client";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { TrayHeader } from "./ReferenceTray";
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

  const blockedByAspect = Boolean(upload && aspectOff > 0.05 && !stretchAccepted);
  const canSubmit = Boolean(screen && upload && !blockedByAspect && !busy);
  const exact = Boolean(upload && screen && upload.width === screen.width && upload.height === screen.height);
  const factor = upload && screen ? upload.width / screen.width : 1;
  const scaleNote = upload && screen && !exact
    ? Number.isInteger(factor) && aspectOff < 0.001 ? `auto-scaled ${factor}x` : `scaled to ${screen.width} × ${screen.height}`
    : null;

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDrag(false);
    const f = e.dataTransfer.files?.[0];
    if (f && screen) onFile(f);
  };
  const browse = () => input.current?.click();

  return (
    <Card className="min-h-0 flex-1 gap-0 overflow-hidden py-0 shadow-xs" role="region" aria-labelledby="sub-title"
      onDragOver={(e) => { e.preventDefault(); if (screen) setDrag(true); }}
      onDragLeave={(e) => { if (e.currentTarget === e.target) setDrag(false); }}
      onDrop={onDrop}>
      <TrayHeader id="sub-title" kicker="2 · Your recreation" title={upload ? (blockedByAspect ? "Check the frame size" : "Ready to score") : "Upload your PNG or JPG"}>
        {upload && <ZoomControl zoom={zoom} onChange={setZoom} label="Submission" />}
      </TrayHeader>

      <input ref={input} type="file" accept="image/png,image/jpeg" className="sr-only" tabIndex={-1} aria-hidden="true"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ""; }} />

      <div className="flex min-h-0 flex-1 flex-col gap-4 p-5">
        {upload ? (
          <Viewport src={upload.url} width={upload.width} height={upload.height} zoom={zoom} alt="Your uploaded recreation" className="rounded-lg" />
        ) : (
          <button type="button" onClick={browse} disabled={!screen}
            className={cn(
              "flex min-h-0 flex-1 flex-col items-center justify-center gap-3 rounded-lg border-[1.5px] border-dashed border-neutral-300 p-6 text-center transition-colors",
              screen ? "cursor-pointer bg-muted hover:border-neutral-400" : "cursor-not-allowed opacity-75",
              drag && "border-primary bg-accent",
            )}>
            <UploadIcon className="size-7 text-muted-foreground" strokeWidth={1.8} />
            <span className="text-sm font-medium">{screen ? "Drop your PNG or JPG here" : "Roll a screen first"}</span>
            <span className="text-xs text-muted-foreground">
              {screen
                ? <>or <span className="font-medium text-foreground underline underline-offset-4">browse files</span> · export the {screen.width} × {screen.height} frame at 1x</>
                : `PNG or JPG · ${FRAME.width} × ${FRAME.height} · max 10 MB`}
            </span>
          </button>
        )}

        {error && (
          <Alert variant="destructive"><AlertTriangle /><AlertTitle>Upload problem</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>
        )}
        {blockedByAspect && screen && (
          <Alert className="border-amber-200 bg-amber-50">
            <AlertTriangle className="text-warning" />
            <AlertTitle>The image is {(aspectOff * 100).toFixed(1)}% off the {screen.width} × {screen.height} frame</AlertTitle>
            <AlertDescription>
              Set your Figma frame to {screen.width} × {screen.height} and export the frame only, or stretch this image to fit (scores will suffer).
              <div className="mt-2 flex gap-2">
                <Button size="sm" onClick={onAcceptStretch}>Stretch to {screen.width} × {screen.height}</Button>
                <Button size="sm" variant="outline" onClick={browse}>Replace image</Button>
              </div>
            </AlertDescription>
          </Alert>
        )}
        {upload?.type === "image/jpeg" && !blockedByAspect && (
          <Alert><Info /><AlertDescription>JPG compression can blur thin lines and colors. Export as PNG for the most accurate score.</AlertDescription></Alert>
        )}

        {upload && (
          <div className="flex h-13 shrink-0 items-center gap-3 rounded-lg border px-3">
            <span className="flex size-8 items-center justify-center rounded-sm bg-muted"><ImageIcon className="size-4" /></span>
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-sm font-medium">{upload.name}</span>
              <span className="truncate font-mono text-xs text-muted-foreground">
                {upload.width} × {upload.height} · {(upload.bytes / 1024).toFixed(0)} KB{scaleNote ? ` · ${scaleNote}` : ""}
              </span>
            </div>
            {aspectOff > 0.05
              ? <Badge className="rounded-full border-amber-200 bg-amber-50 text-amber-700">{blockedByAspect ? "Size doesn't match" : "Stretched"}</Badge>
              : <Badge className="rounded-full border-transparent bg-green-100 text-green-700">Size matches</Badge>}
            <Button variant="ghost" size="sm" onClick={browse}>Replace</Button>
          </div>
        )}

        <Button size="lg" className="w-full shrink-0" disabled={!canSubmit} onClick={onSubmit}>Get my score</Button>
      </div>
    </Card>
  );
}
