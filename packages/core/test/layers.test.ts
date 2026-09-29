import { describe, expect, it } from "vitest";
import { applyPreset, createEmptySpec } from "../src/spec/defaults";
import {
  colorSchema,
  getLayer,
  layerTokens,
  pickLayers,
  resetLayers,
  updateLayers,
} from "../src/spec/layers";
import { parseSpec } from "../src/spec/migrate";
import type { DrawableElement } from "../src/svg/types";
import { canonicalJson } from "../src/util/hash";

const element = (id: string): DrawableElement => ({
  id,
  tag: "path",
  hasFill: true,
  hasStroke: false,
});

describe("colorSchema", () => {
  it.each([
    "#fff",
    "#1d4ed8",
    "#1d4ed8cc",
    "rgb(29, 78, 216)",
    "rgb(29 78 216 / 50%)",
    "hsl(220deg 80% 50%)",
    "oklch(0.62 0.19 259.8)",
    "currentColor",
    "rebeccapurple",
    "none",
  ])("accepts %s", (value) => {
    expect(colorSchema.safeParse(value).success).toBe(true);
  });

  it.each([
    "red;} svg{display:none",
    "red; background: url(https://evil.test/x.png)",
    "url(#grad)",
    "var(--x)",
    "expression(alert(1))",
    "rgb(1,2,3);",
    "#12345",
    "",
    "red</style><script>",
  ])("rejects %s", (value) => {
    expect(colorSchema.safeParse(value).success).toBe(false);
  });
});

describe("layer overrides", () => {
  const base = applyPreset(createEmptySpec(), ["sk-0", "sk-1"], "draw-fill");

  it("leaves `layers` out of specs without edits", () => {
    expect("layers" in base).toBe(false);
    const edited = updateLayers(base, ["sk-0"], { stroke: "#f00" });
    expect(resetLayers(edited, ["sk-0"])).toEqual(base);
    expect(canonicalJson(resetLayers(edited, ["sk-0"]))).toBe(canonicalJson(base));
  });

  it("patches several layers and clears fields with undefined", () => {
    let spec = updateLayers(base, ["sk-0", "sk-1"], { stroke: "#f00", strokeWidth: 3 });
    expect(getLayer(spec, "sk-1")).toEqual({ stroke: "#f00", strokeWidth: 3 });
    spec = updateLayers(spec, ["sk-1"], { stroke: undefined });
    expect(getLayer(spec, "sk-1")).toEqual({ strokeWidth: 3 });
    spec = updateLayers(spec, ["sk-1"], { strokeWidth: undefined });
    expect(spec.layers).toEqual({ "sk-0": { stroke: "#f00", strokeWidth: 3 } });
    expect(getLayer(spec, "sk-9")).toEqual({});
  });

  it("keeps only the given layers", () => {
    const spec = updateLayers(base, ["sk-0", "sk-1"], { hidden: true });
    expect(pickLayers(spec, new Set(["sk-1"])).layers).toEqual({ "sk-1": { hidden: true } });
    expect("layers" in pickLayers(spec, new Set())).toBe(false);
  });

  it("validates overrides inside the spec", () => {
    const spec = updateLayers(base, ["sk-0"], { start: 0.25, reverse: true, linecap: "round" });
    expect(parseSpec(spec)).toEqual(spec);
    expect(() => parseSpec({ ...spec, layers: { "sk-0": { start: 2 } } })).toThrow();
    expect(() => parseSpec({ ...spec, layers: { "sk-0": { stroke: "red;}" } } })).toThrow();
    expect(() => parseSpec({ ...spec, layers: { "sk-0": { blur: 2 } } })).toThrow();
  });

  it("derives unique CSS tokens from names or ids", () => {
    const spec = updateLayers(
      updateLayers(base, ["sk-0", "sk-2"], { name: "Olho Esquerdo" }),
      ["sk-3"],
      { name: "stroke" },
    );
    const tokens = layerTokens(spec, ["sk-0", "sk-1", "sk-2", "sk-3"].map(element));
    expect([...tokens.values()]).toEqual([
      "olho-esquerdo",
      "layer-1",
      "olho-esquerdo-2",
      "layer-stroke",
    ]);
  });
});
