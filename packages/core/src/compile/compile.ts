import { presets, type TrackOf } from "../presets";
import type { PathMotion } from "../presets/path-motion";
import type { PresetOutput } from "../presets/types";
import { type LayerOverride, layerTokens } from "../spec/layers";
import type { AnimationSpec, PresetId } from "../spec/schema";
import {
  apply,
  determinant,
  IDENTITY,
  invert,
  isSimilarity,
  type Matrix,
  multiply,
  parseTransform,
} from "../svg/transform";
import { cloneNode, type SvgElementNode, walkElements } from "../svg/tree";
import type { DrawableElement, SvgDocument } from "../svg/types";
import { canonicalJson, hashString } from "../util/hash";
import type { CompiledAnimation, CompileWarning, ElementRule, KeyframesDef } from "./types";

function runPreset<K extends PresetId>(
  track: TrackOf<K>,
  element: DrawableElement,
  index: number,
  total: number,
  path: PathMotion,
  viewBox: SvgDocument["viewBox"],
  space: Space,
): PresetOutput {
  const preset = presets[track.preset];
  // `track.params` widens to the union of all params; the discriminant guarantees the match.
  const params = track.params as TrackOf<K>["params"];
  return preset.compile({
    element,
    index,
    total,
    params,
    timing: track.timing,
    path,
    viewBox,
    ...space,
  });
}

type Space = { origin?: [number, number]; mirrored?: boolean };

/**
 * Where the center of the viewBox falls in each drawable's own coordinates: the inverse of the
 * accumulated `transform` (ancestors, then the element itself). Elements whose space is not a
 * plain rotation + uniform scale (skew, non-uniform scale, unparseable) get `skewed` instead.
 */
function coordinateSpaces(
  root: SvgElementNode,
  viewBox: SvgDocument["viewBox"],
): Map<string, Space & { skewed?: boolean }> {
  const [x, y, width, height] = viewBox;
  const center: [number, number] = [x + width / 2, y + height / 2];
  const spaces = new Map<string, Space & { skewed?: boolean }>();
  const inherited = new Map<SvgElementNode, Matrix | null>();
  walkElements(root, (element, ancestors) => {
    const parent = ancestors[ancestors.length - 1];
    const before = parent ? inherited.get(parent) : IDENTITY;
    const own = parseTransform(element.attrs.transform);
    const matrix = before && own ? multiply(before, own) : null;
    inherited.set(element, matrix);
    const id = element.attrs["data-sk-id"];
    if (id === undefined) return undefined;
    const inverse = matrix && isSimilarity(matrix) ? invert(matrix) : null;
    if (!matrix || !inverse) {
      spaces.set(id, { skewed: true });
    } else {
      spaces.set(id, {
        origin: apply(inverse, center[0], center[1]),
        mirrored: determinant(matrix) < 0,
      });
    }
    return undefined;
  });
  return spaces;
}

/** Properties the element's animations set, from its rule or its keyframes. */
function animatedProps(output: PresetOutput): Set<string> {
  const names = new Set(Object.keys(output.rule.props));
  for (const definition of output.keyframes) {
    for (const stop of definition.stops) {
      for (const name of Object.keys(stop.props)) names.add(name);
    }
  }
  return names;
}

/**
 * A CSS `transform` replaces the SVG `transform` attribute instead of composing with it, and the
 * same goes for `opacity`. Attributes that an animation also sets are moved to a wrapper `<g>`.
 */
function wrapAnimatedAttrs(element: SvgElementNode, moved: ReadonlyMap<string, string[]>): void {
  element.children = element.children.map((child) => {
    if (child.type !== "element") return child;
    const names = moved.get(child.attrs["data-sk-id"] ?? "")?.filter((name) => name in child.attrs);
    if (names && names.length > 0) {
      const attrs = { ...child.attrs };
      const wrapper: Record<string, string> = {};
      for (const name of names) {
        wrapper[name] = attrs[name] as string;
        delete attrs[name];
      }
      return { type: "element", name: "g", attrs: wrapper, children: [{ ...child, attrs }] };
    }
    wrapAnimatedAttrs(child, moved);
    return child;
  });
}

