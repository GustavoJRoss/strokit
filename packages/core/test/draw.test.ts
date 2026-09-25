import { describe, expect, it } from "vitest";
import { getPreset, presetIds } from "../src/presets";
import { drawPreset } from "../src/presets/draw";

describe("draw preset", () => {
  const timing = drawPreset.defaults.timing;
  const output = drawPreset.compile({
    element: { id: "sk-0", tag: "path", hasFill: false, hasStroke: true, stroke: "red" },
    index: 0,
    total: 1,
    params: {},
    timing,
  });

  it("is registered", () => {
    expect(presetIds).toContain("draw");
    expect(getPreset("draw")).toBe(drawPreset);
  });

  it("animates dashoffset 1 → 0 on a normalized path length", () => {
    expect(output.keyframes).toEqual([
      {
        name: "draw",
        stops: [
          { offset: 0, props: { "stroke-dashoffset": "1" } },
          { offset: 1, props: { "stroke-dashoffset": "0" } },
        ],
      },
    ]);
    expect(output.rule.attrs).toEqual({ pathLength: "1" });
    expect(output.rule.props).toEqual({ "stroke-dasharray": "1 1" });
  });

  it("uses the track timing and fills both ways so nothing flashes before the delay", () => {
    expect(output.rule.animations).toEqual([{ ...timing, keyframes: "draw", fillMode: "both" }]);
  });

  it("shows the fully drawn logo under reduced motion", () => {
    expect(output.rule.reducedMotion).toEqual({ "stroke-dashoffset": "0" });
  });

  it("validates params strictly", () => {
    expect(drawPreset.paramsSchema.safeParse({}).success).toBe(true);
    expect(drawPreset.paramsSchema.safeParse({ x: 1 }).success).toBe(false);
  });
});
