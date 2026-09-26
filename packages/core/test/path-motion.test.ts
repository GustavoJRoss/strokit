import { describe, expect, it } from "vitest";
import { compile } from "../src/compile/compile";
import { reveal, travel } from "../src/presets/path-motion";
import { sampleAnimation } from "../src/render/frame";
import { applyPreset, createEmptySpec } from "../src/spec/defaults";
import { type LayerPatch, updateLayers } from "../src/spec/layers";
import type { PresetId } from "../src/spec/schema";
import { importSvg } from "../src/svg/import";
import { fixture, parser } from "./helpers";

/**
 * Whether the point at `x` (0–1 of a `pathLength="1"` outline) is painted, following the SVG
 * dash model: position `x` maps to `(x + dashoffset) mod period` of the dash pattern.
 */
function painted(props: Record<string, string>, x: number): boolean {
  const dasharray = props["stroke-dasharray"];
  if (dasharray === undefined || dasharray === "none") return true;
  const pattern = dasharray.split(/[\s,]+/).map(Number);
  const period = pattern.reduce((sum, value) => sum + value, 0);
  if (period === 0) return true;
  const offset = Number(props["stroke-dashoffset"] ?? 0);
  let position = (((x + offset) % period) + period) % period;
  for (let i = 0; i < pattern.length; i++) {
    const length = pattern[i] ?? 0;
    if (position < length) return i % 2 === 0;
    position -= length;
  }
  return false;
}

/** Painted intervals, sampled every 0.01 and checked away from the edges. */
function coverage(props: Record<string, string>): string {
  const samples = Array.from({ length: 100 }, (_, i) => (i + 0.5) / 100);
  return samples.map((x) => (painted(props, x) ? "#" : ".")).join("");
}

function expected(ranges: [number, number][]): string {
  const samples = Array.from({ length: 100 }, (_, i) => (i + 0.5) / 100);
  return samples.map((x) => (ranges.some(([a, b]) => x > a && x < b) ? "#" : ".")).join("");
}

function frameAt(preset: PresetId, patch: LayerPatch, progress: number) {
  const { document } = importSvg(fixture("simple-stroke.svg"), { parser });
  const spec = updateLayers(applyPreset(createEmptySpec(), ["sk-0"], preset), ["sk-0"], patch);
  const track = spec.tracks[0];
  if (!track) throw new Error("missing track");
  track.timing = { ...track.timing, easing: "linear", direction: "normal", iterations: 1 };
  const compiled = compile(document, spec);
  const duration = compiled.rules[0]?.animations[0]?.duration ?? 0;
  return sampleAnimation(compiled, duration * progress).get("sk-0") ?? {};
}

describe("path motion helpers", () => {
  it("keeps the default technique when nothing moved", () => {
    expect(reveal()).toEqual(reveal({ start: 1, reverse: false }));
    expect(reveal().props).toEqual({ "stroke-dasharray": "1 1" });
    expect(travel(1, 0)).toEqual({ from: "1", to: "0" });
    expect(travel(1, 0, { start: 0.25, reverse: true })).toEqual({ from: "-0.25", to: "0.75" });
  });
});

describe("start point and direction (sampled like the video frames)", () => {
  it.each(["draw", "draw-fill", "stagger-draw"] as const)(
    "%s draws from the start point",
    (preset) => {
      // Half of the stroke: draw-fill finishes the stroke at 60% of its duration.
      const half = preset === "draw-fill" ? 0.3 : 0.5;
      expect(coverage(frameAt(preset, { start: 0.3 }, 0))).toBe(expected([]));
      expect(coverage(frameAt(preset, { start: 0.3 }, half))).toBe(expected([[0.3, 0.8]]));
    },
  );

  it("wraps around closed shapes and draws backwards when reversed", () => {
    expect(coverage(frameAt("draw", { start: 0.7 }, 0.5))).toBe(
      expected([
        [0.7, 1],
        [0, 0.2],
      ]),
    );
    expect(coverage(frameAt("draw", { start: 0.3, reverse: true }, 0.5))).toBe(
      expected([
        [0, 0.3],
        [0.8, 1],
      ]),
    );
    expect(coverage(frameAt("draw", { reverse: true }, 0.25))).toBe(expected([[0.75, 1]]));
    expect(coverage(frameAt("draw", { start: 0.3 }, 1))).toBe(expected([[0, 1]]));
  });

  it("starts the comet at the start point and runs it the other way when reversed", () => {
    // Default comet length is 0.2.
    expect(coverage(frameAt("comet", { start: 0.4 }, 0))).toBe(expected([[0.4, 0.6]]));
    expect(coverage(frameAt("comet", { start: 0.4 }, 0.25))).toBe(expected([[0.65, 0.85]]));
    expect(coverage(frameAt("comet", { start: 0.4, reverse: true }, 0.25))).toBe(
      expected([[0.15, 0.35]]),
    );
  });

  it("sends the yoyo dash around the shape and back to the start point", () => {
    // Default yoyo length is 0.25.
    expect(coverage(frameAt("yoyo", { start: 0.5 }, 0))).toBe(expected([[0.5, 0.75]]));
    expect(coverage(frameAt("yoyo", { start: 0.5 }, 1))).toBe(expected([[0.25, 0.5]]));
    expect(coverage(frameAt("yoyo", { reverse: true }, 0))).toBe(expected([[0.75, 1]]));
    expect(coverage(frameAt("yoyo", { reverse: true }, 1))).toBe(expected([[0, 0.25]]));
  });

  it("shifts the marching pattern", () => {
    const base = coverage(frameAt("march", {}, 0));
    const shifted = coverage(frameAt("march", { start: 0.01 }, 0));
    expect(shifted).not.toBe(base);
    expect(shifted.slice(1)).toBe(base.slice(0, -1));
  });

  it("shows the whole outline under reduced motion", () => {
    const { document } = importSvg(fixture("simple-stroke.svg"), { parser });
    const spec = updateLayers(applyPreset(createEmptySpec(), ["sk-0"], "draw"), ["sk-0"], {
      start: 0.5,
    });
    expect(compile(document, spec).rules[0]?.reducedMotion).toEqual({
      "stroke-dasharray": "none",
    });
  });
});
