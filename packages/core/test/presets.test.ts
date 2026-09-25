import { describe, expect, it } from "vitest";
import { compile } from "../src/compile/compile";
import { presetIds, presets } from "../src/presets";
import { cometPreset } from "../src/presets/comet";
import { drawFillPreset } from "../src/presets/draw-fill";
import { fitPattern, marchPreset } from "../src/presets/march";
import { pulsePreset } from "../src/presets/pulse";
import { staggerDrawPreset } from "../src/presets/stagger-draw";
import { yoyoPreset } from "../src/presets/yoyo";
import { applyPreset, createEmptySpec } from "../src/spec/defaults";
import { parseSpec } from "../src/spec/migrate";
import type { Timing } from "../src/spec/timing";
import { importSvg } from "../src/svg/import";
import { serializeSvg } from "../src/svg/serialize";
import type { DrawableElement } from "../src/svg/types";
import { createRandom, shuffledIndices } from "../src/util/random";
import { parser } from "./helpers";

const element: DrawableElement = {
  id: "sk-0",
  tag: "path",
  hasFill: false,
  hasStroke: true,
  stroke: "red",
};

function context<P>(params: P, timing: Timing, index = 0, total = 1) {
  return { element, index, total, params, timing };
}

describe("preset registry", () => {
  it("registers every MVP preset, in editor order", () => {
    expect(presetIds).toEqual([
      "draw",
      "draw-fill",
      "stagger-draw",
      "comet",
      "yoyo",
      "march",
      "pulse",
    ]);
  });

  it.each(presetIds)("%s: defaults satisfy its schema and a spec with it validates", (id) => {
    const preset = presets[id];
    expect(preset.paramsSchema.safeParse(preset.defaults.params).success).toBe(true);
    expect(() => parseSpec(applyPreset(createEmptySpec(), ["sk-0"], id))).not.toThrow();
    expect(preset.label).not.toBe("");
  });
});

describe("comet", () => {
  it("loops a dash of the given length around the shape", () => {
    const output = cometPreset.compile(context({ length: 0.3 }, cometPreset.defaults.timing));
    expect(output.rule.props).toEqual({ "stroke-dasharray": "0.3 0.7" });
    expect(output.keyframes[0]?.stops.map((stop) => stop.props["stroke-dashoffset"])).toEqual([
      "1",
      "0",
    ]);
    expect(output.rule.animations[0]).toMatchObject({ iterations: "infinite", easing: "linear" });
    expect(output.rule.reducedMotion).toEqual({ "stroke-dasharray": "none" });
  });
});

describe("yoyo", () => {
  it("moves a non-repeating dash from the start to the end, alternating", () => {
    const output = yoyoPreset.compile(context({ length: 0.25 }, yoyoPreset.defaults.timing));
    expect(output.rule.props).toEqual({ "stroke-dasharray": "0.25 1" });
    expect(output.keyframes[0]?.stops.map((stop) => stop.props["stroke-dashoffset"])).toEqual([
      "0",
      "-0.75",
    ]);
    expect(output.rule.animations[0]?.direction).toBe("alternate");
  });
});

describe("stagger-draw", () => {
  const params = { step: 100, order: "document" as const, seed: 1 };
  const once = { ...staggerDrawPreset.defaults.timing, duration: 800, delay: 50 };

  it("uses animation-delay when it plays once", () => {
    const delays = [0, 1, 2].map(
      (index) =>
        staggerDrawPreset.compile(context(params, once, index, 3)).rule.animations[0]?.delay,
    );
    expect(delays).toEqual([50, 150, 250]);
  });

  it("supports reverse and seeded random order", () => {
    const reverse = [0, 1, 2].map(
      (index) =>
        staggerDrawPreset.compile(context({ ...params, order: "reverse" as const }, once, index, 3))
          .rule.animations[0]?.delay,
    );
    expect(reverse).toEqual([250, 150, 50]);
    const random = (seed: number) =>
      [0, 1, 2, 3].map(
        (index) =>
          staggerDrawPreset.compile(
            context({ ...params, order: "random" as const, seed }, once, index, 4),
          ).rule.animations[0]?.delay,
      );
    expect(random(7)).toEqual(random(7));
    expect([...random(7)].sort((a = 0, b = 0) => a - b)).toEqual([50, 150, 250, 350]);
    expect(random(7)).not.toEqual(random(8));
  });

  it("embeds the offset in keyframes when it loops, so every cycle stays in sync", () => {
    const loop: Timing = { ...once, iterations: "infinite" };
    const first = staggerDrawPreset.compile(context(params, loop, 0, 3));
    const last = staggerDrawPreset.compile(context(params, loop, 2, 3));
    // cycle = 800 + 2·100 = 1000ms for every element
    expect(first.rule.animations[0]).toMatchObject({ duration: 1000, delay: 50 });
    expect(last.rule.animations[0]).toMatchObject({ duration: 1000, delay: 50 });
    expect(first.keyframes[0]?.stops.map((stop) => stop.offset)).toEqual([0, 0.8, 1]);
    expect(last.keyframes[0]?.stops.map((stop) => stop.offset)).toEqual([0, 0.2, 1]);
    expect(first.keyframes[0]?.name).not.toBe(last.keyframes[0]?.name);
  });
});

