import { describe, expect, it } from "vitest";
import { compile } from "../src/compile/compile";
import { exportCss } from "../src/exporters/css";
import { exportMotion } from "../src/exporters/motion";
import { exportReact } from "../src/exporters/react";
import { animationLength, sampleAnimation } from "../src/render/frame";
import { trackTimes } from "../src/spec/chain";
import {
  appendStep,
  applyPreset,
  chainOf,
  createEmptySpec,
  moveStep,
  removeStep,
  updateTrackTiming,
} from "../src/spec/defaults";
import { parseSpec } from "../src/spec/migrate";
import { reconcileSpec } from "../src/spec/reconcile";
import { importSvg } from "../src/svg/import";
import { serializeSvg } from "../src/svg/serialize";
import { fixture, parser } from "./helpers";

const load = () => importSvg(fixture("illustrator-classes.svg"), { parser }).document;

/** draw-fill (2000 ms) → pulse (1400 ms, infinite) on sk-0 and sk-3, both with a fill. */
function drawThenPulse() {
  const first = applyPreset(createEmptySpec(), ["sk-0", "sk-3"], "draw-fill");
  first.global.autoStroke.enabled = true;
  return appendStep(first, ["sk-0", "sk-3"], "pulse");
}

describe("chained tracks", () => {
  it("appendStep chains after the tail and makes a looping tail finite", () => {
    const first = applyPreset(createEmptySpec(), ["sk-0"], "pulse");
    const spec = appendStep(first, ["sk-0"], "spin");
    expect(spec.tracks.map((track) => [track.preset, track.after])).toEqual([
      ["pulse", undefined],
      ["spin", "track-0"],
    ]);
    expect(spec.tracks[0]?.timing.iterations).toBe(1);
    expect(spec.tracks[1]?.timing.iterations).toBe("infinite");
    expect(chainOf(spec, "sk-0").map((track) => track.preset)).toEqual(["pulse", "spin"]);
    expect(() => parseSpec(spec)).not.toThrow();
  });

  it("appendStep splits elements whose chains end in different tracks", () => {
    let spec = applyPreset(createEmptySpec(), ["sk-0", "sk-1"], "draw-fill");
    spec = appendStep(spec, ["sk-0"], "pulse");
    spec = appendStep(spec, ["sk-0", "sk-1"], "shine");
    const shines = spec.tracks.filter((track) => track.preset === "shine");
    expect(shines.map((track) => [track.targets, track.after])).toEqual([
      [["sk-0"], "track-1"],
      [["sk-1"], "track-0"],
    ]);
    expect(() => parseSpec(spec)).not.toThrow();
  });

  it("an outline preset can only start a chain", () => {
    const spec = applyPreset(createEmptySpec(), ["sk-0"], "pulse");
    expect(appendStep(spec, ["sk-0"], "draw-fill")).toBe(spec);
    expect(appendStep(spec, ["sk-1"], "draw-fill").tracks).toHaveLength(2);
  });

  it("removeStep reconnects the neighbours; applyPreset replaces the whole chain", () => {
    let spec = appendStep(drawThenPulse(), ["sk-0", "sk-3"], "spin");
    const [head, middle, tail] = spec.tracks.map((track) => track.id) as [string, string, string];
    spec = removeStep(spec, middle);
    expect(spec.tracks.find((track) => track.id === tail)?.after).toBe(head);
    expect(spec.tracks.find((track) => track.id === head)?.after).toBeUndefined();
    const replaced = applyPreset(spec, ["sk-0", "sk-3"], "comet");
    expect(replaced.tracks.map((track) => track.preset)).toEqual(["comet"]);
    expect(replaced.tracks[0]?.after).toBeUndefined();
  });

  it("moveStep swaps animations but refuses invalid orders", () => {
    const spec = appendStep(
      appendStep(applyPreset(createEmptySpec(), ["sk-0"], "fade"), ["sk-0"], "pulse"),
      ["sk-0"],
      "spin",
    );
    const moved = moveStep(spec, "track-0", 1);
    expect(chainOf(moved, "sk-0").map((track) => track.preset)).toEqual(["pulse", "fade", "spin"]);
    // The looping spin cannot go to the middle.
    expect(moveStep(spec, "track-2", -1)).toBe(spec);
    // An outline preset cannot leave the first place.
    const outline = appendStep(
      applyPreset(createEmptySpec(), ["sk-0"], "draw-fill"),
      ["sk-0"],
      "pulse",
    );
    expect(moveStep(outline, "track-0", 1)).toBe(outline);
    expect(moveStep(outline, "track-0", -1)).toBe(outline);
  });

  it("validation rejects broken chains", () => {
    const spec = drawThenPulse();
    const [first, second] = spec.tracks;
    if (!first || !second) throw new Error("expected two steps");
    expect(() => parseSpec({ ...spec, tracks: [first, { ...second, after: "nope" }] })).toThrow(
      /unknown track/,
    );
    expect(() =>
      parseSpec({
        ...spec,
        tracks: [
          { ...first, after: second.id },
          { ...second, timing: { ...second.timing, iterations: 1 } },
        ],
      }),
    ).toThrow(/cycle/);
    // A looping step cannot be followed.
    expect(() =>
      parseSpec({
        ...spec,
        tracks: [{ ...first, timing: { ...first.timing, iterations: "infinite" } }, second],
      }),
    ).toThrow(/never ends/);
    // Two steps that both follow the head, on the same element, are not a chain.
    expect(() =>
      parseSpec({ ...spec, tracks: [first, second, { ...second, id: "track-9" }] }),
    ).toThrow(/already animated/);
    // Outline preset after another step.
    expect(() =>
      parseSpec({
        ...spec,
        tracks: [
          { ...first, preset: "pulse", params: second.params, timing: second.timing },
          {
            ...second,
            preset: "draw-fill",
            params: first.params,
            timing: { ...first.timing, iterations: 1 },
          },
        ],
      }),
    ).toThrow(/first step/);
  });

  it("reconcile keeps chains and reconnects them when an element goes away", () => {
    const spec = drawThenPulse();
    const { spec: next } = reconcileSpec(spec, load());
    expect(next.tracks.filter((track) => track.after !== undefined)).toHaveLength(1);
  });
});

