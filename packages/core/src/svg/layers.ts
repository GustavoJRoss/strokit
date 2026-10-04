import { type SvgElementNode, textContent } from "./tree";

export type LayerNode =
  | {
      kind: "group";
      /** Stable within one document: position of the group in the tree ("g-0-2"). */
      key: string;
      /** The group's `id` or `<title>`, when it has one. */
      label: string | null;
      /** Every drawable inside, in document order. */
      ids: string[];
      children: LayerNode[];
    }
  | { kind: "layer"; id: string };

function groupLabel(group: SvgElementNode): string | null {
  const title = group.children.find(
    (child): child is SvgElementNode => child.type === "element" && child.name === "title",
  );
  const text = title ? textContent(title).trim() : "";
  return group.attrs.id ?? (text || null);
}

function build(element: SvgElementNode, key: string): LayerNode[] {
  const nodes: LayerNode[] = [];
  element.children.forEach((child, index) => {
    if (child.type !== "element") return;
    const id = child.attrs["data-sk-id"];
    if (id !== undefined) {
      nodes.push({ kind: "layer", id });
      return;
    }
    if (child.name !== "g") return;
    const children = build(child, `${key}-${index}`);
    if (children.length === 0) return;
    // A group around a single layer adds nothing to the list.
    if (children.length === 1) {
      nodes.push(...children);
      return;
    }
    nodes.push({
      kind: "group",
      key: `${key}-${index}`,
      label: groupLabel(child),
      ids: children.flatMap((node) => (node.kind === "layer" ? [node.id] : node.ids)),
      children,
    });
  });
  return nodes;
}

/**
 * Drawables of a normalized tree grouped by their `<g>` ancestors, for the layers panel.
 * Groups without drawables, groups of one and a single group wrapping everything are dropped.
 */
export function layerTree(root: SvgElementNode): LayerNode[] {
  let nodes = build(root, "g");
  while (nodes.length === 1 && nodes[0]?.kind === "group") nodes = nodes[0].children;
  return nodes;
}

/** Ids of every drawable under a node. */
export function nodeIds(node: LayerNode): string[] {
  return node.kind === "layer" ? [node.id] : node.ids;
}

/** Nodes from the top of the tree down to the layer, the layer last; `null` if it is not there. */
export function layerPath(tree: readonly LayerNode[], id: string): LayerNode[] | null {
  for (const node of tree) {
    if (node.kind === "layer") {
      if (node.id === id) return [node];
      continue;
    }
    if (!node.ids.includes(id)) continue;
    const inner = layerPath(node.children, id);
    if (inner) return [node, ...inner];
  }
  return null;
}

/** The group with this key, anywhere in the tree. */
export function findGroup(
  tree: readonly LayerNode[],
  key: string,
): Extract<LayerNode, { kind: "group" }> | null {
  for (const node of tree) {
    if (node.kind !== "group") continue;
    if (node.key === key) return node;
    const inner = findGroup(node.children, key);
    if (inner) return inner;
  }
  return null;
}

/** The group whose layers are exactly `ids` (any order), the outermost one if several match. */
export function findGroupWithIds(
  tree: readonly LayerNode[],
  ids: readonly string[],
): Extract<LayerNode, { kind: "group" }> | null {
  for (const node of tree) {
    if (node.kind !== "group") continue;
    if (node.ids.length === ids.length && ids.every((id) => node.ids.includes(id))) return node;
    const inner = findGroupWithIds(node.children, ids);
    if (inner) return inner;
  }
  return null;
}
