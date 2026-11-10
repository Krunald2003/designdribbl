import { cn } from "@/lib/utils";

/** designdrbbl logo mark: a die face on a dark tile (as in the Paper design). */
export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("flex size-7 items-center justify-center rounded-md bg-primary", className)} aria-hidden="true">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--primary-foreground)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="4" />
        <circle cx="8.5" cy="8.5" r="1.3" fill="var(--primary-foreground)" />
        <circle cx="12" cy="12" r="1.3" fill="var(--primary-foreground)" />
        <circle cx="15.5" cy="15.5" r="1.3" fill="var(--primary-foreground)" />
      </svg>
    </span>
  );
}