describe("chained tracks in compile()", () => {
  it("merges the steps of an element into one rule that starts each step after the last", () => {
    const spec = drawThenPulse();
    const compiled = compile(load(), spec);
    const rules = compiled.rules.filter((rule) => rule.elementId === "sk-0");
    expect(rules).toHaveLength(1);
    const rule = rules[0];
    expect(rule?.animations.map((animation) => animation.keyframes)).toEqual([
      "t0-draw-fill",
      "t1-pulse",
    ]);
    expect(rule?.animations.map((animation) => animation.delay)).toEqual([0, 2000]);
    // Only the first step paints before it starts; later ones hold their end state.
    expect(rule?.animations.map((animation) => animation.fillMode)).toEqual(["both", "forwards"]);
    // The static outline of the first step survives, the last step decides the reduced-motion end.
    expect(rule?.props["stroke-dasharray"]).toBe("1 1");
    expect(rule?.reducedMotion.opacity).toBe("1");
    expect(rule?.reducedMotion["fill-opacity"]).toBe("1");
    expect(compiled.warnings).toEqual([]);
  });

  it("adds the step's own delay after the previous step ends", () => {
    let spec = drawThenPulse();
    spec = updateTrackTiming(spec, "track-1", { delay: 500 });
    expect(trackTimes(spec.tracks).get("track-1")).toEqual({
      start: 2500,
      end: 3900,
    });
    const rule = compile(load(), spec).rules.find((item) => item.elementId === "sk-0");
    expect(rule?.animations[1]?.delay).toBe(2500);
  });

  it("wraps transform/opacity animated by a later step in a <g> once", () => {
    const markup = serializeSvg(compile(load(), drawThenPulse()).root);
    expect(markup.match(/<g/g)?.length ?? 0).toBeLessThanOrEqual(2);
  });

  it("chains a shine overlay after an outline animation", () => {
    let spec = applyPreset(createEmptySpec(), ["sk-0", "sk-3"], "draw-fill");
    spec = appendStep(spec, ["sk-0", "sk-3"], "shine");
    const compiled = compile(load(), spec);
    const band = compiled.rules.find((rule) => rule.elementId.endsWith("-band"));
    expect(band?.animations[0]?.delay).toBe(2000);
    expect(serializeSvg(compiled.root)).toContain("<clipPath");
  });

  it("samples each step in its own window (video export parity)", () => {
    const compiled = compile(load(), drawThenPulse());
    const at = (time: number) => sampleAnimation(compiled, time).get("sk-0") ?? {};
    // During the outline the fill is still hidden; the pulse has not started.
    expect(at(500)["fill-opacity"]).toBe("0");
    expect(at(500).opacity).toBeUndefined();
    // After it, the outline holds its end state while the pulse runs.
    expect(at(2000)["fill-opacity"]).toBe("1");
    expect(Number(at(2700).opacity)).toBeLessThan(1);
    expect(animationLength(compiled)).toBe(2000 + 1400);
  });
});

describe("chained exports", () => {
  const compiled = () => compile(load(), drawThenPulse());
  const withShine = () => {
    const spec = appendStep(
      applyPreset(createEmptySpec(), ["sk-0", "sk-3"], "draw-fill"),
      ["sk-0", "sk-3"],
      "shine",
    );
    spec.global.autoStroke.enabled = true;
    return compile(load(), spec);
  };

  it("CSS lists both animations of the element, with the second one delayed", () => {
    const output = exportCss(compiled());
    expect(output).toMatchSnapshot();
    expect(output).toMatch(
      /animation: sk-\w+-t0-draw-fill 2000ms [^,]+, sk-\w+-t1-pulse 1400ms ease-in-out 2000ms infinite normal forwards;/,
    );
    expect(output).toContain("@media (prefers-reduced-motion: reduce)");
  });

  it("React and Motion keep the sequence", () => {
    const react = exportReact(compiled(), { componentName: "TestLogo" });
    expect(react).toMatchSnapshot();
    expect(react).toContain("calc(2000ms / var(--sk-speed, 1))");
    const motion = exportMotion(compiled(), { componentName: "TestLogo" });
    expect(motion).toMatchSnapshot();
  });

  it("outline then shine exports the overlay too", () => {
    const output = exportCss(withShine());
    expect(output).toMatchSnapshot();
    expect(output).toContain("var(--sk-shine, #fff)");
    expect(exportReact(withShine(), { componentName: "TestLogo" })).toMatchSnapshot();
  });
});
