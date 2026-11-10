import { forwardRef } from "react";

export const HowDialog = forwardRef<HTMLDialogElement, { ai: boolean }>(function HowDialog({ ai }, ref) {
  const close = () => (ref as React.RefObject<HTMLDialogElement>).current?.close();
  return (
    <dialog ref={ref} aria-labelledby="how-title" onClick={(e) => { if (e.target === e.currentTarget) close(); }}>
      <div className="dialog-body">
        <h2 id="how-title">How scoring works</h2>
        <p>
          Every screen has a fixed reference spec: exact colors, font sizes and weights, spacing and element boxes.
          We scale your export to the reference frame, locate each element{ai ? " (AI vision helps find them and reads your text)" : ""},
          then measure it the same way we measure the reference. Scores come from fixed rules, not opinion, so the same upload always gets the same score.
        </p>
        <table>
          <thead><tr><th>Category</th><th>Weight</th><th>What's checked</th></tr></thead>
          <tbody>
            <tr><td>Layout</td><td>30%</td><td>Every element is present, in the right place and the right size.</td></tr>
            <tr><td>Spacing</td><td>25%</td><td>Gaps, insets and centering. Within ±2px gets full credit.</td></tr>
            <tr><td>Typography</td><td>25%</td><td>Font size (±1px is full credit), weight, letter spacing{ai ? ", text and casing" : ""}.</td></tr>
            <tr><td>Color</td><td>20%</td><td>Background, fills, borders and text, by perceptual difference (ΔE 2000).</td></tr>
          </tbody>
        </table>
        <p><b>Bands:</b> 90–100 Pixel perfect · 75–89 Very close · 50–74 Getting there · below 50 Keep practising.</p>
        <p style={{ marginBottom: 0 }}>Icons and photos aren't scored, so placeholders are fine. Use Inter for all text. Your upload is processed in memory and never stored.</p>
      </div>
      <div className="dialog-foot">
        <button type="button" className="btn btn-dark" onClick={close}>Got it</button>
      </div>
    </dialog>
  );
});
