import type { CssProps } from "../compile/types";
import { round } from "../util/number";

/** Where a stroke animation starts on the outline (fraction 0–1) and which way it runs. */
export type PathMotion = { start: number; reverse: boolean };

export const DEFAULT_PATH: PathMotion = { start: 0, reverse: false };

function isDefault(path: PathMotion): boolean {
  return (path.start === 0 || path.start === 1) && !path.reverse;
}

function number(value: number): string {
  return String(round(value) || 0);
}

export type Reveal = {
  /** Static props of the rule. */
  props: CssProps;
  /** Keyframe props at the start (nothing drawn) and at the end (fully drawn). */
  from: CssProps;
  to: CssProps;
  reducedMotion: CssProps;
};

/**
 * The stroke being drawn by `draw`, `stagger-draw` and `draw-fill`.
 *
 * By default it is the ARCHITECTURE §6 technique: `dasharray: 1 1`, `dashoffset: 1 → 0`.
 * From another start point `s`, a periodic dash `p (1-p)` grows from `0 1` to `1 0` with
 * `dashoffset: -s`, which puts the dash on `[s, s+p]` (wrapping around closed shapes).
 * Reversed, the offset also moves (`-s → 1-s`) so the dash covers `[s-p, s]` instead.
 */
export function reveal(path: PathMotion = DEFAULT_PATH): Reveal {
  if (isDefault(path)) {
    return {
      props: { "stroke-dasharray": "1 1" },
      from: { "stroke-dashoffset": "1" },
      to: { "stroke-dashoffset": "0" },
      reducedMotion: { "stroke-dashoffset": "0" },
    };
  }
  const reducedMotion = { "stroke-dasharray": "none" };
  if (!path.reverse) {
    return {
      props: { "stroke-dashoffset": number(-path.start) },
      from: { "stroke-dasharray": "0 1" },
      to: { "stroke-dasharray": "1 0" },
      reducedMotion,
    };
  }
  return {
    props: {},
    from: { "stroke-dasharray": "0 1", "stroke-dashoffset": number(-path.start) },
    to: { "stroke-dasharray": "1 0", "stroke-dashoffset": number(1 - path.start) },
    reducedMotion,
  };
}

/**
 * `dashoffset` keyframe values of a travelling dash (`comet`, `yoyo`, `march`), shifted so the
 * dash starts at `start` and swapped when reversed.
 */
export function travel(
  from: number,
  to: number,
  path: PathMotion = DEFAULT_PATH,
): { from: string; to: string } {
  const shift = path.start === 1 ? 0 : path.start;
  const [a, b] = path.reverse ? [to, from] : [from, to];
  return { from: number(a - shift), to: number(b - shift) };
}

/** True when the start point moved (not only the direction). */
export function hasStart(path: PathMotion = DEFAULT_PATH): boolean {
  return path.start !== 0 && path.start !== 1;
}
