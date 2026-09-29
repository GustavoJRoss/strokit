/** 2D affine matrix in SVG order: [a, b, c, d, e, f] (x' = a·x + c·y + e, y' = b·x + d·y + f). */
export type Matrix = readonly [number, number, number, number, number, number];

export const IDENTITY: Matrix = [1, 0, 0, 1, 0, 0];

const FUNCTION = /([a-zA-Z]+)\s*\(([^)]*)\)/g;
const NUMBER = /^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i;

export function multiply(m: Matrix, n: Matrix): Matrix {
  return [
    m[0] * n[0] + m[2] * n[1],
    m[1] * n[0] + m[3] * n[1],
    m[0] * n[2] + m[2] * n[3],
    m[1] * n[2] + m[3] * n[3],
    m[0] * n[4] + m[2] * n[5] + m[4],
    m[1] * n[4] + m[3] * n[5] + m[5],
  ];
}

function fromFunction(name: string, args: number[]): Matrix | null {
  const [a = 0, b, c, d, e, f] = args;
  switch (name) {
    case "matrix":
      return args.length === 6
        ? [a, b as number, c as number, d as number, e as number, f as number]
        : null;
    case "translate":
      return args.length === 1 || args.length === 2 ? [1, 0, 0, 1, a, b ?? 0] : null;
    case "scale":
      return args.length === 1 || args.length === 2 ? [a, 0, 0, b ?? a, 0, 0] : null;
    case "rotate": {
      if (args.length !== 1 && args.length !== 3) return null;
      const rad = (a * Math.PI) / 180;
      const rotation: Matrix = [Math.cos(rad), Math.sin(rad), -Math.sin(rad), Math.cos(rad), 0, 0];
      if (args.length === 1) return rotation;
      const cx = b as number;
      const cy = c as number;
      return multiply(multiply([1, 0, 0, 1, cx, cy], rotation), [1, 0, 0, 1, -cx, -cy]);
    }
    case "skewX":
      return args.length === 1 ? [1, 0, Math.tan((a * Math.PI) / 180), 1, 0, 0] : null;
    case "skewY":
      return args.length === 1 ? [1, Math.tan((a * Math.PI) / 180), 0, 1, 0, 0] : null;
    default:
      return null;
  }
}

/** Parses an SVG `transform` attribute. Returns `null` when any part is not understood. */
export function parseTransform(value: string | undefined): Matrix | null {
  if (value === undefined || value.trim() === "") return IDENTITY;
  let result: Matrix = IDENTITY;
  for (const match of value.matchAll(FUNCTION)) {
    const tokens = (match[2] ?? "").split(/[\s,]+/).filter((token) => token !== "");
    if (!tokens.every((token) => NUMBER.test(token))) return null;
    const matrix = fromFunction(match[1] ?? "", tokens.map(Number));
    if (!matrix) return null;
    result = multiply(result, matrix);
  }
  // Anything left besides separators means something unknown.
  return value.replace(FUNCTION, "").replace(/[\s,]/g, "") === "" ? result : null;
}

export function determinant(m: Matrix): number {
  return m[0] * m[3] - m[1] * m[2];
}

export function invert(m: Matrix): Matrix | null {
  const det = determinant(m);
  if (!Number.isFinite(det) || Math.abs(det) < 1e-12) return null;
  return [
    m[3] / det,
    -m[1] / det,
    -m[2] / det,
    m[0] / det,
    (m[2] * m[5] - m[3] * m[4]) / det,
    (m[1] * m[4] - m[0] * m[5]) / det,
  ];
}

export function apply(m: Matrix, x: number, y: number): [number, number] {
  return [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];
}

/** True for rotation + uniform scale (+ mirroring) + translation: a rotation stays a rotation. */
export function isSimilarity(m: Matrix): boolean {
  const scaleX = Math.hypot(m[0], m[1]);
  const scaleY = Math.hypot(m[2], m[3]);
  const dot = m[0] * m[2] + m[1] * m[3];
  const tolerance = 1e-6 * Math.max(scaleX, scaleY, 1);
  return Math.abs(scaleX - scaleY) <= tolerance && Math.abs(dot) <= tolerance * scaleX;
}
