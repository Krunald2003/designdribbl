import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement> & { size?: number };

function base({ size = 18, ...rest }: P) {
  return { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true, ...rest };
}

export const DiceIcon = (p: P) => (
  <svg {...base(p)}><rect x="3.5" y="3.5" width="17" height="17" rx="4" /><circle cx="8.5" cy="8.5" r="1.2" fill="currentColor" stroke="none" /><circle cx="15.5" cy="15.5" r="1.2" fill="currentColor" stroke="none" /><circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none" /></svg>
);
export const UploadIcon = (p: P) => (
  <svg {...base(p)}><path d="M12 15V4" /><path d="m7 9 5-5 5 5" /><path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" /></svg>
);
export const DownloadIcon = (p: P) => (
  <svg {...base(p)}><path d="M12 4v11" /><path d="m7 10 5 5 5-5" /><path d="M4 17v1a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-1" /></svg>
);
export const RefreshIcon = (p: P) => (
  <svg {...base(p)}><path d="M20 11a8 8 0 0 0-14.3-4.9L4 8" /><path d="M4 4v4h4" /><path d="M4 13a8 8 0 0 0 14.3 4.9L20 16" /><path d="M20 20v-4h-4" /></svg>
);
export const CheckIcon = (p: P) => (<svg {...base(p)}><path d="m5 12.5 4.5 4.5L19 7.5" /></svg>);
export const AlertIcon = (p: P) => (<svg {...base(p)}><path d="M12 8v5" /><path d="M12 16.5h.01" /><path d="M10.3 3.9 2.6 17.5A2 2 0 0 0 4.3 20.5h15.4a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" /></svg>);
export const MinusIcon = (p: P) => (<svg {...base(p)}><path d="M6 12h12" /></svg>);
export const ArrowLeftIcon = (p: P) => (<svg {...base(p)}><path d="M19 12H5" /><path d="m11 6-6 6 6 6" /></svg>);
export const ThumbUpIcon = (p: P) => (<svg {...base(p)}><path d="M7 10v10H4V10h3Z" /><path d="M7 10l4-7a2 2 0 0 1 3 2l-1 4h5.5a2 2 0 0 1 2 2.4l-1.4 7A2 2 0 0 1 17.1 20H7" /></svg>);
export const ThumbDownIcon = (p: P) => (<svg {...base(p)}><path d="M7 14V4H4v10h3Z" /><path d="M7 14l4 7a2 2 0 0 0 3-2l-1-4h5.5a2 2 0 0 0 2-2.4l-1.4-7A2 2 0 0 0 17.1 4H7" /></svg>);
export const InfoIcon = (p: P) => (<svg {...base(p)}><circle cx="12" cy="12" r="9" /><path d="M12 11v5" /><path d="M12 7.5h.01" /></svg>);

export function Logo() {
  return (
    <svg width="30" height="30" viewBox="0 0 32 32" aria-hidden="true">
      <rect x="2" y="2" width="28" height="28" rx="8" fill="#4F3BF5" />
      <circle cx="11" cy="11" r="2.6" fill="#fff" />
      <circle cx="21" cy="21" r="2.6" fill="#fff" />
      <circle cx="21" cy="11" r="2.6" fill="#D7FF4A" />
      <circle cx="11" cy="21" r="2.6" fill="#fff" />
    </svg>
  );
}

export function Dice({ rolling }: { rolling: boolean }) {
  const pips = (n: number[], lime = -1) => Array.from({ length: 9 }, (_, i) => (
    <i key={i} className={i === lime ? "lime" : ""} style={{ visibility: n.includes(i) ? "visible" : "hidden" }} />
  ));
  return (
    <div className="dice-wrap" aria-hidden="true">
      <div className={`dice${rolling ? " rolling" : ""}`}>
        <div className="face f1">{pips([0, 2, 4, 6, 8], 2)}</div>
        <div className="face f2">{pips([0, 4, 8])}</div>
        <div className="face f3">{pips([0, 2, 6, 8])}</div>
      </div>
    </div>
  );
}
