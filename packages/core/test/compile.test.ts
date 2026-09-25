import { describe, expect, it } from "vitest";
import { compile } from "../src/compile/compile";
import { applyPreset, createEmptySpec } from "../src/spec/defaults";
import { importSvg } from "../src/svg/import";
import { serializeSvg } from "../src/svg/serialize";
import { hashString } from "../src/util/hash";
import { fixture, parser } from "./helpers";

const load = (name: string) => importSvg(fixture(name), { parser }).document;

describe("compile", () => {
  it("produces rules, namespaced keyframes and pathLength for every target", () => {
    const document = load("simple-stroke.svg");
    const spec = applyPreset(createEmptySpec(), ["sk-0", "sk-1"], "draw");
    const compiled = compile(document, spec);

    expect(compiled.id).toMatch(/^sk-[0-9a-z]+$/);
    expect(compiled.keyframes.map((definition) => definition.name)).toEqual(["t0-draw"]);
    expect(compiled.rules).toHaveLength(2);
    expect(compiled.rules[0]).toMatchObject({
      elementId: "sk-0",
      trackId: "track-0",
      props: { stroke: "var(--sk-stroke, #1d4ed8)", "stroke-dasharray": "1 1" },
      animations: [{ keyframes: "t0-draw", duration: 1500 }],
    });
    expect(serializeSvg(compiled.root)).toContain('data-sk-id="sk-0" pathLength="1"');
    expect(compiled.warnings).toEqual([]);
    // The source document is untouched.
    expect(document.raw).not.toContain("pathLength");
  });

  it("is deterministic and changes id when the spec changes", () => {
    const document = load("simple-stroke.svg");
    const spec = applyPreset(createEmptySpec(), ["sk-0"], "draw");
    expect(compile(document, spec).id).toBe(compile(document, spec).id);
    expect(compile(document, { ...spec, name: "outra" }).id).not.toBe(compile(document, spec).id);
  });

  it("warns about fill-only elements when auto-stroke is off", () => {
    const document = load("fill-only.svg");
    const compiled = compile(document, applyPreset(createEmptySpec(), ["sk-0"], "draw"));
    expect(compiled.warnings).toEqual([
      { code: "missing-stroke", trackId: "track-0", elementId: "sk-0" },
    ]);
    expect(compiled.rules[0]?.props).toEqual({ "stroke-dasharray": "1 1" });
  });

  it("adds a stroke from the fill color when auto-stroke is on (RF4)", () => {
    const document = load("fill-only.svg");
    const spec = applyPreset(createEmptySpec(), ["sk-0", "sk-1"], "draw");
    spec.global.autoStroke = { enabled: true, width: 3 };
    const compiled = compile(document, spec);
    expect(compiled.warnings).toEqual([]);
    expect(compiled.rules.map((rule) => rule.props)).toEqual([
      { stroke: "var(--sk-stroke, #0f172a)", "stroke-width": "3", "stroke-dasharray": "1 1" },
      { stroke: "var(--sk-stroke, #f97316)", "stroke-width": "3", "stroke-dasharray": "1 1" },
    ]);
  });

  it("skips targets that do not exist in the document", () => {
    const document = load("simple-stroke.svg");
    const compiled = compile(document, applyPreset(createEmptySpec(), ["sk-9", "sk-1"], "draw"));
    expect(compiled.rules.map((rule) => rule.elementId)).toEqual(["sk-1"]);
    expect(compiled.warnings).toEqual([
      { code: "unknown-target", trackId: "track-0", elementId: "sk-9" },
    ]);
  });
});

describe("hashString", () => {
  it("is stable FNV-1a in base36", () => {
    expect(hashString("")).toBe((0x811c9dc5).toString(36));
    expect(hashString("a")).toBe(hashString("a"));
    expect(hashString("a")).not.toBe(hashString("b"));
  });
});

describe("auto-stroke fill handling", () => {
  it("ghosts the fill for trace presets so a same-color dash stays visible", () => {
    const document = load("fill-only.svg");
    const spec = applyPreset(createEmptySpec(), ["sk-0"], "yoyo");
    spec.global.autoStroke.enabled = true;
    const rule = compile(document, spec).rules[0];
    expect(rule?.props["fill-opacity"]).toBe("0.2");
    expect(rule?.reducedMotion["fill-opacity"]).toBe("1");
  });

  it("keeps the fill for reveal presets and for elements that already have a stroke", () => {
    const fillOnly = load("fill-only.svg");
    const drawFill = applyPreset(createEmptySpec(), ["sk-0"], "draw-fill");
    drawFill.global.autoStroke.enabled = true;
    expect(compile(fillOnly, drawFill).rules[0]?.props["fill-opacity"]).toBeUndefined();

    const stroked = load("simple-stroke.svg");
    const comet = applyPreset(createEmptySpec(), ["sk-0"], "comet");
    comet.global.autoStroke.enabled = true;
    expect(compile(stroked, comet).rules[0]?.props["fill-opacity"]).toBeUndefined();
  });
});
