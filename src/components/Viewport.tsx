import { useEffect, useRef, useState, type ReactNode } from "react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";

/** shadcn-style segmented control (looks like a TabsList), built on ToggleGroup. */
export function Segmented<T extends string>({ value, onChange, options, label }: {
  value: T; onChange: (v: T) => void; options: [T, string][]; label: string;
}) {
  return (
    <ToggleGroup type="single" value={value} onValueChange={(v) => v && onChange(v as T)} aria-label={label}
      className="gap-0.5 rounded-md bg-muted p-[3px]">
      {options.map(([v, t]) => (
        <ToggleGroupItem key={v} value={v}
          className="h-6 min-w-0 rounded-sm px-2.5 text-xs font-medium text-muted-foreground hover:bg-transparent hover:text-foreground data-[state=on]:bg-background data-[state=on]:text-foreground data-[state=on]:shadow-xs">
          {t}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}

export type Zoom = "fit" | "1" | "2";

export function ZoomControl({ zoom, onChange, label }: { zoom: Zoom; onChange: (z: Zoom) => void; label: string }) {
  return <Segmented value={zoom} onChange={onChange} label={`${label} zoom`} options={[["fit", "Fit"], ["1", "100%"], ["2", "200%"]]} />;
}

/** Shows an image at its true aspect ratio: fit, 100% or 200% (scrollable). */
export function Viewport({ src, width, height, zoom, alt, className, children }: {
  src?: string; width: number; height: number; zoom: Zoom; alt: string; className?: string; children?: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ w: 600, h: 600 });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setBox({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const scale = zoom === "fit" ? Math.min((box.w - 40) / width, (box.h - 40) / height, 2) : Number(zoom);
  return (
    <div ref={ref} tabIndex={src ? 0 : -1} aria-label={src ? `${alt}, scrollable` : undefined}
      className={cn("relative min-h-0 flex-1 overflow-auto bg-muted outline-none", className)}>
      {src ? (
        <div className="flex min-h-full min-w-full w-max items-center justify-center p-5">
          <img src={src} alt={alt} width={Math.max(1, Math.round(width * scale))} height={Math.max(1, Math.round(height * scale))} draggable={false}
            className="max-w-none rounded-md bg-white shadow-[0_1px_3px_rgba(0,0,0,0.1),0_0_0_1px_rgba(0,0,0,0.04)]" />
        </div>
      ) : children}
    </div>
  );
}
