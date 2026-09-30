import type { z } from "zod";
import type { AnimationDef, CssProps, KeyframesDef } from "../compile/types";
import type { Timing } from "../spec/timing";
import type { Matrix } from "../svg/transform";
import type { SvgElementNode } from "../svg/tree";
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

export type OverlayContext<P> = {
  /** Unique, deterministic prefix for ids and element ids the overlay creates ("sk-<hash>-t<n>"). */
  prefix: string;
  /** The track's visible drawables, with their tree node and accumulated matrix (null: not affine). */
  targets: Array<{ element: DrawableElement; node: SvgElementNode; matrix: Matrix | null }>;
  params: P;
  timing: Timing;
  viewBox: [number, number, number, number];
};

export type OverlayOutput = {
  /** Appended to the root's children, before `nodes`. */
  defs: SvgElementNode[];
  nodes: SvgElementNode[];
  /** Names are local to the track; `compile()` namespaces them. */
  keyframes: KeyframesDef[];
  /** One per overlay node that carries a `data-sk-id`. */
  rules: Array<{ elementId: string } & PresetOutput["rule"]>;
  /** Targets the overlay could not cover (no fill, non-affine transform). */
  skipped: string[];
};

/**
 * "stroke" presets own the outline's dash properties, so at most one may run per element and it
 * must come first in a chain. "layer" presets only touch transform/opacity or add an overlay.
 */
export type PresetKind = "stroke" | "layer";

export interface Preset<Id extends string, P> {
  id: Id;
  /** UI label (pt-BR). */
  label: string;
  description: string;
  paramsSchema: z.ZodType<P>;
  defaults: { params: P; timing: Timing };
  /** When true and the element has no stroke, compile uses autoStroke or warns. */
  kind: PresetKind;
  requiresStroke: boolean;
  /**
   * What happens to the fill of an element that only gets a stroke from autoStroke.
   * "ghost" dims it so a moving dash of the same color stays visible (comet, yoyo, march).
   * Defaults to "keep".
   */
  autoStrokeFill?: "keep" | "ghost";
  compile(context: PresetContext<P>): PresetOutput;
  /**
   * Whole-piece effects (shine): called once per track instead of `compile()` per element. When
   * present, `compile()` is not used for the track and its output must be empty.
   */
  compileOverlay?(context: OverlayContext<P>): OverlayOutput;
}
