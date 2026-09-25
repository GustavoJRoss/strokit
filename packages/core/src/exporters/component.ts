import type { CompiledAnimation } from "../compile/types";
import { parseLength } from "../svg/normalize";
import type { SvgElementNode } from "../svg/tree";
import { childrenToJsx, jsxAttributes } from "./jsx";

export type ComponentExportOptions = {
  /** PascalCase component name. Defaults to "AnimatedLogo". */
  componentName?: string;
};

/** Shared by the React and Motion exporters: same props contract, same markup. */
export const PROPS_TYPE = (name: string, defaultLabel: string) => `export type ${name}Props = {
  /** Width and height (number = px). Defaults to the SVG's own size. */
  size?: number | string;
  /** Playback speed multiplier: 2 plays twice as fast. */
  speed?: number;
  /** true repeats forever, false plays once. Defaults to the exported animation. */
  loop?: boolean;
  paused?: boolean;
  className?: string;
  /** Accessible name. Defaults to ${JSON.stringify(defaultLabel)}. */
  label?: string;
};`;

export const VISUALLY_HIDDEN = `const visuallyHidden: CSSProperties = {
  position: "absolute",
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: "hidden",
  clip: "rect(0, 0, 0, 0)",
  whiteSpace: "nowrap",
  border: 0,
};`;

const ROOT_OMITTED = new Set(["xmlns", "width", "height", "class", "role", "aria-label"]);

/**
 * Renders the `<svg>` element. `extraProps` are JSX props injected on the root
 * (e.g. `ref={scope}` or `style={style}`).
 */
export function renderSvg(
  compiled: CompiledAnimation,
  root: SvgElementNode,
  extraProps: string[],
  depth: number,
): string {
  const pad = "  ".repeat(depth);
  const attrs: Record<string, string> = {};
  for (const [name, value] of Object.entries(root.attrs)) {
    if (!ROOT_OMITTED.has(name)) attrs[name] = value;
  }
  const width = parseLength(root.attrs.width);
  const height = parseLength(root.attrs.height);
  const status = compiled.a11y.mode === "status";
  const props = [
    ...jsxAttributes(attrs),
    width !== undefined ? `width={size ?? ${width}}` : "width={size}",
    height !== undefined ? `height={size ?? ${height}}` : "height={size}",
    status
      ? `className="${compiled.id}"`
      : `className={className ? \`${compiled.id} \${className}\` : "${compiled.id}"}`,
    ...extraProps,
    ...(status ? ['aria-hidden="true"'] : ['role="img"', "aria-label={label}"]),
  ];
  const body = childrenToJsx(root, depth + 1);
  const svg = [
    `${pad}<svg`,
    ...props.map((prop) => `${pad}  ${prop}`),
    `${pad}>`,
    `${pad}  <style>{css}</style>`,
    ...(body ? [body] : []),
    `${pad}</svg>`,
  ].join("\n");
  return svg;
}

/** Wraps the svg for `a11y.mode === "status"`: live region with visually hidden text. */
export function renderRoot(
  compiled: CompiledAnimation,
  root: SvgElementNode,
  extraProps: string[],
): string {
  if (compiled.a11y.mode !== "status") return renderSvg(compiled, root, extraProps, 2);
  return [
    `    <span role="status" className={className} style={{ display: "inline-flex" }}>`,
    renderSvg(compiled, root, extraProps, 3),
    "      <span style={visuallyHidden}>{label}</span>",
    "    </span>",
  ].join("\n");
}
