import { describe, expect, it } from "vitest";
import { applyPreset, createEmptySpec } from "../src/spec/defaults";
import { updateLayers } from "../src/spec/layers";
import { groupLayers, ungroupLayers } from "../src/svg/group";
import { importSvg } from "../src/svg/import";
import { layerPath, layerTree, nodeIds } from "../src/svg/layers";
import { moveElements } from "../src/svg/move";
import { accumulatedMatrices } from "../src/svg/stroke-scale";
import { walkElements } from "../src/svg/tree";
import { parser } from "./helpers";

const svg = (body: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">${body}</svg>`;
const load = (markup: string) => importSvg(markup, { parser }).document;

/** The `d` (or `cx`) of each drawable in document order: tells which element is which. */
const order = (markup: string) => {
  const found: string[] = [];
  walkElements(load(markup).root, (element) => {
    if (element.attrs["data-sk-id"]) found.push(element.attrs.d ?? element.attrs.cx ?? "?");
    return undefined;
  });
  return found;
};

function setup(body: string) {
  const document = load(svg(body));
  const spec = applyPreset(
    createEmptySpec(),
    document.elements.map((element) => element.id),
    "draw-fill",
  );
  return { document, spec };
}

const FLAT = `
  <path d="M0 0h10" stroke="red"/>
  <path d="M0 5h10" stroke="red"/>
  <path d="M0 9h10" stroke="red"/>
  <circle cx="50" cy="50" r="5" stroke="red"/>`;

describe("groupLayers", () => {
  it("wraps two siblings of the root in a new group", () => {
    const { document, spec } = setup(FLAT);
    const result = groupLayers(document, spec, ["sk-0", "sk-1"]);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.ids).toEqual(["sk-0", "sk-1"]);
    const tree = layerTree(load(result.markup).root);
    expect(tree.map((node) => node.kind)).toEqual(["group", "layer", "layer"]);
    expect(tree[0] && nodeIds(tree[0])).toEqual(["sk-0", "sk-1"]);
  });

  it("puts the group where the top layer was, so the ones in between move up next to it", () => {
    const { document, spec } = setup(FLAT);
    // sk-0 and sk-2 grouped: the group lands at sk-2, sk-1 ends up below it.
    const result = groupLayers(document, spec, ["sk-0", "sk-2"]);
    if (!result.ok) throw new Error("expected a group");
    // Document order is now: the one left out (M0 5), the two grouped, then the circle.
    expect(order(result.markup)).toEqual(["M0 5h10", "M0 0h10", "M0 9h10", "50"]);
    const tree = layerTree(load(result.markup).root);
    expect(tree.map((node) => node.kind)).toEqual(["layer", "group", "layer"]);
    // The layer that was sk-1 is now sk-0; the grouped ones are sk-1 and sk-2.
    expect(result.ids).toEqual(["sk-1", "sk-2"]);
  });

  it("carries animations and edits to the renumbered ids", () => {
    const { document, spec } = setup(FLAT);
    const edited = updateLayers(spec, ["sk-1"], { strokeWidth: 7 });
    const result = groupLayers(document, edited, ["sk-0", "sk-2"]);
    if (!result.ok) throw new Error("expected a group");
    // sk-1 (the one left out) is the first now.
    expect(result.spec.layers).toEqual({ "sk-0": { strokeWidth: 7 } });
    expect(result.spec.tracks.flatMap((track) => track.targets).sort()).toEqual([
      "sk-0",
      "sk-1",
      "sk-2",
      "sk-3",
    ]);
  });

  it("groups whole groups with other layers, inside their common group", () => {
    const { document, spec } = setup(
      `<g opacity="0.5" id="outer"><g><path d="M0 0h10" stroke="red"/><path d="M0 1h10" stroke="red"/></g><path d="M0 2h10" stroke="red"/><path d="M0 3h10" stroke="red"/></g><circle cx="5" cy="5" r="2" stroke="red"/>`,
    );
    const result = groupLayers(document, spec, ["sk-0", "sk-1", "sk-2"]);
    if (!result.ok) throw new Error("expected a group");
    const next = load(result.markup);
    // The new group is still under the opacity of `outer`: nothing changed in how it looks.
    const [first] = layerPath(layerTree(next.root), "sk-0") ?? [];
    expect(first?.kind).toBe("group");
    const outer = next.root.children.find(
      (child) => child.type === "element" && child.name === "g",
    );
    expect(outer?.type === "element" && outer.attrs.opacity).toBe("0.5");
  });

  it("refuses fewer than two, or two that are one thing", () => {
    const { document, spec } = setup(
      `<g><path d="M0 0h10" stroke="red"/><path d="M0 1h10" stroke="red"/></g>${FLAT}`,
    );
    expect(groupLayers(document, spec, ["sk-0"])).toEqual({ ok: false, code: "too-few" });
    expect(groupLayers(document, spec, [])).toEqual({ ok: false, code: "too-few" });
    expect(groupLayers(document, spec, ["sk-99", "sk-98"])).toEqual({ ok: false, code: "too-few" });
    // Both are the two children of the same group: that group already is the level.
    const flat = groupLayers(document, spec, ["sk-0", "sk-1"]);
    expect(flat.ok).toBe(true);
  });

  it("refuses a selection that cuts a group in half", () => {
    const { document, spec } = setup(
      `<g opacity="0.5"><path d="M0 0h10" stroke="red"/><path d="M0 1h10" stroke="red"/></g><path d="M0 2h10" stroke="red"/>`,
    );
    expect(groupLayers(document, spec, ["sk-0", "sk-2"])).toEqual({
      ok: false,
      code: "partial-group",
    });
  });

  it("does not touch the original document", () => {
    const { document, spec } = setup(FLAT);
    const before = JSON.stringify(document.root);
    groupLayers(document, spec, ["sk-0", "sk-1"]);
    expect(JSON.stringify(document.root)).toBe(before);
  });
});

