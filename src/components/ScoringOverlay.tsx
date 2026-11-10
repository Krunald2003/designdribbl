import { Check, Circle, LoaderCircle } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

const STEPS = [
  "Scaling your image to the frame",
  "Finding elements with AI vision",
  "Measuring color, type and spacing",
  "Writing your feedback",
];

export function ScoringOverlay({ step, ai }: { step: number; ai: boolean }) {
  const steps = ai ? STEPS : STEPS.map((s, i) => (i === 1 ? "Locating elements by pixel analysis" : s));
  return (
    <Dialog open>
      <DialogContent showCloseButton={false} className="gap-5 sm:max-w-[420px]"
        onEscapeKeyDown={(e) => e.preventDefault()} onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Scoring your recreation</DialogTitle>
          <DialogDescription>This takes {ai ? "10–20" : "a few"} seconds.</DialogDescription>
        </DialogHeader>
        <Progress value={Math.min(100, ((step + 0.5) / steps.length) * 100)} className="h-2" />
        <ol className="flex flex-col gap-2.5 text-sm" aria-live="polite">
          {steps.map((s, i) => (
            <li key={s} className={cn("flex items-center gap-2.5", i > step && "text-muted-foreground", i === step && "font-medium")}>
              {i < step ? <Check className="size-4 text-success" strokeWidth={2.5} />
                : i === step ? <LoaderCircle className="size-4 animate-spin" strokeWidth={2.5} />
                : <Circle className="size-4 text-ring" />}
              {s}
            </li>
          ))}
        </ol>
      </DialogContent>
    </Dialog>
  );
}
