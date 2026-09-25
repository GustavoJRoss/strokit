import { presets, type TrackOf } from "../presets";
import type { PresetOutput } from "../presets/types";
import type { AnimationSpec, PresetId } from "../spec/schema";
import { cloneNode, type SvgElementNode, walkElements } from "../svg/tree";
import type { DrawableElement, SvgDocument } from "../svg/types";
import { hashString } from "../util/hash";
import type { CompiledAnimation, CompileWarning, ElementRule, KeyframesDef } from "./types";

function runPreset<K extends PresetId>(
  track: TrackOf<K>,
  element: DrawableElement,
  index: number,
  total: number,
): PresetOutput {
  const preset = presets[track.preset];
  // `track.params` widens to the union of all params; the discriminant guarantees the match.
  const params = track.params as TrackOf<K>["params"];
  return preset.compile({ element, index, total, params, timing: track.timing });
}

function animatesTransform(output: PresetOutput): boolean {
  return (
    "transform" in output.rule.props ||
    output.keyframes.some((definition) =>
      definition.stops.some((stop) => "transform" in stop.props),
    )
  );
}

/**
 * A CSS `transform` replaces the SVG `transform` attribute instead of composing with it.
 * Elements whose animation sets `transform` get their original one moved to a wrapper `<g>`.
 */
function wrapTransformed(element: SvgElementNode, ids: ReadonlySet<string>): void {
  element.children = element.children.map((child) => {
    if (child.type !== "element") return child;
    const id = child.attrs["data-sk-id"];
    if (id !== undefined && ids.has(id) && child.attrs.transform !== undefined) {
      const { transform, ...attrs } = child.attrs;
      return { type: "element", name: "g", attrs: { transform }, children: [{ ...child, attrs }] };
    }
    wrapTransformed(child, ids);
    return child;
  });
}

/** Fill opacity of "ghost" fills: dim enough for a same-color dash to read on top. */
export const GHOST_FILL_OPACITY = "0.2";

function strokeProps(
  element: DrawableElement,
  spec: AnimationSpec,
  fill: "keep" | "ghost",
): { props: Record<string, string>; reducedMotion: Record<string, string>; missing: boolean } {
  if (element.hasStroke) {
    return {
      props: { stroke: `var(--sk-stroke, ${element.stroke ?? "currentColor"})` },
      reducedMotion: {},
      missing: false,
    };
  }
  if (spec.global.autoStroke.enabled) {
    const ghost = fill === "ghost" && element.hasFill;
    return {
      props: {
        stroke: `var(--sk-stroke, ${element.fill ?? "currentColor"})`,
        "stroke-width": String(spec.global.autoStroke.width),
        ...(ghost ? { "fill-opacity": GHOST_FILL_OPACITY } : {}),
      },
      reducedMotion: ghost ? { "fill-opacity": "1" } : {},
      missing: false,
    };
  }
  return { props: {}, reducedMotion: {}, missing: true };
}

/** AnimationSpec + SvgDocument → CompiledAnimation (neutral IR for every exporter). */
export function compile(document: SvgDocument, spec: AnimationSpec): CompiledAnimation {
  const id = `sk-${hashString(`${document.raw}\n${JSON.stringify(spec)}`)}`;
  const elementsById = new Map(document.elements.map((element) => [element.id, element]));
  const keyframes = new Map<string, KeyframesDef>();
  const rules: ElementRule[] = [];
  const attrsById = new Map<string, Record<string, string>>();
  const transformed = new Set<string>();
  const warnings: CompileWarning[] = [];

  spec.tracks.forEach((track, trackIndex) => {
    const preset = presets[track.preset];
    const targets = track.targets.filter((target) => {
      if (elementsById.has(target)) return true;
      warnings.push({ code: "unknown-target", trackId: track.id, elementId: target });
      return false;
    });
    const namespace = (name: string) => `t${trackIndex}-${name}`;

    targets.forEach((target, index) => {
      const element = elementsById.get(target) as DrawableElement;
      const output = runPreset(track, element, index, targets.length);
      for (const definition of output.keyframes) {
        const name = namespace(definition.name);
        if (!keyframes.has(name)) keyframes.set(name, { ...definition, name });
      }
      let props = output.rule.props;
      let reducedMotion = output.rule.reducedMotion;
      if (preset.requiresStroke) {
        const stroke = strokeProps(element, spec, preset.autoStrokeFill ?? "keep");
        if (stroke.missing) {
          warnings.push({ code: "missing-stroke", trackId: track.id, elementId: target });
        }
        props = { ...stroke.props, ...props };
        reducedMotion = { ...reducedMotion, ...stroke.reducedMotion };
      }
      rules.push({
        elementId: target,
        trackId: track.id,
        props,
        animations: output.rule.animations.map((animation) => ({
          ...animation,
          keyframes: namespace(animation.keyframes),
        })),
        reducedMotion,
      });
      if (output.rule.attrs) attrsById.set(target, output.rule.attrs);
      if (animatesTransform(output)) transformed.add(target);
    });
  });

  const root: SvgElementNode = cloneNode(document.root);
  walkElements(root, (element) => {
    const attrs = attrsById.get(element.attrs["data-sk-id"] ?? "");
    if (attrs) Object.assign(element.attrs, attrs);
    return undefined;
  });
  if (transformed.size > 0) wrapTransformed(root, transformed);

  return {
    id,
    root,
    keyframes: [...keyframes.values()],
    rules,
    a11y: { ...spec.global.a11y },
    warnings,
  };
}
