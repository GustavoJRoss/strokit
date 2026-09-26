import LZString from "lz-string";
import { describe, expect, it } from "vitest";
import {
  decodeShare,
  encodeShare,
  parseProject,
  SHARE_HASH_PREFIX,
  ShareError,
  serializeProject,
} from "../src/share";
import { applyPreset, createEmptySpec, updateTrackTiming } from "../src/spec/defaults";
import { importSvg } from "../src/svg/import";
import { fixture, parser } from "./helpers";

function shared() {
  const { document } = importSvg(fixture("illustrator-classes.svg"), { parser });
  let spec = applyPreset(createEmptySpec("Onda"), ["sk-0", "sk-1"], "yoyo");
  spec = applyPreset(spec, ["sk-2"], "stagger-draw");
  spec = updateTrackTiming(spec, "track-1", { easing: { cubicBezier: [0.2, -0.4, 0.3, 1.4] } });
  return { document, value: { svg: document.raw, spec } };
}

describe("share links", () => {
  it("round-trips SVG and spec, with or without the #s= prefix", () => {
    const { value } = shared();
    const encoded = encodeShare(value);
    expect(encoded).toMatch(/^[A-Za-z0-9+\-$]+$/);
    expect(decodeShare(encoded)).toEqual(value);
    expect(decodeShare(`${SHARE_HASH_PREFIX}${encoded}`)).toEqual(value);
  });

  it("re-importing the shared SVG gives back the same document and ids", () => {
    const { document, value } = shared();
    const reimported = importSvg(decodeShare(encodeShare(value)).svg, { parser }).document;
    expect(reimported.raw).toBe(document.raw);
    expect(reimported.elements).toEqual(document.elements);
  });

  it.each([
    ["garbage", "%%%"],
    ["not JSON", "N4Ig"],
  ])("rejects %s", (_label, value) => {
    expect(() => decodeShare(value)).toThrow(ShareError);
  });

  it("rejects payloads with a missing SVG or an invalid spec", () => {
    const { value } = shared();
    const encode = (payload: unknown) => encodeShare(payload as Parameters<typeof encodeShare>[0]);
    expect(() => decodeShare(encode({ spec: value.spec, svg: " " }))).toThrow(/SVG está faltando/);
    expect(() => decodeShare(encode({ svg: value.svg, spec: { version: 9 } }))).toThrow(/inválida/);
    expect(() => decodeShare(LZString.compressToEncodedURIComponent("null"))).toThrow(ShareError);
  });
});

describe(".strokit.json", () => {
  it("round-trips a project file", () => {
    const { value } = shared();
    const text = serializeProject(value);
    expect(JSON.parse(text)).toMatchObject({ format: "strokit", version: 1 });
    expect(parseProject(text)).toEqual(value);
  });

  it("rejects other files", () => {
    expect(() => parseProject("{")).toThrow(/JSON válido/);
    expect(() => parseProject('{"format":"lottie"}')).toThrow(/projeto do strokit/);
    expect(() => parseProject("null")).toThrow(/projeto do strokit/);
  });
});

describe("share error codes", () => {
  it.each([
    ["%%%", "corrupt-link"],
    [LZString.compressToEncodedURIComponent("null"), "invalid-content"],
    [LZString.compressToEncodedURIComponent('{"svg":" ","spec":{}}'), "missing-svg"],
    [
      LZString.compressToEncodedURIComponent('{"svg":"<svg/>","spec":{"version":9}}'),
      "invalid-spec",
    ],
  ])("decodeShare(%s) → %s", (value, code) => {
    expect(() => decodeShare(value)).toThrowError(expect.objectContaining({ code }));
  });

  it("parseProject reports invalid JSON and foreign files", () => {
    expect(() => parseProject("{")).toThrowError(expect.objectContaining({ code: "invalid-json" }));
    expect(() => parseProject("[]")).toThrowError(expect.objectContaining({ code: "not-project" }));
  });
});
