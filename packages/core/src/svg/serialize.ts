import type { SvgNode } from "./tree";

function escapeAttr(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// `>` is left as-is so CSS inside <style> survives both XML and HTML parsers unchanged.
function escapeText(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;");
}

/** Deterministic serializer: attribute order is insertion order, childless elements self-close. */
export function serializeSvg(node: SvgNode): string {
  if (node.type === "text") return escapeText(node.value);
  const attrs = Object.entries(node.attrs)
    .map(([name, value]) => ` ${name}="${escapeAttr(value)}"`)
    .join("");
  if (node.children.length === 0) return `<${node.name}${attrs}/>`;
  return `<${node.name}${attrs}>${node.children.map(serializeSvg).join("")}</${node.name}>`;
}
