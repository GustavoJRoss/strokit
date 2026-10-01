export type SvgTextNode = { type: "text"; value: string };

export type SvgElementNode = {
  type: "element";
  name: string;
  attrs: Record<string, string>;
  children: SvgNode[];
};

export type SvgNode = SvgElementNode | SvgTextNode;

export function cloneNode<T extends SvgNode>(node: T): T {
  if (node.type === "text") return { ...node };
  return {
    ...node,
    attrs: { ...node.attrs },
    children: node.children.map((child) => cloneNode(child)),
  };
}

export function textContent(node: SvgNode): string {
  if (node.type === "text") return node.value;
  return node.children.map(textContent).join("");
}

/**
 * Depth-first, document-order traversal of element nodes.
 * Returning `false` from `visit` skips the element's descendants.
 */
export function walkElements(
  root: SvgElementNode,
  visit: (element: SvgElementNode, ancestors: readonly SvgElementNode[]) => boolean | undefined,
): void {
  const recurse = (element: SvgElementNode, ancestors: SvgElementNode[]): void => {
    if (visit(element, ancestors) === false) return;
    const next = [...ancestors, element];
    for (const child of element.children) {
      if (child.type === "element") recurse(child, next);
    }
  };
  recurse(root, []);
}

/** Removes the drawables with these `data-sk-id`s, at any depth. */
export function removeElements(element: SvgElementNode, ids: ReadonlySet<string>): void {
  element.children = element.children.filter(
    (child) => child.type !== "element" || !ids.has(child.attrs["data-sk-id"] ?? ""),
  );
  for (const child of element.children) {
    if (child.type === "element") removeElements(child, ids);
  }
}
