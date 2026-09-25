import { SvgImportError } from "./errors";
import type { SvgElementNode, SvgNode } from "./tree";

/** 500 KB, measured in UTF-8 bytes (SPEC RF1). */
export const MAX_SVG_BYTES = 500 * 1024;

/** The subset of a DOM node that parsing reads. `window.DOMParser` and linkedom both satisfy it. */
export interface DomNodeLike {
  readonly nodeType: number;
  readonly nodeName: string;
  readonly nodeValue: string | null;
  readonly childNodes: ArrayLike<DomNodeLike>;
  readonly attributes?: ArrayLike<{ readonly name: string; readonly value: string }> | null;
}

export interface DomParserLike {
  parseFromString(
    markup: string,
    type: "image/svg+xml",
  ): { readonly documentElement: DomNodeLike | null };
}

const ELEMENT_NODE = 1;
const TEXT_NODE = 3;
const CDATA_SECTION_NODE = 4;

export function utf8ByteLength(value: string): number {
  let bytes = 0;
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i);
    if (code < 0x80) bytes += 1;
    else if (code < 0x800) bytes += 2;
    else if (code >= 0xd800 && code <= 0xdbff) {
      bytes += 4;
      i++;
    } else bytes += 3;
  }
  return bytes;
}

function localName(nodeName: string): string {
  return nodeName.startsWith("svg:") ? nodeName.slice(4) : nodeName;
}

function toTree(node: DomNodeLike): SvgElementNode {
  const attrs: Record<string, string> = {};
  const attributes = node.attributes ?? [];
  for (let i = 0; i < attributes.length; i++) {
    const attr = attributes[i];
    if (attr) attrs[attr.name] = attr.value;
  }
  const children: SvgNode[] = [];
  for (let i = 0; i < node.childNodes.length; i++) {
    const child = node.childNodes[i];
    if (!child) continue;
    if (child.nodeType === ELEMENT_NODE) children.push(toTree(child));
    else if (child.nodeType === TEXT_NODE || child.nodeType === CDATA_SECTION_NODE) {
      children.push({ type: "text", value: child.nodeValue ?? "" });
    }
  }
  return { type: "element", name: localName(node.nodeName), attrs, children };
}

function containsElement(node: SvgElementNode, name: string): boolean {
  return (
    node.name === name ||
    node.children.some((child) => child.type === "element" && containsElement(child, name))
  );
}

/**
 * Parses SVG markup into an inert, framework-free tree. The DOM parser is only used here;
 * everything downstream works on plain objects, so output is identical in Node and browsers.
 */
export function parseSvg(markup: string, parser: DomParserLike): SvgElementNode {
  if (markup.trim() === "") throw new SvgImportError("empty", "O arquivo está vazio.");
  if (utf8ByteLength(markup) > MAX_SVG_BYTES) {
    throw new SvgImportError("too-large", "O SVG passa do limite de 500 KB.");
  }
  // DOCTYPE/ENTITY enable entity-expansion attacks and are never needed for a logo.
  if (/<!(DOCTYPE|ENTITY)/i.test(markup)) {
    throw new SvgImportError("doctype", "SVGs com DOCTYPE ou entidades não são aceitos.");
  }
  const documentElement = parser.parseFromString(markup, "image/svg+xml").documentElement;
  if (!documentElement) throw new SvgImportError("invalid-xml", "Não foi possível ler o SVG.");
  const root = toTree(documentElement);
  if (containsElement(root, "parsererror")) {
    throw new SvgImportError("invalid-xml", "O SVG tem XML inválido.");
  }
  if (root.name !== "svg") {
    throw new SvgImportError("not-svg", "O arquivo não é um SVG.");
  }
  return root;
}
