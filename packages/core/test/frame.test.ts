import { describe, expect, it } from "vitest";
import { compile } from "../src/compile/compile";
import type { AnimationDef } from "../src/compile/types";
import { cubicBezier, easingFunction } from "../src/render/easing";
import {
  animationLength,
  animationPhase,
  directedProgress,
  interpolateValue,
  renderFrame,
  sampleAnimation,
  sampleKeyframes,
} from "../src/render/frame";
import { applyPreset, createEmptySpec, updateTrackTiming } from "../src/spec/defaults";
import type { PresetId } from "../src/spec/schema";
import type { Timing } from "../src/spec/timing";
import { importSvg } from "../src/svg/import";
import { fixture, parser } from "./helpers";

const base: AnimationDef = {
  keyframes: "k",
  duration: 1000,
  delay: 0,
  easing: "linear",
  iterations: 1,
  direction: "normal",
  fillMode: "both",
};

function compiled(preset: PresetId, timing: Partial<Timing> = {}) {
  const { document } = importSvg(fixture("simple-stroke.svg"), { parser });
  const spec = updateTrackTiming(
    applyPreset(createEmptySpec(), ["sk-0", "sk-1"], preset),
    "track-0",
    timing,
  );
  return compile(document, spec);
}

describe("easing", () => {
  it("matches the CSS keyword curves at known points", () => {
    expect(easingFunction("linear")(0.3)).toBeCloseTo(0.3, 5);
    expect(easingFunction("ease-in-out")(0.5)).toBeCloseTo(0.5, 5);
    // Reference values of cubic-bezier(0.25, 0.1, 0.25, 1) ("ease").
    expect(easingFunction("ease")(0.25)).toBeCloseTo(0.4085, 3);
    expect(easingFunction("ease-in")(0.5)).toBeCloseTo(0.3153, 3);
    expect(easingFunction({ cubicBezier: [0.2, -0.5, 0.3, 1.5] })(0)).toBe(0);
    expect(cubicBezier([0.2, -0.5, 0.3, 1.5])(1)).toBe(1);
  });

  it("falls back to bisection where Newton's method stalls (flat start)", () => {
    const flat = cubicBezier([0, 0, 0, 1]);
    expect(flat(0.001)).toBeCloseTo(0.028, 4);
    expect(flat(0.02)).toBeCloseTo(0.181042, 4);
  });

  it("supports overshoot and stays monotonic in x", () => {
    const back = cubicBezier([0.3, -0.6, 0.7, 1.6]);
    expect(back(0.1)).toBeLessThan(0);
    expect(back(0.9)).toBeGreaterThan(1);
  });
});

describe("timing model", () => {
  it("fills backwards during the delay and forwards after the end", () => {
    expect(animationPhase({ ...base, delay: 500 }, 100)).toEqual({ iteration: 0, progress: 0 });
    expect(animationPhase({ ...base, delay: 500, fillMode: "forwards" }, 100)).toBeNull();
    expect(animationPhase({ ...base, iterations: 2 }, 5000)).toEqual({ iteration: 1, progress: 1 });
    expect(animationPhase({ ...base, fillMode: "none" }, 5000)).toBeNull();
    expect(animationPhase({ ...base, iterations: 1.5 }, 5000)).toEqual({
      iteration: 1,
      progress: 0.5,
    });
  });

  it("tracks iterations of infinite animations", () => {
    expect(animationPhase({ ...base, iterations: "infinite" }, 2250)).toEqual({
      iteration: 2,
      progress: 0.25,
    });
  });

  it("applies every direction", () => {
    const phase = { iteration: 1, progress: 0.25 };
    expect(directedProgress("normal", phase)).toBe(0.25);
    expect(directedProgress("reverse", phase)).toBe(0.75);
    expect(directedProgress("alternate", phase)).toBe(0.75);
    expect(directedProgress("alternate-reverse", phase)).toBe(0.25);
    expect(directedProgress("alternate", { iteration: 0, progress: 0.25 })).toBe(0.25);
  });
});