function removeElements(element: SvgElementNode, ids: ReadonlySet<string>): void {
  element.children = element.children.filter(
    (child) => child.type !== "element" || !ids.has(child.attrs["data-sk-id"] ?? ""),
  );
  for (const child of element.children) {
    if (child.type === "element") removeElements(child, ids);
  }
}

/** Fill opacity of "ghost" fills: dim enough for a same-color dash to read on top. */
export const GHOST_FILL_OPACITY = "0.2";

type Layer = { override: LayerOverride; token: string };

type StrokeProps = {
  props: Record<string, string>;
  reducedMotion: Record<string, string>;
  missing: boolean;
};

/** `--sk-stroke` themes every layer; a layer with its own color also gets its own token. */
function strokeColor(color: string, layer: Layer): string {
  return layer.override.stroke === undefined
    ? `var(--sk-stroke, ${color})`
    : `var(--sk-${layer.token}-stroke, var(--sk-stroke, ${color}))`;
}

/**
 * Stroke of an element: its own (possibly recolored), one chosen in the layer editor, or,
 * when `auto` is set (stroke presets), the RF4 auto-stroke in the color of the fill.
 */
function strokeProps(
  element: DrawableElement,
  layer: Layer,
  spec: AnimationSpec,
  fill: "keep" | "ghost",
  auto: boolean,
): StrokeProps {
  const { stroke, strokeWidth } = layer.override;
  const none: StrokeProps = { props: {}, reducedMotion: {}, missing: auto };
  if (stroke === "none") return { ...none, props: { stroke: "none" } };
  if (element.hasStroke) {
    // Outside stroke presets the stroke is only themed when the layer editor changed it.
    const props: Record<string, string> =
      auto || stroke !== undefined
        ? { stroke: strokeColor(stroke ?? element.stroke ?? "currentColor", layer) }
        : {};
    if (strokeWidth !== undefined) props["stroke-width"] = String(strokeWidth);
    return { props, reducedMotion: {}, missing: false };
  }
  const width = String(strokeWidth ?? spec.global.autoStroke.width);
  if (stroke !== undefined) {
    return {
      props: { stroke: strokeColor(stroke, layer), "stroke-width": width },
      reducedMotion: {},
      missing: false,
    };
  }
  if (auto && spec.global.autoStroke.enabled) {
    const ghost = fill === "ghost" && element.hasFill;
    return {
      props: {
        stroke: strokeColor(layer.override.fill ?? element.fill ?? "currentColor", layer),
        "stroke-width": width,
        ...(ghost ? { "fill-opacity": GHOST_FILL_OPACITY } : {}),
      },
      reducedMotion: ghost ? { "fill-opacity": "1" } : {},
      missing: false,
    };
  }
  return none;
}

function fillProps(layer: Layer): Record<string, string> {
  const { fill } = layer.override;
  if (fill === undefined) return {};
  return { fill: fill === "none" ? "none" : `var(--sk-${layer.token}-fill, ${fill})` };
}

/** Plain presentation attributes: nothing in the presets' CSS sets them. */
function layerAttrs(override: LayerOverride): Record<string, string> {
  const attrs: Record<string, string> = {};
  if (override.opacity !== undefined) attrs.opacity = String(override.opacity);
  if (override.linecap !== undefined) attrs["stroke-linecap"] = override.linecap;
  if (override.linejoin !== undefined) attrs["stroke-linejoin"] = override.linejoin;
  return attrs;
}

