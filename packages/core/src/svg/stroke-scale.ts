import { determinant, IDENTITY, type Matrix, multiply, parseTransform } from "./transform";
import { type SvgElementNode, walkElements } from "./tree";
import type { SvgDocument } from "./types";

/** A stroke width of 1 "visual unit" is this fraction of the SVG's larger side. */
const VISUAL_UNITS_PER_SIDE = 100;

/** Accumulated `transform` (ancestors, then the element itself) of every drawable; null if not affine. */
export function accumulatedMatrices(root: SvgElementNode): Map<string, Matrix | null> {
  const matrices = new Map<string, Matrix | null>();
  const inherited = new Map<SvgElementNode, Matrix | null>();
  walkElements(root, (element, ancestors) => {
    const parent = ancestors[ancestors.length - 1];
    const before = parent ? inherited.get(parent) : IDENTITY;
    const own = parseTransform(element.attrs.transform);
    const matrix = before && own ? multiply(before, own) : null;
    inherited.set(element, matrix);
    const id = element.attrs["data-sk-id"];
    if (id !== undefined) matrices.set(id, matrix);
    return undefined;
  });
  return matrices;
}

/** Length of one visual unit in the SVG's own (viewBox) units. */
export function visualUnit(viewBox: SvgDocument["viewBox"]): number {
  return Math.max(viewBox[2], viewBox[3]) / VISUAL_UNITS_PER_SIDE;
}

/**
 * How much the accumulated transform scales lengths (uniform scale; the geometric mean for
 * non-uniform ones). A stroke drawn in the element's space is multiplied by this on screen.
 */
export function transformScale(matrix: Matrix | null): number {
  if (!matrix) return 1;
  const scale = Math.sqrt(Math.abs(determinant(matrix)));
  return Number.isFinite(scale) && scale > 0 ? scale : 1;
}

export type StrokeScales = {
  /** One visual unit in viewBox units. */
  unit: number;
  /** Scale of each drawable's accumulated transform. */
  scales: ReadonlyMap<string, number>;
};

export function strokeScales(document: SvgDocument): StrokeScales {
  const scales = new Map<string, number>();
  for (const [id, matrix] of accumulatedMatrices(document.root)) {
    scales.set(id, transformScale(matrix));
  }
  return { unit: visualUnit(document.viewBox), scales };
}

function round(value: number, digits: number): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

/** Visual width → `stroke-width` in the element's own units (what ends up in the CSS). */
export function toUserWidth(visual: number, unit: number, scale: number): number {
  return round((visual * unit) / scale, 3);
}

/** Width in the element's own units → visual width (what the sliders show). */
export function toVisualWidth(user: number, unit: number, scale: number): number {
  return round((user * scale) / unit, 1);
}
