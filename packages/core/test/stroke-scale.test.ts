import { describe, expect, it } from "vitest";
import { compile } from "../src/compile/compile";
import { applyPreset, createEmptySpec } from "../src/spec/defaults";
import { migrate, parseSpec } from "../src/spec/migrate";
import { importSvg } from "../src/svg/import";
import { parseLength } from "../src/svg/normalize";
import { strokeScales, toUserWidth, toVisualWidth } from "../src/svg/stroke-scale";
import { fixture, parser } from "./helpers";

const load = (name: string) => importSvg(fixture(name), { parser }).document;
const fromMarkup = (markup: string) => importSvg(markup, { parser }).document;
const svgWith = (body: string, viewBox = "0 0 100 100") =>
  fromMarkup(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}">${body}</svg>`);

describe("stroke width in visual units", () => {
  it("looks the same in a small and a large viewBox", () => {
    const small = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M2 2h20v20z" fill="red"/></svg>`;
    const large = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2000 2000"><path d="M2 2h20v20z" fill="red"/></svg>`;
    const widthFor = (markup: string) => {
      const document = fromMarkup(markup);
      const spec = applyPreset(createEmptySpec(), ["sk-0"], "draw-fill");
      spec.global.autoStroke = { enabled: true, width: 5 };
      const user = Number(compile(document, spec).rules[0]?.props["stroke-width"]);
      return user / document.viewBox[2];
    };
    expect(widthFor(small)).toBeCloseTo(widthFor(large), 5);
  });

  it("compensates a scale() on an ancestor group", () => {
    const document = svgWith(
      '<g transform="scale(0.1,-0.1)"><path d="M0 0h500v500z" fill="red"/></g>',
    );
    const { unit, scales } = strokeScales(document);
    expect(scales.get("sk-0")).toBeCloseTo(0.1);
    const spec = applyPreset(createEmptySpec(), ["sk-0"], "draw-fill");
    spec.global.autoStroke = { enabled: true, width: 2 };
    const user = Number(compile(document, spec).rules[0]?.props["stroke-width"]);
    // Drawn in a space shrunk 10×: the CSS width is 10× larger so the on-screen width holds.
    expect(user * 0.1).toBeCloseTo(2 * unit, 2);
  });

  it("converts back and forth", () => {
    expect(toVisualWidth(toUserWidth(7, 2.4, 0.5), 2.4, 0.5)).toBeCloseTo(7, 1);
  });

  it("leaves widths untouched for specs from before v2 (user units)", () => {
    const spec = applyPreset(createEmptySpec(), ["sk-0"], "draw-fill");
    spec.global.autoStroke = { enabled: true, width: 3 };
    spec.global.strokeUnit = "user";
    const compiled = compile(load("simple-stroke.svg"), spec);
    expect(compiled.rules[0]?.props["stroke-width"]).toBeUndefined();
    const fillOnly = compile(load("fill-only.svg"), {
      ...spec,
      tracks: applyPreset(createEmptySpec(), ["sk-0"], "draw-fill").tracks,
    });
    expect(fillOnly.rules[0]?.props["stroke-width"]).toBe("3");
  });
});

describe("spec v1 → v2 migration", () => {
  const v1 = {
    version: 1,
    name: "Antiga",
    global: {
      autoStroke: { enabled: true, width: 4 },
      a11y: { label: "Logo", mode: "img" },
    },
    tracks: [],
  };

  it("keeps the old meaning of widths", () => {
    const spec = parseSpec(v1);
    expect(spec.version).toBe(2);
    expect(spec.global.strokeUnit).toBe("user");
    expect(spec.global.autoStroke.width).toBe(4);
  });

  it("does not mutate its input", () => {
    const copy = structuredClone(v1);
    migrate(v1);
    expect(v1).toEqual(copy);
  });

  it("new specs are visual", () => {
    expect(parseSpec(createEmptySpec()).global.strokeUnit).toBe("visual");
  });
});

describe("parseLength", () => {
  it("reads absolute CSS units and rejects context-dependent ones", () => {
    expect(parseLength("2")).toBe(2);
    expect(parseLength("2px")).toBe(2);
    expect(parseLength("1in")).toBe(96);
    expect(parseLength("25.4mm")).toBeCloseTo(96);
    expect(parseLength("1em")).toBeUndefined();
    expect(parseLength("50%")).toBeUndefined();
  });
});
