export type DrawPoint = { x: number; y: number };

export type ShapeKind = "line" | "rect" | "ellipse";

export type ShapeOptions = {
  /** Square / circle; a line snaps to multiples of 45°. */
  constrain?: boolean;
  /** The first point is the center instead of a corner (a line extends both ways). */
  fromCenter?: boolean;
};

/** Anything smaller than this (viewBox units) is a click, not a shape. */
const MIN_SIZE = 0.01;

function format(value: number): string {
  const rounded = Math.round(value * 100) / 100;
  // `-0` would print as "0" anyway, but a plain number keeps the path stable across engines.
  return String(rounded === 0 ? 0 : rounded);
}

type Box = { x: number; y: number; width: number; height: number };

/** The rectangle spanned by a drag, honoring `constrain` and `fromCenter`. */
function boxOf(from: DrawPoint, to: DrawPoint, options: ShapeOptions): Box {
  let dx = to.x - from.x;
  let dy = to.y - from.y;
  if (options.constrain) {
    const side = Math.max(Math.abs(dx), Math.abs(dy));
    dx = Math.sign(dx || 1) * side;
    dy = Math.sign(dy || 1) * side;
  }
  if (options.fromCenter) {
    return {
      x: from.x - Math.abs(dx),
      y: from.y - Math.abs(dy),
      width: Math.abs(dx) * 2,
      height: Math.abs(dy) * 2,
    };
  }
  return {
    x: Math.min(from.x, from.x + dx),
    y: Math.min(from.y, from.y + dy),
    width: Math.abs(dx),
    height: Math.abs(dy),
  };
}

function linePath(from: DrawPoint, to: DrawPoint, options: ShapeOptions): string | null {
  let dx = to.x - from.x;
  let dy = to.y - from.y;
  if (options.constrain) {
    const step = Math.PI / 4;
    const angle = Math.round(Math.atan2(dy, dx) / step) * step;
    const length = Math.hypot(dx, dy);
    dx = Math.cos(angle) * length;
    dy = Math.sin(angle) * length;
  }
  if (Math.hypot(dx, dy) < MIN_SIZE) return null;
  const start = options.fromCenter ? { x: from.x - dx, y: from.y - dy } : from;
  const end = { x: from.x + dx, y: from.y + dy };
  return `M${format(start.x)} ${format(start.y)}L${format(end.x)} ${format(end.y)}`;
}

function rectPath(box: Box): string | null {
  if (box.width < MIN_SIZE || box.height < MIN_SIZE) return null;
  const { x, y, width, height } = box;
  return `M${format(x)} ${format(y)}H${format(x + width)}V${format(y + height)}H${format(x)}Z`;
}

/** Two half-ellipse arcs: a closed outline that starts on the left, like a drawn circle. */
function ellipsePath(box: Box): string | null {
  if (box.width < MIN_SIZE || box.height < MIN_SIZE) return null;
  const rx = box.width / 2;
  const ry = box.height / 2;
  const cy = box.y + ry;
  const left = format(box.x);
  const right = format(box.x + box.width);
  const radii = `${format(rx)} ${format(ry)}`;
  return `M${left} ${format(cy)}A${radii} 0 1 1 ${right} ${format(cy)}A${radii} 0 1 1 ${left} ${format(cy)}Z`;
}

/**
 * Path data (`d`) of a shape dragged from `from` to `to`, in the same units as the points.
 * Every shape is a `<path>`, so presets treat drawn shapes like any other layer. `null` when
 * the drag is too small to be a shape.
 */
export function shapePath(
  kind: ShapeKind,
  from: DrawPoint,
  to: DrawPoint,
  options: ShapeOptions = {},
): string | null {
  if (![from.x, from.y, to.x, to.y].every(Number.isFinite)) return null;
  if (kind === "line") return linePath(from, to, options);
  const box = boxOf(from, to, options);
  return kind === "rect" ? rectPath(box) : ellipsePath(box);
}
