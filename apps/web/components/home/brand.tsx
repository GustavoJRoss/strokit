import { cn } from "@/lib/utils";

/** The same path as public/brand/strokit.svg, static and in currentColor. */
export const BRAND_PATH = "M46 14 H26 A10 10 0 0 0 26 34 H38 A10 10 0 0 1 38 54 H18";

export function BrandGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true" className={cn("size-7", className)}>
      <path
        d={BRAND_PATH}
        fill="none"
        stroke="currentColor"
        strokeWidth="7"
        strokeLinecap="square"
      />
    </svg>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("flex items-center gap-2", className)}>
      <BrandGlyph />
      <span className="font-display text-lg lowercase">strokit</span>
    </span>
  );
}