describe("values", () => {
  it("interpolates numbers inside values of the same shape", () => {
    expect(interpolateValue("1", "0", 0.25)).toBe("0.75");
    expect(interpolateValue("scale(1)", "scale(1.5)", 0.5)).toBe("scale(1.25)");
    expect(interpolateValue("0.25 1", "0.5 1", 0.5)).toBe("0.375 1");
  });

  it("switches discrete values at the midpoint", () => {
    expect(interpolateValue("none", "1 1", 0.4)).toBe("none");
    expect(interpolateValue("none", "1 1", 0.6)).toBe("1 1");
  });

  it("eases each keyframe interval and uses the underlying value for missing stops", () => {
    const definition = {
      name: "k",
      stops: [
        { offset: 0, props: { opacity: "0", "stroke-dashoffset": "1" } },
        { offset: 0.5, props: { opacity: "1" } },
        { offset: 1, props: { "stroke-dashoffset": "0" } },
      ],
    };
    const linear = (x: number) => x;
    expect(sampleKeyframes(definition, 0.25, linear, {})).toEqual({
      opacity: "0.5",
      "stroke-dashoffset": "0.75",
    });
    // opacity has no 100% stop: it goes back to the underlying value.
    expect(sampleKeyframes(definition, 0.75, linear, { opacity: "0.2" })).toMatchObject({
      opacity: "0.6",
    });
    expect(sampleKeyframes(definition, 0.75, linear, {})).toMatchObject({ opacity: "1" });
    expect(sampleKeyframes(definition, 0.25, (x) => x * x, {}).opacity).toBe("0.25");
  });
});

describe("sampleAnimation / renderFrame", () => {
  it("draws from nothing to the full stroke", () => {
    const animation = compiled("draw", { easing: "linear", duration: 1000 });
    expect(sampleAnimation(animation, 0).get("sk-0")).toMatchObject({
      "stroke-dashoffset": "1",
      "stroke-dasharray": "1 1",
    });
    expect(sampleAnimation(animation, 250).get("sk-0")?.["stroke-dashoffset"]).toBe("0.75");
    expect(sampleAnimation(animation, 5000).get("sk-0")?.["stroke-dashoffset"]).toBe("0");
  });

  it("renders a static SVG with inline state and no animation", () => {
    const animation = compiled("draw", { easing: "linear", duration: 1000 });
    const svg = renderFrame(animation, 500, { width: 400, height: 400, strokeColor: "#ffffff" });
    expect(svg).not.toMatch(/<style|animation|@keyframes|data-sk-id/);
    expect(svg).toContain(
      'style="stroke:var(--sk-stroke, #1d4ed8);stroke-dasharray:1 1;stroke-dashoffset:0.5"',
    );
    expect(svg).toContain('width="400" height="400"');
    expect(svg).toContain('style="--sk-stroke:#ffffff"');
    expect(svg).toContain('pathLength="1"');
  });

  it("samples transforms (pulse) and fill opacity (draw-fill)", () => {
    const pulse = compiled("pulse", { easing: "linear", duration: 1000 });
    expect(sampleAnimation(pulse, 250).get("sk-0")).toMatchObject({
      transform: "scale(1.03)",
      opacity: "0.75",
    });
    const drawFill = compiled("draw-fill", { easing: "linear", duration: 1000 });
    expect(sampleAnimation(drawFill, 800).get("sk-1")).toMatchObject({
      "fill-opacity": "0.5",
      "stroke-dashoffset": "0",
    });
  });

  it("measures one full pass: finite runs to the end, infinite shows one (or two alternate) cycles", () => {
    expect(animationLength(compiled("draw", { duration: 1500, delay: 200 }))).toBe(1700);
    expect(animationLength(compiled("draw", { duration: 1000, iterations: 3 }))).toBe(3000);
    expect(animationLength(compiled("comet", { duration: 1600 }))).toBe(1600);
    expect(animationLength(compiled("yoyo", { duration: 1200 }))).toBe(2400);
    expect(animationLength(compiled("draw", { duration: 50 }))).toBe(100);
  });
});
