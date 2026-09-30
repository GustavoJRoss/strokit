import { type ImportWarning, SvgImportError } from "./errors";
import { serializeSvg } from "./serialize";
import { cloneNode, type SvgElementNode } from "./tree";
import { DRAWABLE_TAGS, type DrawableElement, type DrawableTag, type SvgDocument } from "./types";

const SVG_NAMESPACE = "http://www.w3.org/2000/svg";

/** Containers whose content is referenced, not rendered in place. */
const NON_RENDERED: ReadonlySet<string> = new Set([
  "defs",
  "clipPath",
  "mask",
  "linearGradient",
  "radialGradient",
]);

/** Elements without an interior: `fill` never paints anything visible. */
const OPEN_SHAPES: ReadonlySet<string> = new Set(["line"]);

type Inherited = { fill?: string; stroke?: string; strokeWidth?: string };

function isDrawableTag(name: string): name is DrawableTag {
  return (DRAWABLE_TAGS as readonly string[]).includes(name);
}

/** CSS absolute units in user units (px). `em`, `%` and the like depend on context: unknown. */
const LENGTH_UNITS: Record<string, number> = {
  "": 1,
  px: 1,
  pt: 4 / 3,
  pc: 16,
  mm: 96 / 25.4,
  cm: 96 / 2.54,
  in: 96,
};

export function parseLength(value: string | undefined): number | undefined {
  if (value === undefined) return undefined;
  const match = /^\s*(-?\d*\.?\d+(?:e[-+]?\d+)?)\s*([a-z]*)\s*$/i.exec(value);
  const factor = match ? LENGTH_UNITS[(match[2] ?? "").toLowerCase()] : undefined;
  return match && factor !== undefined ? Number(match[1]) * factor : undefined;
}

export function parseViewBox(value: string | undefined): [number, number, number, number] | null {
  if (value === undefined) return null;
  const parts = value
    .trim()
    .split(/[\s,]+/)
    .map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isFinite(part))) return null;
  const [x, y, width, height] = parts as [number, number, number, number];
  return width > 0 && height > 0 ? [x, y, width, height] : null;
}

function describe(tag: DrawableTag, id: string, inherited: Inherited): DrawableElement {
  const fill = inherited.fill ?? "black";
  const hasFill = fill !== "none" && !OPEN_SHAPES.has(tag);
  const stroke = inherited.stroke;
  const hasStroke = stroke !== undefined && stroke !== "none";
  const element: DrawableElement = { id, tag, hasFill, hasStroke };
  if (hasFill) element.fill = fill;
  if (hasStroke) {
    element.stroke = stroke;
    element.strokeWidth = parseLength(inherited.strokeWidth) ?? 1;
  }
  return element;
}

/**
 * Assigns stable ids to drawable elements, resolves inherited fill/stroke and
 * guarantees a viewBox. Expects a sanitized tree.
 */
export function normalizeSvg(input: SvgElementNode): {
  document: SvgDocument;
  warnings: ImportWarning[];
} {
  const root = cloneNode(input);
  const warnings: ImportWarning[] = [];
  const width = parseLength(root.attrs.width);
  const height = parseLength(root.attrs.height);

  let viewBox = parseViewBox(root.attrs.viewBox);
  if (!viewBox) {
    // Falls back to the SVG default viewport (300×150) when no size is known.
    viewBox = [0, 0, width ?? 300, height ?? 150];
    warnings.push({ code: "missing-viewbox" });
  }
  // `x`, `y` and `version` on the root are editor noise (Illustrator) with no effect when embedded.
  const {
    width: _w,
    height: _h,
    viewBox: _v,
    xmlns: _n,
    x: _x,
    y: _y,
    version: _ver,
    ...rest
  } = root.attrs;
  root.attrs = { xmlns: SVG_NAMESPACE, viewBox: viewBox.join(" "), ...rest };
  if (width !== undefined) root.attrs.width = String(width);
  if (height !== undefined) root.attrs.height = String(height);

  const elements: DrawableElement[] = [];
  const visit = (element: SvgElementNode, inherited: Inherited): void => {
    if (element.attrs.display === "none" || NON_RENDERED.has(element.name)) return;
    const own: Inherited = { ...inherited };
    if (element.attrs.fill !== undefined) own.fill = element.attrs.fill;
    if (element.attrs.stroke !== undefined) own.stroke = element.attrs.stroke;
    if (element.attrs["stroke-width"] !== undefined) {
      own.strokeWidth = element.attrs["stroke-width"];
    }
    if (isDrawableTag(element.name)) {
      const id = `sk-${elements.length}`;
      element.attrs["data-sk-id"] = id;
      elements.push(describe(element.name, id, own));
      return;
    }
    for (const child of element.children) {
      if (child.type === "element") visit(child, own);
    }
  };
  visit(root, {});

  if (elements.length === 0) {
    throw new SvgImportError("no-drawables", "Nenhum elemento desenhável foi encontrado no SVG.");
  }

  const document: SvgDocument = { viewBox, elements, root, raw: serializeSvg(root) };
  if (width !== undefined) document.width = width;
  if (height !== undefined) document.height = height;
  return { document, warnings };
}
