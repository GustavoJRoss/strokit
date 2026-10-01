import type { DrawPoint } from "./shapes";

/**
 * A point of a pen path. `handle` is the control point that leaves the anchor (absolute
 * position); the one that arrives is its mirror, like dragging out a smooth point.
 */
export type PenAnchor = { point: DrawPoint; handle?: DrawPoint };

function format(value: number): string {
  const rounded = Math.round(value * 100) / 100;
  return String(rounded === 0 ? 0 : rounded);
}

function pair(point: DrawPoint): string {
  return `${format(point.x)} ${format(point.y)}`;
}

/** The control point that arrives at `anchor`: the mirror of its outgoing handle. */
function incoming(anchor: PenAnchor): DrawPoint {
  const { point, handle } = anchor;
  return handle ? { x: 2 * point.x - handle.x, y: 2 * point.y - handle.y } : point;
}

function segment(from: PenAnchor, to: PenAnchor): string {
  if (!from.handle && !to.handle) return `L${pair(to.point)}`;
  return `C${pair(from.handle ?? from.point)} ${pair(incoming(to))} ${pair(to.point)}`;
}

/** Two anchors in the same place (a double click adds one twice). */
function sameSpot(a: PenAnchor, b: PenAnchor): boolean {
  return Math.hypot(a.point.x - b.point.x, a.point.y - b.point.y) < 0.01;
}

/**
 * Path data for anchors placed with the pen tool: straight segments between plain points,
 * cubic Béziers where an anchor has a handle. `closed` joins the last anchor back to the
 * first and ends with `Z`; it needs at least three anchors, otherwise the path stays open.
 * `null` when there is nothing to draw (fewer than two distinct anchors).
 */
export function penPath(anchors: readonly PenAnchor[], closed = false): string | null {
  const valid = anchors.filter(
    (anchor) => Number.isFinite(anchor.point.x) && Number.isFinite(anchor.point.y),
  );
  const distinct = valid.filter(
    (anchor, index) => index === 0 || !sameSpot(anchor, valid[index - 1] as PenAnchor),
  );
  const first = distinct[0];
  if (!first || distinct.length < 2) return null;
  let d = `M${pair(first.point)}`;
  for (let index = 1; index < distinct.length; index++) {
    d += segment(distinct[index - 1] as PenAnchor, distinct[index] as PenAnchor);
  }
  if (closed && distinct.length >= 3) {
    d += `${segment(distinct[distinct.length - 1] as PenAnchor, first)}Z`;
  }
  return d;
}