/** AnimationSpec + SvgDocument → CompiledAnimation (neutral IR for every exporter). */
export function compile(document: SvgDocument, spec: AnimationSpec): CompiledAnimation {
  // Canonical JSON: a spec restored from a link (keys in schema order) hashes like the original.
  const id = `sk-${hashString(`${document.raw}\n${canonicalJson(spec)}`)}`;
  const elementsById = new Map(document.elements.map((element) => [element.id, element]));
  const tokens = layerTokens(spec, document.elements);
  const layerOf = (id: string): Layer => ({
    override: spec.layers?.[id] ?? {},
    token: tokens.get(id) ?? id,
  });
  const hidden = new Set(
    Object.entries(spec.layers ?? {})
      .filter(([, override]) => override.hidden === true)
      .map(([id]) => id),
  );
  const keyframes = new Map<string, KeyframesDef>();
  const rules: ElementRule[] = [];
  const attrsById = new Map<string, Record<string, string>>();
  const moved = new Map<string, string[]>();
  const animated = new Set<string>();
  const warnings: CompileWarning[] = [];
  const spaces = coordinateSpaces(document.root, document.viewBox);

  spec.tracks.forEach((track, trackIndex) => {
    const preset = presets[track.preset];
    const targets = track.targets.filter((target) => {
      if (hidden.has(target)) return false;
      if (elementsById.has(target)) return true;
      warnings.push({ code: "unknown-target", trackId: track.id, elementId: target });
      return false;
    });
    const namespace = (name: string) => `t${trackIndex}-${name}`;

    targets.forEach((target, index) => {
      const element = elementsById.get(target) as DrawableElement;
      const layer = layerOf(target);
      const { skewed, ...space } = spaces.get(target) ?? {};
      if (skewed && track.preset === "spin" && track.params.pivot === "logo") {
        warnings.push({ code: "spin-skewed-transform", trackId: track.id, elementId: target });
      }
      const output = runPreset(
        track,
        element,
        index,
        targets.length,
        {
          start: layer.override.start ?? 0,
          reverse: layer.override.reverse ?? false,
        },
        document.viewBox,
        space,
      );
      for (const definition of output.keyframes) {
        const name = namespace(definition.name);
        if (!keyframes.has(name)) keyframes.set(name, { ...definition, name });
      }
      const stroke = strokeProps(
        element,
        layer,
        spec,
        preset.autoStrokeFill ?? "keep",
        preset.requiresStroke,
      );
      if (stroke.missing) {
        warnings.push({ code: "missing-stroke", trackId: track.id, elementId: target });
      }
      rules.push({
        elementId: target,
        trackId: track.id,
        props: { ...stroke.props, ...fillProps(layer), ...output.rule.props },
        animations: output.rule.animations.map((animation) => ({
          ...animation,
          keyframes: namespace(animation.keyframes),
        })),
        reducedMotion: { ...output.rule.reducedMotion, ...stroke.reducedMotion },
      });
      attrsById.set(target, { ...output.rule.attrs, ...layerAttrs(layer.override) });
      const props = animatedProps(output);
      const names = ["transform", "opacity"].filter((name) => props.has(name));
      if (names.length > 0) moved.set(target, names);
      animated.add(target);
    });
  });

  // Edited layers without an animation still get their colors and attributes.
  for (const [id, override] of Object.entries(spec.layers ?? {})) {
    const element = elementsById.get(id);
    if (!element) {
      warnings.push({ code: "unknown-layer", elementId: id });
      continue;
    }
    if (animated.has(id) || hidden.has(id)) continue;
    const layer = layerOf(id);
    const props = {
      ...strokeProps(element, layer, spec, "keep", false).props,
      ...fillProps(layer),
    };
    if (Object.keys(props).length > 0) {
      rules.push({ elementId: id, props, animations: [], reducedMotion: {} });
    }
    attrsById.set(id, layerAttrs(override));
  }

  const root: SvgElementNode = cloneNode(document.root);
  if (hidden.size > 0) removeElements(root, hidden);
  walkElements(root, (element) => {
    const attrs = attrsById.get(element.attrs["data-sk-id"] ?? "");
    if (attrs) Object.assign(element.attrs, attrs);
    return undefined;
  });
  if (moved.size > 0) wrapAnimatedAttrs(root, moved);

  return {
    id,
    root,
    keyframes: [...keyframes.values()],
    rules,
    a11y: { ...spec.global.a11y },
    warnings,
  };
}
