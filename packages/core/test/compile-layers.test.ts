import { describe, expect, it } from "vitest";
import { compile } from "../src/compile/compile";
import { exportCss } from "../src/exporters/css";
import { exportMotion } from "../src/exporters/motion";
import { exportReact } from "../src/exporters/react";
import { applyPreset, createEmptySpec } from "../src/spec/defaults";
import { updateLayers } from "../src/spec/layers";
import type { AnimationSpec, PresetId } from "../src/spec/schema";
import { importSvg } from "../src/svg/import";
import { serializeSvg } from "../src/svg/serialize";
import { fixture, parser } from "./helpers";

const load = (name: string) => importSvg(fixture(name), { parser }).document;

function specFor(preset: PresetId, targets = ["sk-0", "sk-1"]): AnimationSpec {
  return applyPreset(createEmptySpec(), targets, preset);
}

describe("compile × layer overrides", () => {
  it("recolors a stroke through its own token chained to --sk-stroke", () => {
    const spec = updateLayers(specFor("draw-fill"), ["sk-1"], {
      stroke: "#e11d48",
      strokeWidth: 9,
    });
    const [ring, arrow] = compile(load("simple-stroke.svg"), spec).rules;
    expect(ring?.props.stroke).toBe("var(--sk-stroke, #1d4ed8)");
    expect(arrow?.props).toMatchObject({
      stroke: "var(--sk-layer-1-stroke, var(--sk-stroke, #e11d48))",
      "stroke-width": "9",
    });
  });

  it("names tokens after the layer name", () => {
    const spec = updateLayers(specFor("draw-fill"), ["sk-0"], { name: "Anel", stroke: "red" });
    expect(compile(load("simple-stroke.svg"), spec).rules[0]?.props.stroke).toBe(
      "var(--sk-anel-stroke, var(--sk-stroke, red))",
    );
  });

  it("gives fill-only layers a chosen stroke even with auto-stroke off", () => {
    const spec = updateLayers(specFor("draw-fill"), ["sk-0"], { stroke: "#fff" });
    const compiled = compile(load("fill-only.svg"), spec);
    expect(compiled.rules[0]?.props).toMatchObject({
      stroke: "var(--sk-layer-0-stroke, var(--sk-stroke, #fff))",
      "stroke-width": "2",
    });
    expect(compiled.warnings).toEqual([
      { code: "missing-stroke", trackId: "track-0", elementId: "sk-1" },
    ]);
  });

  it("uses the recolored fill for the auto-stroke and themes the fill", () => {
    const spec = updateLayers(specFor("draw-fill"), ["sk-1"], { fill: "#22c55e", strokeWidth: 1 });
    spec.global.autoStroke.enabled = true;
    const rule = compile(load("fill-only.svg"), spec).rules[1];
    expect(rule?.props).toMatchObject({
      stroke: "var(--sk-stroke, #22c55e)",
      "stroke-width": "1",
      fill: "var(--sk-layer-1-fill, #22c55e)",
    });
  });

  it("warns when a stroke preset runs on a layer whose stroke was removed", () => {
    const spec = updateLayers(specFor("comet"), ["sk-0"], { stroke: "none" });
    const compiled = compile(load("simple-stroke.svg"), spec);
    expect(compiled.rules[0]?.props.stroke).toBe("none");
    expect(compiled.warnings).toContainEqual({
      code: "missing-stroke",
      trackId: "track-0",
      elementId: "sk-0",
    });
  });

  it("writes opacity, caps and joins as presentation attributes", () => {
    const spec = updateLayers(specFor("draw-fill"), ["sk-1"], {
      opacity: 0.5,
      linecap: "square",
      linejoin: "bevel",
    });
    const svg = serializeSvg(compile(load("simple-stroke.svg"), spec).root);
    expect(svg).toContain(
      'data-sk-id="sk-1" pathLength="1" opacity="0.5" stroke-linecap="square" stroke-linejoin="bevel"',
    );
  });

  it("moves opacity to a wrapper when the animation also sets it", () => {
    const spec = updateLayers(specFor("pulse"), ["sk-0"], { opacity: 0.4 });
    const svg = serializeSvg(compile(load("simple-stroke.svg"), spec).root);
    expect(svg).toMatch(/<g opacity="0\.4"><circle [^>]*data-sk-id="sk-0"/);
  });

  it("leaves hidden layers out of the markup and the animation", () => {
    const spec = updateLayers(specFor("comet"), ["sk-0"], { hidden: true });
    const compiled = compile(load("simple-stroke.svg"), spec);
    expect(compiled.rules.map((rule) => rule.elementId)).toEqual(["sk-1"]);
    expect(serializeSvg(compiled.root)).not.toContain('data-sk-id="sk-0"');
  });

  it("styles edited layers that no track animates, and reports unknown ones", () => {
    const spec = updateLayers(
      updateLayers(specFor("draw-fill", ["sk-0"]), ["sk-1"], { stroke: "#000", opacity: 0.3 }),
      ["sk-7"],
      { stroke: "#000" },
    );
    const compiled = compile(load("simple-stroke.svg"), spec);
    expect(compiled.rules[1]).toEqual({
      elementId: "sk-1",
      props: { stroke: "var(--sk-layer-1-stroke, var(--sk-stroke, #000))" },
      animations: [],
      reducedMotion: {},
    });
    expect(serializeSvg(compiled.root)).toContain('data-sk-id="sk-1" opacity="0.3"');
    expect(compiled.warnings).toEqual([{ code: "unknown-layer", elementId: "sk-7" }]);
  });
});

describe("exporters × layer overrides", () => {
  const edited = () => {
    let spec = specFor("draw-fill", ["sk-0"]);
    spec = updateLayers(spec, ["sk-0"], { name: "Anel", stroke: "#e11d48", linecap: "butt" });
    spec = updateLayers(spec, ["sk-1"], { stroke: "#0ea5e9", strokeWidth: 3, opacity: 0.8 });
    return compile(load("simple-stroke.svg"), spec);
  };

  it("css", () => {
    const output = exportCss(edited());
    expect(output).toMatchSnapshot();
    expect(output).toContain("@media (prefers-reduced-motion: reduce)");
  });

  it("react", () => {
    expect(exportReact(edited(), { componentName: "Edited" })).toMatchSnapshot();
  });

  it("motion", () => {
    expect(exportMotion(edited(), { componentName: "Edited" })).toMatchSnapshot();
  });
});