describe("draw-fill", () => {
  it("draws the outline, then fades the fill in from fillAt", () => {
    const output = drawFillPreset.compile(context({ fillAt: 0.6 }, drawFillPreset.defaults.timing));
    expect(output.keyframes[0]?.stops).toEqual([
      { offset: 0, props: { "stroke-dashoffset": "1", "fill-opacity": "0" } },
      { offset: 0.6, props: { "stroke-dashoffset": "0", "fill-opacity": "0" } },
      { offset: 1, props: { "stroke-dashoffset": "0", "fill-opacity": "1" } },
    ]);
    expect(output.rule.reducedMotion).toEqual({ "stroke-dashoffset": "0", "fill-opacity": "1" });
  });
});

describe("pulse", () => {
  it("scales around the element's own box and does not need a stroke", () => {
    const output = pulsePreset.compile(
      context({ scale: 1.1, minOpacity: 0.4 }, pulsePreset.defaults.timing),
    );
    expect(pulsePreset.requiresStroke).toBe(false);
    expect(output.rule.props).toEqual({
      "transform-box": "fill-box",
      "transform-origin": "center",
    });
    expect(output.keyframes[0]?.stops[1]?.props).toEqual({
      opacity: "0.4",
      transform: "scale(1.1)",
    });
    expect(output.rule.attrs).toBeUndefined();
  });

  it("moves an existing SVG transform to a wrapper group", () => {
    const { document } = importSvg(
      '<svg viewBox="0 0 10 10"><g><rect width="2" height="2" transform="rotate(30 1 1)"/><circle r="1"/></g></svg>',
      { parser },
    );
    const compiled = compile(document, applyPreset(createEmptySpec(), ["sk-0", "sk-1"], "pulse"));
    expect(serializeSvg(compiled.root)).toBe(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><g><g transform="rotate(30 1 1)"><rect width="2" height="2" data-sk-id="sk-0"/></g><circle r="1" data-sk-id="sk-1"/></g></svg>',
    );
  });
});

describe("march", () => {
  it("fits a whole number of dashes in the normalized length", () => {
    expect(fitPattern(0.04, 0.03)).toEqual({ dash: 0.0408, gap: 0.0306 });
    expect(fitPattern(0.5, 0.5)).toEqual({ dash: 0.5, gap: 0.5 });
    expect(fitPattern(0.25, 0.25)).toEqual({ dash: 0.25, gap: 0.25 });
    expect(fitPattern(0.2, 0.2)).toEqual({ dash: 0.1667, gap: 0.1666 });
    const { dash, gap } = fitPattern(0.03, 0.02);
    expect(Math.round(1 / (dash + gap)) * (dash + gap)).toBeCloseTo(1, 3);
  });

  it("moves the offset by exactly one pattern per cycle and stays dashed under reduced motion", () => {
    const output = marchPreset.compile(
      context({ dash: 0.05, gap: 0.05 }, marchPreset.defaults.timing),
    );
    expect(output.rule.props).toEqual({ "stroke-dasharray": "0.05 0.05" });
    expect(output.keyframes[0]?.stops.map((stop) => stop.props["stroke-dashoffset"])).toEqual([
      "0",
      "-0.1",
    ]);
    expect(output.rule.reducedMotion).toEqual({});
  });
});

describe("random", () => {
  it("is deterministic per seed and stays in [0, 1)", () => {
    const a = createRandom(42);
    const b = createRandom(42);
    const values = Array.from({ length: 50 }, () => a());
    expect(values).toEqual(Array.from({ length: 50 }, () => b()));
    expect(values.every((value) => value >= 0 && value < 1)).toBe(true);
  });

  it("shuffles into a permutation", () => {
    expect([...shuffledIndices(10, 3)].sort((x, y) => x - y)).toEqual([
      0, 1, 2, 3, 4, 5, 6, 7, 8, 9,
    ]);
    expect(shuffledIndices(0, 3)).toEqual([]);
  });
});
