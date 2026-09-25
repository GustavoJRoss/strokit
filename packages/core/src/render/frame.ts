import type { AnimationDef, CompiledAnimation, CssProps, KeyframesDef } from "../compile/types";
import { serializeSvg } from "../svg/serialize";
import { cloneNode, walkElements } from "../svg/tree";
import { round } from "../util/number";
import { easingFunction } from "./easing";

/**
 * Deterministic frames: the state of every animated element at time `t`, computed from the
 * compiled IR with the CSS / Web Animations timing model (delay, iterations, direction,
 * fill mode, per-keyframe-interval easing). Used to render video frames; like the exporters,
 * it never knows about presets.
 */

const NUMBER = /-?\d*\.?\d+(?:e[-+]?\d+)?/gi;

/** Interpolates numbers inside two values of the same shape ("scale(1)" → "scale(1.06)"). */
export function interpolateValue(from: string, to: string, progress: number): string {
  const a = from.match(NUMBER) ?? [];
  const b = to.match(NUMBER) ?? [];
  const sameShape = a.length === b.length && from.replace(NUMBER, "#") === to.replace(NUMBER, "#");
  if (!sameShape || a.length === 0) return progress < 0.5 ? from : to;
  let index = 0;
  return from.replace(NUMBER, () => {
    const start = Number(a[index]);
    const end = Number(b[index]);
    index++;
    return String(round(start + (end - start) * progress));
  });
}

type Phase = { iteration: number; progress: number } | null;

/** Where an animation is at `time` (ms): iteration index and progress 0–1, or null when inactive. */
export function animationPhase(animation: AnimationDef, time: number): Phase {
  const { duration, delay, iterations, fillMode } = animation;
  const active = iterations === "infinite" ? Number.POSITIVE_INFINITY : duration * iterations;
  const local = time - delay;
  if (local < 0) {
    return fillMode === "backwards" || fillMode === "both" ? { iteration: 0, progress: 0 } : null;
  }
  if (local >= active) {
    if (fillMode !== "forwards" && fillMode !== "both") return null;
    const count = iterations as number;
    const whole = Number.isInteger(count);
    return whole
      ? { iteration: count - 1, progress: 1 }
      : { iteration: Math.floor(count), progress: count % 1 };
  }
  const overall = local / duration;
  const iteration = Math.floor(overall);
  return { iteration, progress: overall - iteration };
}

/** Applies animation-direction to the iteration progress. */
export function directedProgress(
  direction: AnimationDef["direction"],
  phase: NonNullable<Phase>,
): number {
  const odd = phase.iteration % 2 === 1;
  switch (direction) {
    case "reverse":
      return 1 - phase.progress;
    case "alternate":
      return odd ? 1 - phase.progress : phase.progress;
    case "alternate-reverse":
      return odd ? phase.progress : 1 - phase.progress;
    default:
      return phase.progress;
  }
}

/**
 * Value of each property at `progress`. Every property uses the keyframes that declare it
 * (as CSS does); missing 0%/100% stops take the element's underlying value.
 */
export function sampleKeyframes(
  definition: KeyframesDef,
  progress: number,
  ease: (x: number) => number,
  underlying: CssProps,
): CssProps {
  const stops = [...definition.stops].sort((a, b) => a.offset - b.offset);
  const properties = [...new Set(stops.flatMap((stop) => Object.keys(stop.props)))];
  const result: CssProps = {};
  for (const property of properties) {
    const points = stops
      .filter((stop) => property in stop.props)
      .map((stop) => ({ offset: stop.offset, value: stop.props[property] as string }));
    const base = underlying[property];
    const first = points[0];
    const last = points[points.length - 1];
    if (first && first.offset > 0) points.unshift({ offset: 0, value: base ?? first.value });
    if (last && last.offset < 1) points.push({ offset: 1, value: base ?? last.value });

    let value = points[points.length - 1]?.value ?? "";
    for (let i = 0; i < points.length - 1; i++) {
      const start = points[i];
      const end = points[i + 1];
      if (!start || !end || progress < start.offset || progress > end.offset) continue;
      const span = end.offset - start.offset;
      const local = span === 0 ? 1 : (progress - start.offset) / span;
      value = interpolateValue(start.value, end.value, ease(local));
      break;
    }
    result[property] = value;
  }
  return result;
}

/** Computed props of every animated element at `time` (ms). */
export function sampleAnimation(compiled: CompiledAnimation, time: number): Map<string, CssProps> {
  const definitions = new Map(
    compiled.keyframes.map((definition) => [definition.name, definition]),
  );
  const frame = new Map<string, CssProps>();
  for (const rule of compiled.rules) {
    let props: CssProps = { ...rule.props };
    for (const animation of rule.animations) {
      const definition = definitions.get(animation.keyframes);
      const phase = animationPhase(animation, time);
      if (!definition || !phase) continue;
      const progress = directedProgress(animation.direction, phase);
      props = {
        ...props,
        ...sampleKeyframes(definition, progress, easingFunction(animation.easing), rule.props),
      };
    }
    frame.set(rule.elementId, props);
  }
  return frame;
}

/**
 * Length (ms) of a clip that shows the whole animation once: for finite animations, until the
 * last one ends; for infinite ones, one full cycle (two for alternate, so the loop is seamless).
 */
export function animationLength(compiled: CompiledAnimation): number {
  let length = 0;
  for (const rule of compiled.rules) {
    for (const animation of rule.animations) {
      const cycles =
        animation.iterations === "infinite"
          ? animation.direction.startsWith("alternate")
            ? 2
            : 1
          : animation.iterations;
      length = Math.max(length, animation.delay + animation.duration * cycles);
    }
  }
  return Math.max(100, Math.round(length));
}

export type FrameOptions = {
  width?: number;
  height?: number;
  /** Overrides `--sk-stroke` (e.g. "#ffffff" for a white stroke). */
  strokeColor?: string;
};

/** A static SVG (no <style>, no animation) showing the animation at `time` (ms). */
export function renderFrame(
  compiled: CompiledAnimation,
  time: number,
  options: FrameOptions = {},
): string {
  const frame = sampleAnimation(compiled, time);
  const root = cloneNode(compiled.root);
  walkElements(root, (element) => {
    const id = element.attrs["data-sk-id"];
    if (id === undefined) return undefined;
    delete element.attrs["data-sk-id"];
    const props = frame.get(id);
    if (props) {
      element.attrs.style = Object.entries(props)
        .map(([name, value]) => `${name}:${value}`)
        .join(";");
    }
    return undefined;
  });
  if (options.width !== undefined) root.attrs.width = String(options.width);
  if (options.height !== undefined) root.attrs.height = String(options.height);
  if (options.strokeColor) root.attrs.style = `--sk-stroke:${options.strokeColor}`;
  return serializeSvg(root);
}
