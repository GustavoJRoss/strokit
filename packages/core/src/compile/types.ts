import type { Timing } from "../spec/timing";
import type { SvgElementNode } from "../svg/tree";

/** CSS property → value, in declaration order. */
export type CssProps = Record<string, string>;

export type KeyframeStop = {
  /** 0–1 */
  offset: number;
  props: CssProps;
};

export type KeyframesDef = { name: string; stops: KeyframeStop[] };

export type AnimationDef = Timing & {
  /** Name of a `KeyframesDef` in the same compiled animation. */
  keyframes: string;
  fillMode: "none" | "forwards" | "backwards" | "both";
};

export type ElementRule = {
  elementId: string;
  /** Absent for edited layers that are not animated (static colors only). */
  trackId?: string;
  props: CssProps;
  animations: AnimationDef[];
  /** Static final state shown under `prefers-reduced-motion: reduce`. */
  reducedMotion: CssProps;
};

export type CompileWarning =
  | { code: "missing-stroke"; trackId: string; elementId: string }
  | { code: "unknown-target"; trackId: string; elementId: string }
  | { code: "unknown-layer"; elementId: string };

/** Neutral IR read by every exporter. Exporters never know about presets. */
export type CompiledAnimation = {
  /** Unique, deterministic prefix: "sk-<hash>". */
  id: string;
  /** Tree with preset attributes applied (e.g. `pathLength`). Drawables keep `data-sk-id`. */
  root: SvgElementNode;
  keyframes: KeyframesDef[];
  rules: ElementRule[];
  a11y: { label: string; mode: "img" | "status" };
  warnings: CompileWarning[];
};
