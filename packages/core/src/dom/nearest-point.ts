/**
 * Picking a point on an outline. The only DOM-dependent code of the core: it works on any
 * object shaped like an `SVGGeometryElement`, so tests pass plain functions instead.
 */

export type Point = { x: number; y: number };

/** Affine matrix as in `DOMMatrix` / `SVGMatrix`. */
export type MatrixLike = { a: number; b: number; c: number; d: number; e: number; f: number };

export type GeometryLike = {
  getTotalLength(): number;
  getPointAtLength(distance: number): Point;
  /** User space → screen. `null` (not rendered) falls back to user space. */
  getScreenCTM(): MatrixLike | null;
};

function apply(matrix: MatrixLike | null, point: Point): Point {
  if (!matrix) return { x: point.x, y: point.y };
  return {
    x: matrix.a * point.x + matrix.c * point.y + matrix.e,
    y: matrix.b * point.x + matrix.d * point.y + matrix.f,
  };
}

function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/** Index of the sample closest to `target`. */
export function nearestIndex(samples: readonly Point[], target: Point): number {
  let best = 0;
  let bestDistance = Number.POSITIVE_INFINITY;
  samples.forEach((sample, index) => {
    const current = distance(sample, target);
    if (current < bestDistance) {
      best = index;
      bestDistance = current;
    }
  });
  return best;
}

/**
 * Fraction (0–1) of the outline closest to `target`, in screen coordinates (e.g. a click's
 * `clientX`/`clientY`). Coarse samples first, then a finer pass around the best one.
 */
export function pickPathFraction(geometry: GeometryLike, target: Point, samples = 200): number {
  const total = geometry.getTotalLength();
  if (!(total > 0)) return 0;
  const matrix = geometry.getScreenCTM();
  const at = (length: number) => apply(matrix, geometry.getPointAtLength(length));

  const step = total / samples;
  const coarse = Array.from({ length: samples + 1 }, (_, i) => at(i * step));
  const center = nearestIndex(coarse, target) * step;

  const fineSamples = 40;
  const from = Math.max(0, center - step);
  const to = Math.min(total, center + step);
  const fineStep = (to - from) / fineSamples;
  const fine = Array.from({ length: fineSamples + 1 }, (_, i) => at(from + i * fineStep));
  const length = from + nearestIndex(fine, target) * fineStep;
  const fraction = Math.round((length / total) * 1000) / 1000;
  // The end of a closed outline is its start.
  return fraction >= 1 ? 0 : fraction;
}

/** Screen position of the point at `fraction` of the outline (for the start marker). */
export function pointAtFraction(geometry: GeometryLike, fraction: number): Point {
  const total = geometry.getTotalLength();
  return apply(geometry.getScreenCTM(), geometry.getPointAtLength(total * fraction));
}

/**
 * The outline closest to `target` among `candidates`, with the fraction to start from. Used
 * instead of pointer hit testing, which misses strokes whose dashes are invisible (Chromium
 * hit-tests dashes) and thin outlines. `null` when nothing is within `maxDistance` px.
 */
export function pickNearestOutline<Id>(
  candidates: readonly { id: Id; geometry: GeometryLike }[],
  target: Point,
  maxDistance = Number.POSITIVE_INFINITY,
): { id: Id; fraction: number } | null {
  let best: { id: Id; fraction: number } | null = null;
  let bestDistance = maxDistance;
  for (const { id, geometry } of candidates) {
    const fraction = pickPathFraction(geometry, target);
    const current = distance(pointAtFraction(geometry, fraction), target);
    if (current <= bestDistance) {
      best = { id, fraction };
      bestDistance = current;
    }
  }
  return best;
}
