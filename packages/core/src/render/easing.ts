import type { Easing } from "../spec/timing";

type Bezier = readonly [number, number, number, number];

const KEYWORDS: Record<string, Bezier> = {
  linear: [0, 0, 1, 1],
  ease: [0.25, 0.1, 0.25, 1],
  "ease-in": [0.42, 0, 1, 1],
  "ease-out": [0, 0, 0.58, 1],
  "ease-in-out": [0.42, 0, 0.58, 1],
};

/** cubic-bezier(x1, y1, x2, y2) as a function of x, solved like browsers do (Newton + bisection). */
export function cubicBezier([x1, y1, x2, y2]: Bezier): (x: number) => number {
  if (x1 === y1 && x2 === y2) return (x) => x;
  const cx = 3 * x1;
  const bx = 3 * (x2 - x1) - cx;
  const ax = 1 - cx - bx;
  const cy = 3 * y1;
  const by = 3 * (y2 - y1) - cy;
  const ay = 1 - cy - by;
  const sampleX = (t: number) => ((ax * t + bx) * t + cx) * t;
  const sampleY = (t: number) => ((ay * t + by) * t + cy) * t;
  const slopeX = (t: number) => (3 * ax * t + 2 * bx) * t + cx;

  const solveT = (x: number): number => {
    let t = x;
    for (let i = 0; i < 8; i++) {
      const error = sampleX(t) - x;
      if (Math.abs(error) < 1e-7) return t;
      const slope = slopeX(t);
      if (Math.abs(slope) < 1e-6) break;
      t -= error / slope;
    }
    let low = 0;
    let high = 1;
    t = x;
    while (low < high) {
      const value = sampleX(t);
      if (Math.abs(value - x) < 1e-7) return t;
      if (x > value) low = t;
      else high = t;
      t = (low + high) / 2;
      if (high - low < 1e-9) break;
    }
    return t;
  };

  return (x) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    return sampleY(solveT(x));
  };
}

export function easingFunction(easing: Easing): (x: number) => number {
  const curve =
    typeof easing === "string" ? (KEYWORDS[easing] ?? KEYWORDS.linear) : easing.cubicBezier;
  return cubicBezier(curve as Bezier);
}
