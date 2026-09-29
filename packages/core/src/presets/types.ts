import type { z } from "zod";
import type { AnimationDef, CssProps, KeyframesDef } from "../compile/types";
import type { Timing } from "../spec/timing";
import type { DrawableElement } from "../svg/types";
import type { PathMotion } from "./path-motion";

export type PresetContext<P> = {
  element: DrawableElement;
  /** Position of the element inside its track (for stagger). */
  index: number;
  total: number;
  params: P;
  timing: Timing;
  /** Start point and direction on the outline (layer editor). Defaults to `DEFAULT_PATH`. */
  path?: PathMotion;
  /** Document viewBox, for presets that move things by a fraction of the canvas. */
  viewBox?: [number, number, number, number];
  /** Center of the viewBox in the element's own coordinates (after ancestor and own transforms). */
  origin?: [number, number];
  /** True when the element's coordinates are mirrored relative to the viewport. */
  mirrored?: boolean;
};

export type PresetOutput = {
  /** Names are local to the track; `compile()` namespaces them. */
  keyframes: KeyframesDef[];
  rule: {
    /** SVG attributes to set on the element (e.g. `pathLength`). */
    attrs?: Record<string, string>;
    props: CssProps;
    animations: AnimationDef[];
    reducedMotion: CssProps;
  };
};

export interface Preset<Id extends string, P> {
  id: Id;
  /** UI label (pt-BR). */
  label: string;
  description: string;
  paramsSchema: z.ZodType<P>;
  defaults: { params: P; timing: Timing };
  /** When true and the element has no stroke, compile uses autoStroke or warns. */
  requiresStroke: boolean;
  /**
   * What happens to the fill of an element that only gets a stroke from autoStroke.
   * "ghost" dims it so a moving dash of the same color stays visible (comet, yoyo, march).
   * Defaults to "keep".
   */
  autoStrokeFill?: "keep" | "ghost";
  compile(context: PresetContext<P>): PresetOutput;
}
