import { describe, expect, it } from "vitest";
import {
  type GeometryLike,
  nearestIndex,
  pickNearestOutline,
  pickPathFraction,
  pointAtFraction,
} from "../src/dom/nearest-point";
import { applyPreset, createEmptySpec, updateTrackTiming } from "../src/spec/defaults";
import { updateLayers } from "../src/spec/layers";
import { reconcileSpec } from "../src/spec/reconcile";
import { importSvg } from "../src/svg/import";
import { layerTree } from "../src/svg/layers";
import { fixture, parser } from "./helpers";

const load = (markup: string) => importSvg(markup, { parser }).document;

describe("layerTree", () => {
  it("unwraps a single group around everything", () => {
    const document = load(fixture("shapes.svg"));
    expect(layerTree(document.root)).toEqual(
      document.elements.map((element) => ({ kind: "layer", id: element.id })),
    );
  });

  it("keeps nested groups with their label and drops groups of one", () => {
    const document = load(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10">
      <circle r="1"/>
      <g id="olhos"><circle r="1"/><g><title>Pupila</title><circle r="1"/><circle r="2"/></g></g>
      <g><path d="M0 0 L1 1"/></g>
      <defs><path d="M0 0"/></defs>
    </svg>`);
    expect(layerTree(document.root)).toEqual([
      { kind: "layer", id: "sk-0" },
      {
        kind: "group",
        key: "g-1",
        label: "olhos",
        ids: ["sk-1", "sk-2", "sk-3"],
        children: [
          { kind: "layer", id: "sk-1" },
          {
            kind: "group",
            key: "g-1-1",
            label: "Pupila",
            ids: ["sk-2", "sk-3"],
            children: [
              { kind: "layer", id: "sk-2" },
              { kind: "layer", id: "sk-3" },
            ],
          },
        ],
      },
      { kind: "layer", id: "sk-4" },
    ]);
  });
});

/** Circle of radius 10 around (50, 50), starting at 3 o'clock, drawn 2× bigger on screen. */
const circle: GeometryLike = {
  getTotalLength: () => 2 * Math.PI * 10,
  getPointAtLength: (length) => {
    const angle = length / 10;
    return { x: 50 + 10 * Math.cos(angle), y: 50 + 10 * Math.sin(angle) };
  },
  getScreenCTM: () => ({ a: 2, b: 0, c: 0, d: 2, e: 5, f: 5 }),
};

describe("pickPathFraction", () => {
  it("finds the fraction of the outline closest to a screen point", () => {
    // Bottom of the circle (a quarter turn clockwise in SVG coordinates) is at (50, 60) → (105, 125).
    expect(pickPathFraction(circle, { x: 105, y: 125 })).toBeCloseTo(0.25, 3);
    // Clicking outside the outline still picks the nearest point: left side.
    expect(pickPathFraction(circle, { x: 0, y: 105 })).toBeCloseTo(0.5, 3);
    // Right at the start (or the end, for a closed outline) is 0.
    expect(pickPathFraction(circle, { x: 125, y: 105 })).toBe(0);
  });

  it("round-trips with pointAtFraction and handles degenerate geometry", () => {
    const point = pointAtFraction(circle, 0.6);
    expect(pickPathFraction(circle, point)).toBeCloseTo(0.6, 3);
    const empty = { ...circle, getTotalLength: () => 0 };
    expect(pickPathFraction(empty, { x: 0, y: 0 })).toBe(0);
    const unrendered = { ...circle, getScreenCTM: () => null };
    expect(pickPathFraction(unrendered, { x: 50, y: 60 })).toBeCloseTo(0.25, 3);
    expect(nearestIndex([], { x: 0, y: 0 })).toBe(0);
  });
});

describe("pickNearestOutline", () => {
  const moved: GeometryLike = {
    ...circle,
    getScreenCTM: () => ({ a: 2, b: 0, c: 0, d: 2, e: 205, f: 5 }),
  };
  const candidates = [
    { id: "left", geometry: circle },
    { id: "right", geometry: moved },
  ];

  it("picks the closest outline and where to start on it", () => {
    // Bottom of the right circle, a little outside the stroke.
    expect(pickNearestOutline(candidates, { x: 305, y: 130 })).toEqual({
      id: "right",
      fraction: expect.closeTo(0.25, 3),
    });
    expect(pickNearestOutline(candidates, { x: 60, y: 105 })?.id).toBe("left");
  });

  it("ignores clicks far from every outline", () => {
    expect(pickNearestOutline(candidates, { x: 105, y: 400 }, 24)).toBeNull();
    expect(pickNearestOutline([], { x: 0, y: 0 })).toBeNull();
  });
});

describe("reconcileSpec", () => {
  const svg = (shapes: string) =>
    load(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10">${shapes}</svg>`);

  it("keeps tracks and edits of elements that still exist and animates new ones", () => {
    let spec = applyPreset(createEmptySpec(), ["sk-0", "sk-1"], "comet");
    spec = updateTrackTiming(spec, "track-0", { duration: 999 });
    spec = updateLayers(spec, ["sk-0", "sk-1"], { stroke: "#f00" });
    const next = svg('<path d="M0 0 L1 1" stroke="red"/>'.repeat(3));
    const result = reconcileSpec(spec, next);
    expect(result.kept).toEqual(["sk-0", "sk-1"]);
    expect(result.added).toEqual(["sk-2"]);
    expect(result.removed).toEqual([]);
    expect(result.spec.tracks.map((track) => [track.preset, track.targets])).toEqual([
      ["comet", ["sk-0", "sk-1"]],
      ["draw", ["sk-2"]],
    ]);
    expect(result.spec.tracks[0]?.timing.duration).toBe(999);
    expect(result.spec.global.autoStroke.enabled).toBe(false);
  });

  it("drops what disappeared and turns auto-stroke on for new fill-only elements", () => {
    let spec = applyPreset(createEmptySpec(), ["sk-0", "sk-1", "sk-2"], "draw");
    spec = updateLayers(spec, ["sk-2"], { hidden: true });
    const result = reconcileSpec(spec, svg('<path d="M0 0 L1 1" stroke="red"/>'));
    expect(result.removed).toEqual(["sk-1", "sk-2"]);
    expect(result.spec.tracks).toHaveLength(1);
    expect("layers" in result.spec).toBe(false);

    const grown = reconcileSpec(result.spec, svg('<path d="M0 0" stroke="red"/><rect/>'));
    expect(grown.added).toEqual(["sk-1"]);
    expect(grown.spec.global.autoStroke.enabled).toBe(true);
  });
});
