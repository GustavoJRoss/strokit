import type { DrawPoint } from "./shapes";

/** Distance from `point` to the segment `a`–`b`. */
function distanceToSegment(point: DrawPoint, a: DrawPoint, b: DrawPoint): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lengthSquared = dx * dx + dy * dy;
  if (lengthSquared === 0) return Math.hypot(point.x - a.x, point.y - a.y);
  const t = Math.max(0, Math.min(1, ((point.x - a.x) * dx + (point.y - a.y) * dy) / lengthSquared));
  return Math.hypot(point.x - (a.x + t * dx), point.y - (a.y + t * dy));
}

/**
 * Ramer–Douglas–Peucker: the fewest points that stay within `tolerance` of the original
 * stroke. Iterative, so a long stroke cannot overflow the call stack.
 */
export function simplify(points: readonly DrawPoint[], tolerance: number): DrawPoint[] {
  if (points.length < 3) return [...points];
  const keep = new Array<boolean>(points.length).fill(false);
  keep[0] = true;
  keep[points.length - 1] = true;
  const pending: [number, number][] = [[0, points.length - 1]];
  while (pending.length > 0) {
    const [first, last] = pending.pop() as [number, number];
    const a = points[first] as DrawPoint;
    const b = points[last] as DrawPoint;
    let farthest = -1;
    let farthestDistance = tolerance;
    for (let index = first + 1; index < last; index++) {
      const distance = distanceToSegment(points[index] as DrawPoint, a, b);
      if (distance > farthestDistance) {
        farthest = index;
        farthestDistance = distance;
      }
    }
    if (farthest !== -1) {
      keep[farthest] = true;
      pending.push([first, farthest], [farthest, last]);
    }
  }
  return points.filter((_, index) => keep[index]);
}

function format(value: number): string {
  const rounded = Math.round(value * 100) / 100;
  return String(rounded === 0 ? 0 : rounded);
}

/**
 * Path through the points as cubic Béziers (Catmull–Rom, so the curve passes through every
 * point). Two points give a straight line.
 */
export function smoothPath(points: readonly DrawPoint[]): string | null {
  if (points.length < 2) return null;
  const first = points[0] as DrawPoint;
  if (points.length === 2) {
    const last = points[1] as DrawPoint;
    return `M${format(first.x)} ${format(first.y)}L${format(last.x)} ${format(last.y)}`;
  }
  let d = `M${format(first.x)} ${format(first.y)}`;
  for (let index = 0; index < points.length - 1; index++) {
    // The ends reuse their own point, which flattens the tangent there.
    const before = points[Math.max(0, index - 1)] as DrawPoint;
    const from = points[index] as DrawPoint;
    const to = points[index + 1] as DrawPoint;
    const after = points[Math.min(points.length - 1, index + 2)] as DrawPoint;
    const c1 = { x: from.x + (to.x - before.x) / 6, y: from.y + (to.y - before.y) / 6 };
    const c2 = { x: to.x - (after.x - from.x) / 6, y: to.y - (after.y - from.y) / 6 };
    d += `C${format(c1.x)} ${format(c1.y)} ${format(c2.x)} ${format(c2.y)} ${format(to.x)} ${format(to.y)}`;
  }
  return d;
}

/**
 * A hand-drawn stroke (mouse, touch or pen samples) as clean path data: simplified within
 * `tolerance` (viewBox units), then smoothed. `null` when the stroke never left its start.
 */
export function freehandPath(points: readonly DrawPoint[], tolerance: number): string | null {
  const valid = points.filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y));
  const start = valid[0];
  if (!start || !valid.some((point) => Math.hypot(point.x - start.x, point.y - start.y) > 0.01)) {
    return null;
  }
  return smoothPath(simplify(valid, Math.max(tolerance, 0)));
}
