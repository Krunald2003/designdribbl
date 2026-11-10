import { useEffect, useRef } from "react";
import { CheckIcon } from "./icons";

export const SCORING_STEPS = [
  "Scaling your image to the frame",
  "Finding elements with AI vision",
  "Measuring color, type and spacing",
  "Writing your feedback",
];

export function ScoringOverlay({ step, ai }: { step: number; ai: boolean }) {
  const card = useRef<HTMLDivElement>(null);
  useEffect(() => { card.current?.focus(); }, []);
  const steps = ai ? SCORING_STEPS : SCORING_STEPS.map((s, i) => (i === 1 ? "Locating elements by pixel analysis" : s));
  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-labelledby="scoring-title">
      <div className="overlay-card" ref={card} tabIndex={-1}>
        <h2 id="scoring-title">Scoring your recreation</h2>
        <p>This usually takes {ai ? "10–20" : "a few"} seconds.</p>
        <ol className="progress-list" aria-live="polite">
          {steps.map((s, i) => (
            <li key={s} className={i < step ? "done" : i === step ? "active" : ""}>
              <span className="pstate">{i < step && <CheckIcon size={12} />}</span>
              {s}
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
