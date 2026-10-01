import { describe, expect, it } from "vitest";
import { applyPreset, createEmptySpec } from "../src/spec/defaults";
import { updateLayers } from "../src/spec/layers";
import { deleteLayers } from "../src/svg/delete";
import { importSvg } from "../src/svg/import";
import { parser } from "./helpers";

const MARKUP = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <g id="pair"><path d="M0 0h10" stroke="red"/><path d="M0 10h10" stroke="red"/></g>
  <path d="M0 20h10" stroke="red"/>
  <circle cx="50" cy="50" r="5" stroke="red"/>
</svg>`;

function setup() {
  const { document } = importSvg(MARKUP, { parser });
  let spec = applyPreset(
    createEmptySpec(),
    document.elements.map((element) => element.id),
    "draw-fill",
  );
  spec = updateLayers(spec, ["sk-2"], { strokeWidth: 5 });
  spec = updateLayers(spec, ["sk-3"], { stroke: "#ffffff" });
  return { document, spec };
}

describe("deleteLayers", () => {
  it("removes the layers and renumbers what is left, carrying tracks and edits along", () => {
    const { document, spec } = setup();
    const result = deleteLayers(document, spec, ["sk-0", "sk-2"]);
    expect(result.removed).toBe(2);
    expect(result.spec.tracks[0]?.targets).toEqual(["sk-0", "sk-1"]);
    // The circle (was sk-3) is now sk-1 and keeps its color; the edit of the deleted path is gone.
    expect(result.spec.layers).toEqual({ "sk-1": { stroke: "#ffffff" } });

    const next = importSvg(result.markup ?? "", { parser }).document;
    expect(next.elements.map((element) => element.tag)).toEqual(["path", "circle"]);
  });

  it("does not touch the original document or spec", () => {
    const { document, spec } = setup();
    const raw = document.raw;
    const before = structuredClone(spec);
    deleteLayers(document, spec, ["sk-1"]);
    expect(document.raw).toBe(raw);
    expect(spec).toEqual(before);
  });

  it("drops a group that is left empty", () => {
    const { document, spec } = setup();
    const result = deleteLayers(document, spec, ["sk-0", "sk-1"]);
    expect(result.markup).not.toContain("<g");
    expect(importSvg(result.markup ?? "", { parser }).document.elements).toHaveLength(2);
  });

  it("keeps a group that still has layers", () => {
    const { document, spec } = setup();
    const result = deleteLayers(document, spec, ["sk-0"]);
    expect(result.markup).toContain('id="pair"');
  });

  it("reports nothing left when every layer goes, without layers in the spec", () => {
    const { document, spec } = setup();
    const result = deleteLayers(document, spec, ["sk-0", "sk-1", "sk-2", "sk-3"]);
    expect(result.markup).toBeNull();
    expect(result.removed).toBe(4);
    expect(result.spec.tracks).toEqual([]);
    expect(result.spec.layers).toBeUndefined();
  });

  it("ignores ids that do not exist", () => {
    const { document, spec } = setup();
    const result = deleteLayers(document, spec, ["sk-9"]);
    expect(result.removed).toBe(0);
    expect(result.spec).toBe(spec);
  });

  it("splits a track's step chain correctly when a whole track goes", () => {
    const { document } = setup();
    let spec = applyPreset(createEmptySpec(), ["sk-0"], "draw-fill");
    spec = applyPreset(spec, ["sk-1", "sk-2", "sk-3"], "comet");
    const result = deleteLayers(document, spec, ["sk-0"]);
    expect(result.spec.tracks).toHaveLength(1);
    expect(result.spec.tracks[0]?.targets).toEqual(["sk-0", "sk-1", "sk-2"]);
  });
});
