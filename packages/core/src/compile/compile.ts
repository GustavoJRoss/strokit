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
  return preset.compile({ element, index, total, params: track.params, timing: track.timing });
}

function strokeProps(
  element: DrawableElement,
  spec: AnimationSpec,
): { props: Record<string, string>; missing: boolean } {
  if (element.hasStroke) {
    return {
      props: { stroke: `var(--sk-stroke, ${element.stroke ?? "currentColor"})` },
      missing: false,
    };
  }
  if (spec.global.autoStroke.enabled) {
    return {
      props: {
        stroke: `var(--sk-stroke, ${element.fill ?? "currentColor"})`,
        "stroke-width": String(spec.global.autoStroke.width),
      },
      missing: false,
    };
  }
  return { props: {}, missing: true };
}

/** AnimationSpec + SvgDocument → CompiledAnimation (neutral IR for every exporter). */
export function compile(document: SvgDocument, spec: AnimationSpec): CompiledAnimation {
  const id = `sk-${hashString(`${document.raw}\n${JSON.stringify(spec)}`)}`;
  const elementsById = new Map(document.elements.map((element) => [element.id, element]));
  const keyframes = new Map<string, KeyframesDef>();
  const rules: ElementRule[] = [];
  const attrsById = new Map<string, Record<string, string>>();
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
      if (preset.requiresStroke) {
        const stroke = strokeProps(element, spec);
        if (stroke.missing) {
          warnings.push({ code: "missing-stroke", trackId: track.id, elementId: target });
        }
        props = { ...stroke.props, ...props };
      }
      rules.push({
        elementId: target,
        trackId: track.id,
        props,
        animations: output.rule.animations.map((animation) => ({
          ...animation,
          keyframes: namespace(animation.keyframes),
        })),
        reducedMotion: output.rule.reducedMotion,
      });
      if (output.rule.attrs) attrsById.set(target, output.rule.attrs);
    });
  });

  const root: SvgElementNode = cloneNode(document.root);
  walkElements(root, (element) => {
    const attrs = attrsById.get(element.attrs["data-sk-id"] ?? "");
    if (attrs) Object.assign(element.attrs, attrs);
    return undefined;
  });

  return {
    id,
    root,
    keyframes: [...keyframes.values()],
    rules,
    a11y: { ...spec.global.a11y },
    warnings,
  };
}
