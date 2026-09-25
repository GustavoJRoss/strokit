import type { AnimationDef, CompiledAnimation, CssProps, ElementRule } from "../compile/types";
import type { Easing } from "../spec/timing";
import { serializeSvg } from "../svg/serialize";
import { cloneNode, type SvgElementNode, walkElements } from "../svg/tree";

export type CssExportOptions = {
  /** Keep `data-sk-id` on drawables. The editor preview needs them; exported code does not. */
  includeElementIds?: boolean;
};

const INDENT = "  ";

function formatNumber(value: number): string {
  return String(Math.round(value * 10_000) / 10_000);
}

export function formatEasing(easing: Easing): string {
  if (typeof easing === "string") return easing;
  return `cubic-bezier(${easing.cubicBezier.map(formatNumber).join(", ")})`;
}

function formatAnimation(prefix: string, animation: AnimationDef): string {
  return [
    `${prefix}-${animation.keyframes}`,
    `${animation.duration}ms`,
    formatEasing(animation.easing),
    `${animation.delay}ms`,
    animation.iterations === "infinite" ? "infinite" : formatNumber(animation.iterations),
    animation.direction,
    animation.fillMode,
  ].join(" ");
}

function block(selector: string, props: CssProps, depth = 0): string {
  const pad = INDENT.repeat(depth);
  const lines = Object.entries(props).map(([name, value]) => `${pad}${INDENT}${name}: ${value};`);
  return `${pad}${selector} {\n${lines.join("\n")}\n${pad}}`;
}

type RuleGroup = { className: string; rule: ElementRule };

/** Elements with identical output share one class, keeping the CSS short. */
function groupRules(prefix: string, rules: ElementRule[]): Map<string, RuleGroup> {
  const byKey = new Map<string, RuleGroup>();
  const byElement = new Map<string, RuleGroup>();
  for (const rule of rules) {
    const key = JSON.stringify([rule.props, rule.animations, rule.reducedMotion]);
    let group = byKey.get(key);
    if (!group) {
      group = { className: `${prefix}-${byKey.size}`, rule };
      byKey.set(key, group);
    }
    byElement.set(rule.elementId, group);
  }
  return byElement;
}

export function buildCss(compiled: CompiledAnimation, groups: Iterable<RuleGroup>): string {
  const prefix = compiled.id;
  const unique = [...new Set(groups)];
  const sections: string[] = [];

  for (const { className, rule } of unique) {
    const animation = rule.animations.map((item) => formatAnimation(prefix, item)).join(", ");
    sections.push(block(`.${className}`, animation ? { ...rule.props, animation } : rule.props));
  }
  for (const definition of compiled.keyframes) {
    const stops = definition.stops.map((stop) =>
      block(`${formatNumber(stop.offset * 100)}%`, stop.props, 1),
    );
    sections.push(`@keyframes ${prefix}-${definition.name} {\n${stops.join("\n")}\n}`);
  }
  const reduced = [
    block(`.${prefix} *`, { animation: "none" }, 1),
    ...unique
      .filter(({ rule }) => Object.keys(rule.reducedMotion).length > 0)
      .map(({ className, rule }) => block(`.${className}`, rule.reducedMotion, 1)),
  ];
  sections.push(`@media (prefers-reduced-motion: reduce) {\n${reduced.join("\n")}\n}`);
  return sections.join("\n");
}

/**
 * Standalone animated SVG with an embedded `<style>`. Zero runtime. This exact output is
 * what the editor preview renders (preview = export).
 */
export function exportCss(compiled: CompiledAnimation, options: CssExportOptions = {}): string {
  const groups = groupRules(compiled.id, compiled.rules);
  const root: SvgElementNode = cloneNode(compiled.root);

  walkElements(root, (element) => {
    const elementId = element.attrs["data-sk-id"];
    if (elementId === undefined) return undefined;
    const group = groups.get(elementId);
    if (group) element.attrs.class = group.className;
    if (!options.includeElementIds) delete element.attrs["data-sk-id"];
    return undefined;
  });

  root.attrs.class = compiled.id;
  root.attrs.role = "img";
  root.attrs["aria-label"] = compiled.a11y.label;

  const css = buildCss(compiled, groups.values());
  const style: SvgElementNode = {
    type: "element",
    name: "style",
    attrs: {},
    children: [{ type: "text", value: `\n${css}\n` }],
  };
  root.children = [style, ...root.children];
  return `${serializeSvg(root)}\n`;
}
