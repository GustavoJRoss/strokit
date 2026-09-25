import type { SvgElementNode, SvgNode } from "../svg/tree";

const INDENT = "  ";

/** SVG attribute → React prop name. */
export function jsxAttributeName(name: string): string | null {
  if (name === "class") return "className";
  if (name.startsWith("data-") || name.startsWith("aria-")) return name;
  if (name.includes(":") || name === "xmlns") return null;
  return name.replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase());
}

/** Plain JSX string when safe, `{"..."}` otherwise (JSX strings do not process escapes). */
export function jsxAttributeValue(value: string): string {
  return /["\\{}<>&\n]/.test(value) ? `{${JSON.stringify(value)}}` : `"${value}"`;
}

export function jsxAttributes(attrs: Record<string, string>): string[] {
  const result: string[] = [];
  for (const [name, value] of Object.entries(attrs)) {
    const prop = jsxAttributeName(name);
    if (prop) result.push(`${prop}=${jsxAttributeValue(value)}`);
  }
  return result;
}

/** Serializes an element subtree as indented JSX. Text is always an expression, so it is escaped. */
export function toJsx(node: SvgNode, depth: number): string {
  const pad = INDENT.repeat(depth);
  if (node.type === "text") {
    return node.value.trim() === "" ? "" : `${pad}{${JSON.stringify(node.value)}}`;
  }
  const attrs = jsxAttributes(node.attrs);
  const open = attrs.length > 0 ? `<${node.name} ${attrs.join(" ")}` : `<${node.name}`;
  const onlyText = node.children.length === 1 && node.children[0]?.type === "text";
  if (onlyText && node.children[0]?.type === "text") {
    return `${pad}${open}>{${JSON.stringify(node.children[0].value)}}</${node.name}>`;
  }
  const children = node.children.map((child) => toJsx(child, depth + 1)).filter(Boolean);
  if (children.length === 0) return `${pad}${open} />`;
  return `${pad}${open}>\n${children.join("\n")}\n${pad}</${node.name}>`;
}

export function childrenToJsx(root: SvgElementNode, depth: number): string {
  return root.children
    .map((child) => toJsx(child, depth))
    .filter(Boolean)
    .join("\n");
}

const IDENTIFIER = /^[A-Za-z_$][\w$]*$/;

/** Readable JS literal (unquoted keys, 2-space indent, `Infinity`) for generated code. */
export function toJsLiteral(value: unknown, depth = 0): string {
  const pad = INDENT.repeat(depth);
  const inner = INDENT.repeat(depth + 1);
  if (value === Number.POSITIVE_INFINITY) return "Number.POSITIVE_INFINITY";
  if (Array.isArray(value)) {
    if (value.every((item) => typeof item !== "object" || item === null)) {
      return `[${value.map((item) => toJsLiteral(item)).join(", ")}]`;
    }
    return `[\n${value.map((item) => `${inner}${toJsLiteral(item, depth + 1)}`).join(",\n")},\n${pad}]`;
  }
  if (value && typeof value === "object") {
    const entries = Object.entries(value).map(
      ([key, item]) =>
        `${inner}${IDENTIFIER.test(key) ? key : JSON.stringify(key)}: ${toJsLiteral(item, depth + 1)}`,
    );
    return `{\n${entries.join(",\n")},\n${pad}}`;
  }
  return JSON.stringify(value);
}

/** CSS goes in a template literal: escape what would end or interpolate it. */
export function templateLiteral(value: string): string {
  return `\`${value.replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\$\{/g, "\\${")}\``;
}

/** "Órbita azul" → "OrbitaAzulLogo". Always a valid, PascalCase identifier. */
export function toComponentName(name: string): string {
  const words = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
    .map((word) => word[0]?.toUpperCase() + word.slice(1));
  let base = words.join("");
  if (base === "") return "AnimatedLogo";
  if (/^[0-9]/.test(base)) base = `Logo${base}`;
  return /Logo$/.test(base) ? base : `${base}Logo`;
}
