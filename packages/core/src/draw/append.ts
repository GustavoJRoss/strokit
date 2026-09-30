import { colorSchema } from "../spec/layers";
import { serializeSvg } from "../svg/serialize";
import { cloneNode, type SvgElementNode } from "../svg/tree";

/** A stroke-only path to add to the SVG. `strokeWidth` is in the SVG's own units. */
export type DrawnPath = { d: string; stroke: string; strokeWidth: number };

/** ViewBox of the SVG created from scratch. */
export const BLANK_VIEWBOX: [number, number, number, number] = [0, 0, 512, 512];

const SVG_NAMESPACE = "http://www.w3.org/2000/svg";

/** Path data the drawing tools produce: commands, numbers and separators only. */
const SAFE_PATH_DATA = /^[MmLlHhVvCcSsQqTtAaZz0-9\s.,eE+-]+$/;

function blankRoot(): SvgElementNode {
  return {
    type: "element",
    name: "svg",
    attrs: { xmlns: SVG_NAMESPACE, viewBox: BLANK_VIEWBOX.join(" ") },
    children: [],
  };
}

function pathNode({ d, stroke, strokeWidth }: DrawnPath): SvgElementNode {
  const color = colorSchema.safeParse(stroke);
  return {
    type: "element",
    name: "path",
    attrs: {
      d,
      fill: "none",
      stroke: color.success ? color.data : "currentColor",
      "stroke-width": String(Math.round(strokeWidth * 1000) / 1000),
      "stroke-linecap": "round",
      "stroke-linejoin": "round",
    },
    children: [],
  };
}

/**
 * Markup of `root` (a blank SVG when there is none) with the drawn paths on top. The result
 * is only markup: it goes through the usual import (sanitize + normalize), like any other SVG.
 */
export function appendDrawnPaths(root: SvgElementNode | null, paths: DrawnPath[]): string {
  const next = root ? cloneNode(root) : blankRoot();
  const valid = paths.filter(
    (path) => SAFE_PATH_DATA.test(path.d) && Number.isFinite(path.strokeWidth),
  );
  next.children.push(...valid.map(pathNode));
  return serializeSvg(next);
}
