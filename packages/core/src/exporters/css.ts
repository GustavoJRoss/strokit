import type { CompiledAnimation } from "../compile/types";
import { serializeSvg } from "../svg/serialize";
import type { SvgElementNode } from "../svg/tree";
import { buildCss, classedRoot, groupRules, uniqueGroups } from "./shared";

export { formatEasing } from "./shared";

export type CssExportOptions = {
  /** Keep `data-sk-id` on drawables. The editor preview needs them; exported code does not. */
  includeElementIds?: boolean;
};

/**
 * Standalone animated SVG with an embedded `<style>`. Zero runtime. This exact output is
 * what the editor preview renders (preview = export).
 */
export function exportCss(compiled: CompiledAnimation, options: CssExportOptions = {}): string {
  const groups = groupRules(compiled.id, compiled.rules);
  const root = classedRoot(compiled, groups, options.includeElementIds);
  root.attrs.class = compiled.id;
  root.attrs.role = "img";
  root.attrs["aria-label"] = compiled.a11y.label;

  const css = buildCss(compiled, uniqueGroups(groups));
  const style: SvgElementNode = {
    type: "element",
    name: "style",
    attrs: {},
    children: [{ type: "text", value: `\n${css}\n` }],
  };
  root.children = [style, ...root.children];
  return `${serializeSvg(root)}\n`;
}
