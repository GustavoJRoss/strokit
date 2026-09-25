import type { ImportWarning } from "./errors";
import { normalizeSvg } from "./normalize";
import { type DomParserLike, parseSvg } from "./parse";
import { sanitizeTree } from "./sanitize";
import { serializeSvg } from "./serialize";
import { inlineStyles } from "./style-inline";
import type { SvgElementNode } from "./tree";
import type { SvgDocument } from "./types";

export type ImportOptions = { parser: DomParserLike };

export type ImportResult = { document: SvgDocument; warnings: ImportWarning[] };

function parseAndSanitize(
  markup: string,
  options: ImportOptions,
): { root: SvgElementNode; warnings: ImportWarning[] } {
  const inlined = inlineStyles(parseSvg(markup, options.parser));
  const sanitized = sanitizeTree(inlined.root);
  const removed: ImportWarning[] = sanitized.removedElements.map((element) => ({
    code: "removed-element",
    element,
  }));
  return { root: sanitized.root, warnings: [...inlined.warnings, ...removed] };
}

/** Markup → safe markup. Every user SVG goes through this before touching the DOM. */
export function sanitizeSvg(markup: string, options: ImportOptions): string {
  return serializeSvg(parseAndSanitize(markup, options).root);
}

/** Full import pipeline: parse → inline styles → sanitize → normalize. */
export function importSvg(markup: string, options: ImportOptions): ImportResult {
  const sanitized = parseAndSanitize(markup, options);
  const normalized = normalizeSvg(sanitized.root);
  return {
    document: normalized.document,
    warnings: [...sanitized.warnings, ...normalized.warnings],
  };
}
