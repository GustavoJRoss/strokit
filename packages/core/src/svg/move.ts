import { serializeSvg } from "./serialize";
import { IDENTITY, invert, type Matrix, multiply, parseTransform } from "./transform";
import { cloneNode, type SvgElementNode, walkElements } from "./tree";
import type { SvgDocument } from "./types";

const PRECISION = 10_000;

function round(value: number): number {
  return Math.round(value * PRECISION) / PRECISION;
}

function translation(x: number, y: number): string {
  return `translate(${round(x)} ${round(y)})`;
}

/** A pure translation, e.g. `translate(5 2)`: moving it again just adds up. */
function asTranslation(matrix: Matrix | null): [number, number] | null {
  if (!matrix) return null;
  const [a, b, c, d, e, f] = matrix;
  return a === 1 && b === 0 && c === 0 && d === 1 ? [e, f] : null;
}

function drawableIds(element: SvgElementNode): string[] {
  const ids: string[] = [];
  walkElements(element, (node) => {
    const id = node.attrs["data-sk-id"];
    if (id !== undefined) ids.push(id);
    return undefined;
  });
  return ids;
}

/**
 * Moves layers by (`dx`, `dy`) in viewBox units, by editing their `transform` attribute. The move
 * is converted into each element's parent space, so layers inside scaled or rotated groups still
 * follow the pointer. A group of two or more layers that are all moved is moved as one node (its own `transform`),
 * which keeps the output lean and drags along anything set on the group, like a clip. Ids stay the
 * same (document order does not change), so animations and edits carry over. Ids that do not
 * exist, or whose ancestors have a transform that cannot be inverted, are left where they are.
 * Returns the new markup, ready to import.
 */
export function moveElements(
  document: SvgDocument,
  ids: readonly string[],
  dx: number,
  dy: number,
): string {
  const wanted = new Set(ids);
  const root = cloneNode(document.root);
  walkElements(root, (element, ancestors) => {
    const id = element.attrs["data-sk-id"];
    // The root is never moved as a group: that would shift the whole viewBox contents.
    const wholeGroup =
      id === undefined &&
      element.name === "g" &&
      ancestors.length > 0 &&
      (() => {
        const inside = drawableIds(element);
        return inside.length > 1 && inside.every((item) => wanted.has(item));
      })();
    if (!wholeGroup && (id === undefined || !wanted.has(id))) return undefined;

    let parent: Matrix | null = IDENTITY;
    for (const ancestor of ancestors) {
      const own = parseTransform(ancestor.attrs.transform);
      parent = parent && own ? multiply(parent, own) : null;
    }
    const inverse = parent && invert(parent);
    if (!inverse) return undefined;
    // A vector, not a point: only the linear part of the parent transform applies.
    const x = inverse[0] * dx + inverse[2] * dy;
    const y = inverse[1] * dx + inverse[3] * dy;

    const current = element.attrs.transform?.trim() ?? "";
    const merged: [number, number] | null =
      current === "" ? [0, 0] : asTranslation(parseTransform(current));
    // A lone translate absorbs the move; anything else gets a translate in front of it.
    element.attrs.transform = merged
      ? translation(merged[0] + x, merged[1] + y)
      : `${translation(x, y)} ${current}`;
    // A moved group carries everything inside it, so nothing under it is moved again.
    return wholeGroup ? false : undefined;
  });
  return serializeSvg(root);
}
