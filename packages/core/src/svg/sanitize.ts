import type { SvgElementNode, SvgNode } from "./tree";

/** ARCHITECTURE §5: allowlist, never blocklist. */
const ALLOWED_ELEMENTS: ReadonlySet<string> = new Set([
  "svg",
  "g",
  "defs",
  "path",
  "line",
  "polyline",
  "polygon",
  "rect",
  "circle",
  "ellipse",
  "linearGradient",
  "radialGradient",
  "stop",
  "clipPath",
  "mask",
  "use",
  "title",
  "desc",
]);

/** Harmless wrappers whose children are kept (the wrapper itself is dropped). */
const UNWRAPPED_ELEMENTS: ReadonlySet<string> = new Set(["a", "switch"]);

const TEXT_ELEMENTS: ReadonlySet<string> = new Set(["title", "desc"]);

const HREF_ELEMENTS: ReadonlySet<string> = new Set(["use", "linearGradient", "radialGradient"]);

const ALLOWED_ATTRIBUTES: ReadonlySet<string> = new Set([
  "id",
  "xmlns",
  "version",
  "viewBox",
  "preserveAspectRatio",
  "width",
  "height",
  "x",
  "y",
  "x1",
  "y1",
  "x2",
  "y2",
  "cx",
  "cy",
  "r",
  "rx",
  "ry",
  "fx",
  "fy",
  "fr",
  "d",
  "points",
  "transform",
  "href",
  "offset",
  "gradientUnits",
  "gradientTransform",
  "spreadMethod",
  "clipPathUnits",
  "maskUnits",
  "maskContentUnits",
  "fill",
  "fill-opacity",
  "fill-rule",
  "stroke",
  "stroke-width",
  "stroke-opacity",
  "stroke-linecap",
  "stroke-linejoin",
  "stroke-miterlimit",
  "stroke-dasharray",
  "stroke-dashoffset",
  "opacity",
  "clip-path",
  "clip-rule",
  "mask",
  "display",
  "visibility",
  "stop-color",
  "stop-opacity",
  "vector-effect",
]);

const URL_REFERENCE = /url\(\s*(['"]?)(.*?)\1\s*\)/gi;
const DANGEROUS_SCHEME = /(?:javascript|vbscript|data)\s*:/i;

function isSafeValue(value: string): boolean {
  if (DANGEROUS_SCHEME.test(value)) return false;
  for (const match of value.matchAll(URL_REFERENCE)) {
    if (!(match[2] ?? "").trim().startsWith("#")) return false;
  }
  // An unbalanced `url(` that the regex could not read is rejected as well.
  const urlCount = value.match(/url\(/gi)?.length ?? 0;
  return urlCount === [...value.matchAll(URL_REFERENCE)].length;
}

function sanitizeAttributes(element: SvgElementNode): Record<string, string> {
  const attrs: Record<string, string> = {};
  for (const [rawName, value] of Object.entries(element.attrs)) {
    const name = rawName === "xlink:href" ? "href" : rawName;
    if (!ALLOWED_ATTRIBUTES.has(name)) continue;
    if (name === "xmlns" && value !== "http://www.w3.org/2000/svg") continue;
    if (name === "href" && (!HREF_ELEMENTS.has(element.name) || !value.trim().startsWith("#"))) {
      continue;
    }
    if (!isSafeValue(value)) continue;
    attrs[name] = value;
  }
  return attrs;
}

function sanitizeChildren(
  children: SvgNode[],
  parentName: string,
  removed: Set<string>,
): SvgNode[] {
  const result: SvgNode[] = [];
  for (const child of children) {
    if (child.type === "text") {
      if (TEXT_ELEMENTS.has(parentName)) result.push({ type: "text", value: child.value });
      continue;
    }
    if (ALLOWED_ELEMENTS.has(child.name)) {
      result.push({
        type: "element",
        name: child.name,
        attrs: sanitizeAttributes(child),
        children: sanitizeChildren(child.children, child.name, removed),
      });
    } else if (UNWRAPPED_ELEMENTS.has(child.name)) {
      result.push(...sanitizeChildren(child.children, parentName, removed));
    } else {
      removed.add(child.name);
    }
  }
  return result;
}

/**
 * Returns a new tree containing only allowlisted elements and attributes.
 * Removes scripts, foreignObject, images, event handlers, external references and
 * dangerous URL schemes. `xlink:href` is rewritten as `href` (SVG 2).
 */
export function sanitizeTree(root: SvgElementNode): {
  root: SvgElementNode;
  removedElements: string[];
} {
  const removed = new Set<string>();
  const sanitized: SvgElementNode = {
    type: "element",
    name: "svg",
    attrs: sanitizeAttributes(root),
    children: sanitizeChildren(root.children, "svg", removed),
  };
  return { root: sanitized, removedElements: [...removed] };
}
