import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FRAME } from "../shared/screens";

const ROWS = [
  ["30%", "Layout", "Every element is present, in the right place and size."],
  ["25%", "Spacing", "Gaps, insets and centering. Within ±2px gets full credit."],
  ["25%", "Typography", "Font size, weight and line height."],
  ["20%", "Color", "Background, fills, borders and text (ΔE 2000)."],
];

export function HowDialog({ open, onOpenChange, ai }: { open: boolean; onOpenChange: (o: boolean) => void; ai: boolean }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-5 sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>How scoring works</DialogTitle>
          <DialogDescription>
            Your recreation is measured against the reference in four categories{ai ? ", with AI vision helping find each element" : ""}. The same upload always gets the same score.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col rounded-lg border">
          {ROWS.map(([w, name, desc], i) => (
            <div key={name} className={`flex gap-3 px-3.5 py-3 ${i ? "border-t" : ""}`}>
              <span className="w-9 shrink-0 font-mono text-[13px]">{w}</span>
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-semibold">{name}</span>
                <span className="text-[13px] text-muted-foreground">{desc}</span>
              </div>
            </div>
          ))}
        </div>
        <p className="text-[13px] leading-5 text-muted-foreground">
          Bands: 90–100 Pixel perfect · 75–89 Very close · 50–74 Getting there · below 50 Keep practising.
          Images, patterns and mascots aren't scored, so placeholders are fine. Use a {FRAME.width} × {FRAME.height} frame and Inter for all text. {ai ? "Your upload is analysed in memory and never stored." : "Your upload never leaves your browser."}
        </p>
        <DialogFooter>
          <DialogClose asChild><Button>Got it</Button></DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
