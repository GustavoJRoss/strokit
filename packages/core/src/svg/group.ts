import { remapSpec } from "../spec/remap";
import type { AnimationSpec } from "../spec/schema";
import { serializeSvg } from "./serialize";
import { cloneNode, type SvgElementNode, walkElements } from "./tree";
import type { SvgDocument } from "./types";

export type GroupErrorCode =
  /** Fewer than two layers or groups to put together at one level. */
  | "too-few"
  /** The selection cuts a group in half: some of its layers are in, some are out. */
  | "partial-group";

export type UngroupErrorCode =
  /** No group holds exactly the selected layers. */
  | "no-group"
  /** The group has its own look (opacity, fill, clip…) that would change when it is dissolved. */
  | "group-has-style";

export type GroupResult =
  | { ok: true; markup: string; spec: AnimationSpec; ids: string[] }
  | { ok: false; code: GroupErrorCode };

export type UngroupResult =
  | { ok: true; markup: string; spec: AnimationSpec; ids: string[] }
  | { ok: false; code: UngroupErrorCode };

/** Attributes a group can have and still be dissolved without changing how anything looks. */
const HARMLESS_GROUP_ATTRS = new Set(["transform", "id", "class", "data-name"]);

const idOf = (element: SvgElementNode): string | undefined => element.attrs["data-sk-id"];

function drawableIds(element: SvgElementNode): string[] {
  const ids: string[] = [];
  walkElements(element, (node) => {
    const id = idOf(node);
    if (id !== undefined) ids.push(id);
    return undefined;
  });
  return ids;
}

/** Path (ancestors first, the element last) of every drawable, by id. */
function pathsOf(root: SvgElementNode): Map<string, SvgElementNode[]> {
  const paths = new Map<string, SvgElementNode[]>();
  walkElements(root, (element, ancestors) => {
    const id = idOf(element);
    if (id !== undefined) paths.set(id, [...ancestors, element]);
    return undefined;
  });
  return paths;
}

/** Old id → new id after the document order changed (ids follow the order of the drawables). */
function renumbering(root: SvgElementNode): Map<string, string> {
  const map = new Map<string, string>();
  for (const id of drawableIds(root)) map.set(id, `sk-${map.size}`);
  return map;
}

/**
 * Puts layers (and whole groups) into a new `<g>`.
 *
 * The group goes inside the closest ancestor the selection has in common and takes whole children
 * of it only. Fill, stroke, opacity or clip-path set on a `<g>` apply to what is inside it, so
 * pulling a layer out of its group would change how it looks. The new group sits where the top
 * layer was (last in document order), like in Figma; the ones below move up next to it, so ids
 * are renumbered and the spec follows.
 */
export function groupLayers(
  document: SvgDocument,
  spec: AnimationSpec,
  ids: readonly string[],
): GroupResult {
  const root = cloneNode(document.root);
  const paths = pathsOf(root);
  const wanted = [...new Set(ids)].filter((id) => paths.has(id));
  if (wanted.length < 2) return { ok: false, code: "too-few" };
  const selected = new Set(wanted);

  // The longest chain of ancestors all of them share. Distinct drawables never nest, so the
  // chain ends at a container.
  const chains = wanted.map((id) => paths.get(id) as SvgElementNode[]);
  const first = chains[0] as SvgElementNode[];
  let depth = 0;
  while (depth < first.length && chains.every((chain) => chain[depth] === first[depth])) depth++;
  const container = first[depth - 1] as SvgElementNode;

  const branches = new Set(chains.map((chain) => chain[depth] as SvgElementNode));
  if (branches.size < 2) return { ok: false, code: "too-few" };
  for (const branch of branches) {
    if (!drawableIds(branch).every((id) => selected.has(id))) {
      return { ok: false, code: "partial-group" };
    }
  }

  const children: SvgElementNode["children"] = [];
  const members: SvgElementNode["children"] = [];
  let last = -1;
  container.children.forEach((child, index) => {
    if (child.type === "element" && branches.has(child)) last = index;
  });
  container.children.forEach((child, index) => {
    if (child.type === "element" && branches.has(child)) members.push(child);
    else children.push(child);
    if (index === last) children.push({ type: "element", name: "g", attrs: {}, children: members });
  });
  container.children = children;

  const renumbered = renumbering(root);
  return {
    ok: true,
    markup: serializeSvg(root),
    spec: remapSpec(spec, renumbered),
    ids: wanted.flatMap((id) => renumbered.get(id) ?? []).sort(byDocumentOrder),
  };
}

function byDocumentOrder(a: string, b: string): number {
  return Number(a.slice(3)) - Number(b.slice(3));
}

/**
 * Dissolves the group that holds exactly these layers (the outermost, if several wrap the same
 * ones). Its `transform` moves onto each child, which looks the same. Ids do not change: the
 * children stay where they were in the document.
 */
export function ungroupLayers(
  document: SvgDocument,
  spec: AnimationSpec,
  ids: readonly string[],
): UngroupResult {
  const root = cloneNode(document.root);
  const wanted = new Set(ids);

  let found: { group: SvgElementNode; parent: SvgElementNode } | null = null;
  walkElements(root, (element, ancestors) => {
    if (found) return false;
    const parent = ancestors[ancestors.length - 1];
    if (!parent || element.name !== "g") return undefined;
    const inside = drawableIds(element);
    if (inside.length === wanted.size && inside.every((id) => wanted.has(id))) {
      found = { group: element, parent };
      return false;
    }
    return undefined;
  });
  if (!found) return { ok: false, code: "no-group" };
  const { group, parent } = found as { group: SvgElementNode; parent: SvgElementNode };

  if (Object.keys(group.attrs).some((name) => !HARMLESS_GROUP_ATTRS.has(name))) {
    return { ok: false, code: "group-has-style" };
  }
  const transform = group.attrs.transform?.trim();
  const released = group.children.filter(
    (child) => child.type !== "element" || (child.name !== "title" && child.name !== "desc"),
  );
  for (const child of released) {
    if (child.type !== "element" || !transform) continue;
    // The group's transform is the outer one: it goes in front of the child's own.
    child.attrs.transform = `${transform} ${child.attrs.transform ?? ""}`.trim();
  }
  const at = parent.children.indexOf(group);
  parent.children.splice(at, 1, ...released);

  return { ok: true, markup: serializeSvg(root), spec, ids: [...wanted].sort(byDocumentOrder) };
}
