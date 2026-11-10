import { useState } from "react";
import { Dice5, Download, RefreshCw } from "lucide-react";
import type { Screen } from "../shared/types";
import { FRAME } from "../shared/screens";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Viewport, ZoomControl, type Zoom } from "./Viewport";

interface Props {
  screen: Screen | null;
  displayUrl: string | null;
  downloadUrl: string | null;
  rolling: boolean;
  rollingLabel: string;
  onRoll: () => void;
}

/** Shared card header: small kicker line, bold title, optional actions on the right. */
export function TrayHeader({ kicker, title, id, children }: { kicker: string; title: string; id: string; children?: React.ReactNode }) {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b px-5">
      <div className="flex min-w-0 flex-col">
        <span className="text-xs font-medium text-muted-foreground">{kicker}</span>
        <span className="truncate text-sm font-semibold" id={id}>{title}</span>
      </div>
      {children && <div className="flex items-center gap-2">{children}</div>}
    </header>
  );
}

export function ReferenceTray({ screen, displayUrl, downloadUrl, rolling, rollingLabel, onRoll }: Props) {
  const [zoom, setZoom] = useState<Zoom>("fit");
  const showScreen = screen && displayUrl && !rolling;

  return (
    <Card className="min-h-0 flex-1 gap-0 overflow-hidden py-0 shadow-xs" aria-labelledby="ref-title" role="region">
      <TrayHeader id="ref-title"
        kicker={showScreen ? `1 · Reference · ${screen.difficulty} · ${screen.width} × ${screen.height}` : "1 · Reference"}
        title={showScreen ? `${screen.app} — ${screen.screen}` : "Your screen to clone"}>
        {showScreen && (
          <>
            <ZoomControl zoom={zoom} onChange={setZoom} label="Reference" />
            {downloadUrl && (
              <Button variant="outline" size="sm" asChild>
                <a href={downloadUrl} download={`designdrbbl-${screen.id}-${screen.width}x${screen.height}.png`}>
                  <Download /> PNG
                </a>
              </Button>
            )}
            <Button variant="secondary" size="sm" onClick={onRoll} disabled={rolling}>
              <RefreshCw /> Re-roll
            </Button>
          </>
        )}
      </TrayHeader>

      <Viewport src={showScreen ? displayUrl : undefined} width={screen?.width ?? FRAME.width} height={screen?.height ?? FRAME.height} zoom={zoom}
        alt={screen ? `Reference screen: ${screen.app} ${screen.screen}` : ""}>
        <div className="flex h-full flex-col items-center justify-center gap-4 p-6 text-center" aria-live="polite">
          <div className={cn("flex size-16 items-center justify-center rounded-2xl border bg-background shadow-xs", rolling && "animate-tumble")} aria-hidden="true">
            <Dice5 className="size-8" strokeWidth={1.8} />
          </div>
          {rolling ? (
            <span className="text-sm font-medium text-muted-foreground">{rollingLabel}</span>
          ) : (
            <>
              <div className="flex flex-col items-center gap-1">
                <h2 className="text-xl font-semibold tracking-tight">Roll for a real-world screen</h2>
                <p className="w-80 text-sm text-muted-foreground">You'll get a mobile screen to rebuild in Figma: easy logins up to busy dashboards.</p>
              </div>
              <Button size="lg" onClick={onRoll}>Roll the dice</Button>
              <span className="text-xs text-muted-foreground">No repeats within a session.</span>
            </>
          )}
        </div>
      </Viewport>
      {showScreen && (
        <p className="shrink-0 border-t bg-muted px-5 py-2 text-xs text-muted-foreground">
          Images, mascots and icons aren't scored, so placeholders are fine.
        </p>
      )}
    </Card>
  );
}
