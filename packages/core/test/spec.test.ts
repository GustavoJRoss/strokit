import { describe, expect, it } from "vitest";
import { ZodError } from "zod";
import { applyPreset, createEmptySpec } from "../src/spec/defaults";
import { migrate, parseSpec, SpecVersionError } from "../src/spec/migrate";
import { animationSpecSchema } from "../src/spec/schema";

describe("AnimationSpec schema", () => {
  it("accepts the default spec", () => {
    expect(animationSpecSchema.parse(createEmptySpec())).toEqual(createEmptySpec());
  });

  it("accepts a spec with a draw track and a cubic-bezier easing", () => {
    const spec = applyPreset(createEmptySpec(), ["sk-0"], "draw");
    const track = spec.tracks[0];
    if (!track) throw new Error("missing track");
    track.timing.easing = { cubicBezier: [0.2, -0.5, 0.8, 1.5] };
    track.timing.iterations = "infinite";
    expect(parseSpec(spec)).toEqual(spec);
  });

  it.each([
    ["unknown preset", { preset: "spin" }],
    ["negative delay", { timing: { delay: -1 } }],
    ["bezier x out of range", { timing: { easing: { cubicBezier: [2, 0, 0, 1] } } }],
    ["unknown draw param", { params: { speed: 2 } }],
  ])("rejects %s", (_label, patch) => {
    const spec = applyPreset(createEmptySpec(), ["sk-0"], "draw");
    const track = spec.tracks[0] as Record<string, unknown>;
    const merged = {
      ...track,
      ...patch,
      timing: { ...(track.timing as object), ...("timing" in patch ? patch.timing : {}) },
    };
    expect(() => parseSpec({ ...spec, tracks: [merged] })).toThrow(ZodError);
  });

  it("rejects an element animated by two tracks and duplicate track ids", () => {
    const spec = applyPreset(createEmptySpec(), ["sk-0"], "draw");
    const track = spec.tracks[0];
    expect(() => parseSpec({ ...spec, tracks: [track, { ...track, id: "other" }] })).toThrow(
      /already animated/,
    );
    expect(() => parseSpec({ ...spec, tracks: [track, { ...track, targets: ["sk-1"] }] })).toThrow(
      /Duplicate track id/,
    );
  });
});

describe("migrate", () => {
  it("passes v1 through", () => {
    const spec = createEmptySpec();
    expect(migrate(spec)).toBe(spec);
  });

  it.each([null, 3, "x"])("rejects non-objects (%j)", (input) => {
    expect(() => migrate(input)).toThrow(SpecVersionError);
  });

  it("rejects unknown versions", () => {
    expect(() => migrate({ version: 99 })).toThrow(/Unsupported spec version: 99/);
  });
});

describe("applyPreset", () => {
  it("creates a track from preset defaults", () => {
    const spec = applyPreset(createEmptySpec(), ["sk-1", "sk-0", "sk-1"], "draw");
    expect(spec.tracks).toEqual([
      {
        id: "track-0",
        preset: "draw",
        targets: ["sk-1", "sk-0"],
        params: {},
        timing: {
          duration: 1500,
          delay: 0,
          easing: "ease-in-out",
          iterations: 1,
          direction: "normal",
        },
      },
    ]);
  });

  it("moves targets out of their previous track and drops empty tracks", () => {
    let spec = applyPreset(createEmptySpec(), ["sk-0", "sk-1"], "draw");
    spec = applyPreset(spec, ["sk-2"], "draw");
    spec = applyPreset(spec, ["sk-1", "sk-2"], "draw");
    expect(spec.tracks.map((track) => [track.id, track.targets])).toEqual([
      ["track-0", ["sk-0"]],
      ["track-2", ["sk-1", "sk-2"]],
    ]);
    expect(() => parseSpec(spec)).not.toThrow();
  });

  it("is a no-op without targets and never mutates its input", () => {
    const empty = createEmptySpec();
    expect(applyPreset(empty, [], "draw")).toBe(empty);
    const first = applyPreset(empty, ["sk-0"], "draw");
    applyPreset(first, ["sk-0"], "draw");
    expect(first.tracks[0]?.targets).toEqual(["sk-0"]);
  });
});
