import type { AnimationDef, CompiledAnimation, CssProps, ElementRule } from "../compile/types";
import type { Easing } from "../spec/timing";
import { cloneNode, type SvgElementNode, walkElements } from "../svg/tree";

/**
 * How animations reach the CSS:
 * - "static": fixed values (CSS export, editor preview);
 * - "variables": fixed values scaled/overridden by `--sk-speed`, `--sk-iterations` and
 *   `--sk-play-state` (React export, props without re-render);
 * - "none": no `animation`; the first keyframe is written as the initial state and a JS
 *   runtime drives the motion (Motion export).
 */
export type AnimationMode = "static" | "variables" | "none";

export type RuleGroup = { className: string; rule: ElementRule };

const INDENT = "  ";

export function formatNumber(value: number): string {
  return String(Math.round(value * 10_000) / 10_000);
}

export function formatEasing(easing: Easing): string {
  if (typeof easing === "string") return easing;
  return `cubic-bezier(${easing.cubicBezier.map(formatNumber).join(", ")})`;
}

function formatIterations(animation: AnimationDef): string {
  return animation.iterations === "infinite" ? "infinite" : formatNumber(animation.iterations);
}

/**
 * `loop` (`--sk-iterations`) only reaches the last animation of an element: an earlier step that
 * looped would never hand over to the next one.
 */
function formatAnimation(
  prefix: string,
  animation: AnimationDef,
  mode: AnimationMode,
  last: boolean,
): string {
  const scaled = (ms: number) =>
    mode === "variables" && ms !== 0 ? `calc(${ms}ms / var(--sk-speed, 1))` : `${ms}ms`;
  return [
    `${prefix}-${animation.keyframes}`,
    scaled(animation.duration),
    formatEasing(animation.easing),
    scaled(animation.delay),
    mode === "variables" && last
      ? `var(--sk-iterations, ${formatIterations(animation)})`
      : formatIterations(animation),
    animation.direction,
    animation.fillMode,
  ].join(" ");
}

export function block(selector: string, props: CssProps, depth = 0): string {
  const pad = INDENT.repeat(depth);
  const lines = Object.entries(props).map(([name, value]) => `${pad}${INDENT}${name}: ${value};`);
  return `${pad}${selector} {\n${lines.join("\n")}\n${pad}}`;
}

/** Elements with identical output share one class, keeping the CSS short. */
export function groupRules(prefix: string, rules: ElementRule[]): Map<string, RuleGroup> {
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

export function uniqueGroups(groups: Map<string, RuleGroup>): RuleGroup[] {
  return [...new Set(groups.values())];
}

/** First keyframe of every animation of a rule, merged (earlier steps win): the state before JS takes over. */
export function initialProps(compiled: CompiledAnimation, rule: ElementRule): CssProps {
  const props: CssProps = {};
  for (const animation of rule.animations) {
    const definition = compiled.keyframes.find((item) => item.name === animation.keyframes);
    const first = definition?.stops.find((stop) => stop.offset === 0);
    if (first) Object.assign(props, { ...first.props, ...props });
  }
  return props;
}

export function buildCss(
  compiled: CompiledAnimation,
  groups: RuleGroup[],
  mode: AnimationMode = "static",
): string {
  const prefix = compiled.id;
  const sections: string[] = [];

  for (const { className, rule } of groups) {
    if (mode === "none") {
      sections.push(block(`.${className}`, { ...rule.props, ...initialProps(compiled, rule) }));
      continue;
    }
    const animation = rule.animations
      .map((item, index, all) => formatAnimation(prefix, item, mode, index === all.length - 1))
      .join(", ");
    const props: CssProps = animation ? { ...rule.props, animation } : { ...rule.props };
    if (animation && mode === "variables")
      props["animation-play-state"] = "var(--sk-play-state, running)";
    sections.push(block(`.${className}`, props));
  }
  if (mode !== "none") {
    for (const definition of compiled.keyframes) {
      const stops = definition.stops.map((stop) =>
        block(`${formatNumber(stop.offset * 100)}%`, stop.props, 1),
      );
      sections.push(`@keyframes ${prefix}-${definition.name} {\n${stops.join("\n")}\n}`);
    }
  }
  const reduced = [
    block(`.${prefix} *`, { animation: "none" }, 1),
    ...groups
      .filter(({ rule }) => Object.keys(rule.reducedMotion).length > 0)
      .map(({ className, rule }) => block(`.${className}`, rule.reducedMotion, 1)),
  ];
  sections.push(`@media (prefers-reduced-motion: reduce) {\n${reduced.join("\n")}\n}`);
  return sections.join("\n");
}

/** Clone of the compiled tree with group classes on drawables; `data-sk-id` kept only if asked. */
export function classedRoot(
  compiled: CompiledAnimation,
  groups: Map<string, RuleGroup>,
  keepElementIds = false,
): SvgElementNode {
  const root = cloneNode(compiled.root);
  walkElements(root, (element) => {
    const elementId = element.attrs["data-sk-id"];
    if (elementId === undefined) return undefined;
    const group = groups.get(elementId);
    if (group) element.attrs.class = group.className;
    if (!keepElementIds) delete element.attrs["data-sk-id"];
    return undefined;
  });
  return root;
}
