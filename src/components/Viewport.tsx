import { useEffect, useRef, useState, type ReactNode } from "react";

export type Zoom = "fit" | 1 | 2;

export function ZoomControl({ zoom, onChange, label }: { zoom: Zoom; onChange: (z: Zoom) => void; label: string }) {
  const opts: [Zoom, string][] = [["fit", "Fit"], [1, "100%"], [2, "200%"]];
  return (
    <div className="seg" role="group" aria-label={`${label} zoom`}>
      {opts.map(([z, t]) => (
        <button key={String(z)} type="button" aria-pressed={zoom === z} onClick={() => onChange(z)}>{t}</button>
      ))}
    </div>
  );
}

/** Canvas-like viewport that shows an image at true aspect ratio: fit, 100% or 200%. */
export function Viewport({ src, width, height, zoom, alt, children }: { src?: string; width: number; height: number; zoom: Zoom; alt: string; children?: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ w: 600, h: 600 });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setBox({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const scale = zoom === "fit" ? Math.min((box.w - 48) / width, (box.h - 48) / height, 2) : zoom;
  return (
    <div className="viewport" ref={ref} tabIndex={src ? 0 : -1} aria-label={src ? `${alt}, scrollable` : undefined}>
      {src ? (
        <div className="viewport-inner">
          <img src={src} alt={alt} width={Math.round(width * scale)} height={Math.round(height * scale)} draggable={false} />
        </div>
      ) : children}
    </div>
  );
}
