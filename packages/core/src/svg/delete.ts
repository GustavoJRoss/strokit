import { remapSpec } from "../spec/remap";
import type { AnimationSpec } from "../spec/schema";
import { serializeSvg } from "./serialize";
import { cloneNode, removeElements, type SvgElementNode } from "./tree";
import type { SvgDocument } from "./types";

export type DeleteLayersResult = {
  /** The SVG without those layers, ready to import; `null` when nothing is left. */
  markup: string | null;
  /** The spec for the SVG that remains (ids renumbered to follow the new document order). */
  spec: AnimationSpec;
  /** How many layers were removed (ids that do not exist are ignored). */
  removed: number;
};

/** Drops `<g>` elements left with no children by the removal. */
function pruneEmptyGroups(element: SvgElementNode): void {
  for (const child of element.children) {
    if (child.type === "element") pruneEmptyGroups(child);
  }
  element.children = element.children.filter(
    (child) => !(child.type === "element" && child.name === "g" && child.children.length === 0),
  );
}

/**
 * Deletes layers from the SVG. Element ids follow document order (`sk-0`, `sk-1`…), so after a
 * removal the ones that remain are renumbered; their animations and edits move with them.
 */
export function deleteLayers(
  document: SvgDocument,
  spec: AnimationSpec,
  ids: readonly string[],
): DeleteLayersResult {
  const existing = new Set(document.elements.map((element) => element.id));
  const doomed = new Set(ids.filter((id) => existing.has(id)));
  if (doomed.size === 0) return { markup: serializeSvg(document.root), spec, removed: 0 };

  const renumbered = new Map<string, string>();
  for (const element of document.elements) {
    if (!doomed.has(element.id)) renumbered.set(element.id, `sk-${renumbered.size}`);
  }

  const next = remapSpec(spec, renumbered);

  if (renumbered.size === 0) return { markup: null, spec: next, removed: doomed.size };
  const root = cloneNode(document.root);
  removeElements(root, doomed);
  pruneEmptyGroups(root);
  return { markup: serializeSvg(root), spec: next, removed: doomed.size };
}
