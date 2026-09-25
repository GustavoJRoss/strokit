import type { ImportWarning } from "./errors";
import { PRESENTATION_PROPERTIES } from "./presentation";
import { cloneNode, type SvgElementNode, textContent, walkElements } from "./tree";

type Declaration = [property: string, value: string];
type CssRule = { selectors: string[]; declarations: Declaration[] };
type SimpleSelector = { tag?: string; ids: string[]; classes: string[] };

const SIMPLE_SELECTOR = /^(\*|[a-zA-Z][\w-]*)?((?:[.#][\w-]+)*)$/;

function parseDeclarations(body: string): Declaration[] {
  const declarations: Declaration[] = [];
  for (const chunk of body.split(";")) {
    const colon = chunk.indexOf(":");
    if (colon === -1) continue;
    const property = chunk.slice(0, colon).trim().toLowerCase();
    const value = chunk
      .slice(colon + 1)
      .replace(/!important\s*$/i, "")
      .trim();
    if (property && value) declarations.push([property, value]);
  }
  return declarations;
}

function skipBlock(css: string, openIndex: number): number {
  let depth = 0;
  for (let i = openIndex; i < css.length; i++) {
    if (css[i] === "{") depth++;
    else if (css[i] === "}" && --depth === 0) return i + 1;
  }
  return css.length;
}

/** Minimal CSS parser: flat rules only. At-rules (@import, @media, @font-face…) are dropped. */
export function parseCss(source: string): CssRule[] {
  const css = source.replace(/\/\*[\s\S]*?\*\//g, "");
  const rules: CssRule[] = [];
  let i = 0;
  while (i < css.length) {
    while (i < css.length && /\s/.test(css[i] ?? "")) i++;
    if (i >= css.length) break;
    if (css[i] === "@") {
      const semicolon = css.indexOf(";", i);
      const brace = css.indexOf("{", i);
      if (brace === -1 || (semicolon !== -1 && semicolon < brace)) {
        i = semicolon === -1 ? css.length : semicolon + 1;
      } else {
        i = skipBlock(css, brace);
      }
      continue;
    }
    const open = css.indexOf("{", i);
    const close = open === -1 ? -1 : css.indexOf("}", open);
    if (close === -1) break;
    rules.push({
      selectors: css
        .slice(i, open)
        .split(",")
        .map((selector) => selector.trim())
        .filter(Boolean),
      declarations: parseDeclarations(css.slice(open + 1, close)),
    });
    i = close + 1;
  }
  return rules;
}

function parseSelector(selector: string): SimpleSelector | null {
  const match = SIMPLE_SELECTOR.exec(selector);
  if (!match || selector === "") return null;
  const parsed: SimpleSelector = { ids: [], classes: [] };
  if (match[1] && match[1] !== "*") parsed.tag = match[1];
  for (const part of (match[2] ?? "").match(/[.#][\w-]+/g) ?? []) {
    (part.startsWith("#") ? parsed.ids : parsed.classes).push(part.slice(1));
  }
  return parsed;
}

function matches(element: SvgElementNode, selector: SimpleSelector): boolean {
  if (selector.tag && selector.tag !== element.name) return false;
  if (selector.ids.some((id) => element.attrs.id !== id)) return false;
  const classes = (element.attrs.class ?? "").split(/\s+/);
  return selector.classes.every((name) => classes.includes(name));
}

function specificity(selector: SimpleSelector): number {
  return selector.ids.length * 10_000 + selector.classes.length * 100 + (selector.tag ? 1 : 0);
}

function applyDeclarations(element: SvgElementNode, declarations: Declaration[]): void {
  for (const [property, value] of declarations) {
    if (PRESENTATION_PROPERTIES.has(property)) element.attrs[property] = value;
  }
}

/**
 * Resolves `<style>` rules and `style=""` into presentation attributes, then removes
 * `<style>`, `style` and `class`. CSS beats presentation attributes, as in the SVG cascade.
 * Only simple selectors (`tag`, `.class`, `#id` and compounds of those) are supported.
 */
export function inlineStyles(input: SvgElementNode): {
  root: SvgElementNode;
  warnings: ImportWarning[];
} {
  const root = cloneNode(input);
  const warnings: ImportWarning[] = [];
  const rules: { selector: SimpleSelector; declarations: Declaration[]; order: number }[] = [];

  walkElements(root, (element) => {
    if (element.name !== "style") return;
    for (const rule of parseCss(textContent(element))) {
      for (const selectorText of rule.selectors) {
        const selector = parseSelector(selectorText);
        if (selector) {
          rules.push({ selector, declarations: rule.declarations, order: rules.length });
        } else {
          warnings.push({ code: "unsupported-css-selector", selector: selectorText });
        }
      }
    }
    return false;
  });

  walkElements(root, (element) => {
    const matching = rules
      .filter((rule) => matches(element, rule.selector))
      .sort((a, b) => specificity(a.selector) - specificity(b.selector) || a.order - b.order);
    for (const rule of matching) applyDeclarations(element, rule.declarations);
    if (element.attrs.style !== undefined) {
      applyDeclarations(element, parseDeclarations(element.attrs.style));
    }
    delete element.attrs.style;
    delete element.attrs.class;
    element.children = element.children.filter(
      (child) => child.type !== "element" || child.name !== "style",
    );
    return undefined;
  });

  return { root, warnings };
}