describe("ungroupLayers", () => {
  it("dissolves a group, keeping ids and the spec", () => {
    const { document, spec } = setup(
      `<g><path d="M0 0h10" stroke="red"/><path d="M0 1h10" stroke="red"/></g>${FLAT}`,
    );
    const result = ungroupLayers(document, spec, ["sk-0", "sk-1"]);
    if (!result.ok) throw new Error("expected to ungroup");
    expect(result.spec).toBe(spec);
    expect(layerTree(load(result.markup).root).every((node) => node.kind === "layer")).toBe(true);
    expect(order(result.markup)).toEqual(
      order(svg(`<g><path d="M0 0h10" stroke="red"/><path d="M0 1h10" stroke="red"/></g>${FLAT}`)),
    );
  });

  it("moves the group's transform onto each child, so nothing shifts", () => {
    const { document, spec } = setup(
      `<g transform="translate(10 0)"><path d="M0 0h10" stroke="red" transform="rotate(90)"/><path d="M0 1h10" stroke="red"/></g>${FLAT}`,
    );
    const before = accumulatedMatrices(document.root);
    const result = ungroupLayers(document, spec, ["sk-0", "sk-1"]);
    if (!result.ok) throw new Error("expected to ungroup");
    const after = accumulatedMatrices(load(result.markup).root);
    for (const id of ["sk-0", "sk-1"]) {
      const a = before.get(id);
      const b = after.get(id);
      expect(a && b).toBeTruthy();
      for (const [index, value] of (a ?? []).entries()) expect(b?.[index]).toBeCloseTo(value);
    }
  });

  it("refuses a group with a look of its own, and when there is none", () => {
    const { document, spec } = setup(
      `<g opacity="0.5"><path d="M0 0h10" stroke="red"/><path d="M0 1h10" stroke="red"/></g>${FLAT}`,
    );
    expect(ungroupLayers(document, spec, ["sk-0", "sk-1"])).toEqual({
      ok: false,
      code: "group-has-style",
    });
    expect(ungroupLayers(document, spec, ["sk-2", "sk-3"])).toEqual({
      ok: false,
      code: "no-group",
    });
    expect(ungroupLayers(document, spec, ["sk-0"])).toEqual({ ok: false, code: "no-group" });
  });

  it("is the inverse of grouping, for a group at the end of the document", () => {
    const { document, spec } = setup(FLAT);
    const grouped = groupLayers(document, spec, ["sk-2", "sk-3"]);
    if (!grouped.ok) throw new Error("expected a group");
    const back = ungroupLayers(load(grouped.markup), grouped.spec, grouped.ids);
    if (!back.ok) throw new Error("expected to ungroup");
    expect(layerTree(load(back.markup).root).map((node) => node.kind)).toEqual([
      "layer",
      "layer",
      "layer",
      "layer",
    ]);
  });
});

describe("moveElements on groups", () => {
  const body = `<g id="pair"><path d="M0 0h10" stroke="red"/><path d="M0 1h10" stroke="red"/></g><path d="M0 2h10" stroke="red"/>`;
  const transforms = (markup: string) => {
    const next = load(markup);
    const group = next.root.children.find(
      (child) => child.type === "element" && child.name === "g",
    );
    const inner = group?.type === "element" ? group.children : [];
    return {
      group: group?.type === "element" ? group.attrs.transform : undefined,
      children: inner.flatMap((child) => (child.type === "element" ? [child.attrs.transform] : [])),
    };
  };

  it("moves the group node when all its layers are selected", () => {
    const document = load(svg(body));
    const result = transforms(moveElements(document, ["sk-0", "sk-1"], 5, 5));
    expect(result.group).toBe("translate(5 5)");
    expect(result.children).toEqual([undefined, undefined]);
  });

  it("moves each layer when only some of a group are selected", () => {
    const document = load(svg(body));
    const result = transforms(moveElements(document, ["sk-0"], 5, 5));
    expect(result.group).toBeUndefined();
    expect(result.children).toEqual(["translate(5 5)", undefined]);
  });

  it("moves a group inside a scaled parent in the parent's units", () => {
    const document = load(
      svg(
        `<g transform="scale(2)"><g><path d="M0 0h10" stroke="red"/><path d="M0 1h10" stroke="red"/></g></g><path d="M0 2h10" stroke="red"/>`,
      ),
    );
    // The outer `g` holds exactly these two layers, so it is the one moved: in the root's units.
    const markup = moveElements(document, ["sk-0", "sk-1"], 10, 0);
    expect(markup).toContain('transform="translate(10 0) scale(2)"');
  });
});
