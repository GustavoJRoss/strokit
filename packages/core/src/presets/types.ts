import type { z } from "zod";
import type { AnimationDef, CssProps, KeyframesDef } from "../compile/types";
import type { Timing } from "../spec/timing";
import type { DrawableElement } from "../svg/types";

export type PresetContext<P> = {
  element: DrawableElement;
  /** Position of the element inside its track (for stagger). */
  index: number;
  total: number;
  params: P;
  timing: Timing;
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
  compile(context: PresetContext<P>): PresetOutput;
}
