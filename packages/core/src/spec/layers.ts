import { z } from "zod";
import type { DrawableElement } from "../svg/types";
import type { AnimationSpec } from "./schema";

const NUMBER = String.raw`-?(?:\d+\.?\d*|\.\d+)(?:%|deg|grad|rad|turn)?`;
const HEX_COLOR = /^#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
const FUNCTION_COLOR = new RegExp(
  String.raw`^(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch)\(\s*${NUMBER}(?:\s*[\s,/]\s*${NUMBER})*\s*\)$`,
  "i",
);
/** Named colors, `currentColor`, `transparent`, `none`: letters only, nothing to escape from. */
const KEYWORD_COLOR = /^[a-z]{3,24}$/i;

/**
 * Colors end up inside the exported `<style>` and may come from a shared link, so only plain
 * color syntax is accepted: no `;`, `}`, `url()`, `var()` or anything else that could break out.
 */
export const colorSchema = z
  .string()
  .trim()
  .max(64)
  .refine(
    (value) => HEX_COLOR.test(value) || FUNCTION_COLOR.test(value) || KEYWORD_COLOR.test(value),
    { message: "Invalid color" },
  );

/** Per-layer edits. The imported SVG is never changed; `compile()` applies these on top. */
export const layerOverrideSchema = z
  .object({
    /** Shown in the editor and used for the layer's CSS tokens (`--sk-<name>-stroke`). */
    name: z.string().trim().min(1).max(60).optional(),
    /** Left out of the preview and of every export. */
    hidden: z.boolean().optional(),
    stroke: colorSchema.optional(),
    fill: colorSchema.optional(),
    strokeWidth: z.number().min(0).max(100).optional(),
    opacity: z.number().min(0).max(1).optional(),
    linecap: z.enum(["butt", "round", "square"]).optional(),
    linejoin: z.enum(["miter", "round", "bevel"]).optional(),
    /** Where stroke animations start, as a fraction (0–1) of the outline. */
    start: z.number().min(0).max(1).optional(),
    /** Runs stroke animations the other way around the outline. */
    reverse: z.boolean().optional(),
  })
  .strict();

export type LayerOverride = z.infer<typeof layerOverrideSchema>;

/** `undefined` clears a field back to the SVG's own value. */
export type LayerPatch = { [K in keyof LayerOverride]?: LayerOverride[K] | undefined };

export function getLayer(spec: AnimationSpec, id: string): LayerOverride {
  return spec.layers?.[id] ?? {};
}

function withLayers(spec: AnimationSpec, layers: Record<string, LayerOverride>): AnimationSpec {
  // An empty map is left out so specs without edits keep their exact shape (and hash).
  const { layers: _previous, ...rest } = spec;
  return Object.keys(layers).length > 0 ? { ...rest, layers } : rest;
}

/** Applies `patch` to every layer in `ids`. Cleared fields and empty overrides are removed. */
export function updateLayers(spec: AnimationSpec, ids: string[], patch: LayerPatch): AnimationSpec {
  const layers: Record<string, LayerOverride> = { ...spec.layers };
  for (const id of new Set(ids)) {
    const merged: Record<string, unknown> = { ...layers[id], ...patch };
    for (const key of Object.keys(merged)) {
      if (merged[key] === undefined) delete merged[key];
    }
    if (Object.keys(merged).length > 0) layers[id] = merged as LayerOverride;
    else delete layers[id];
  }
  return withLayers(spec, layers);
}

/** Drops every edit of the given layers. */
export function resetLayers(spec: AnimationSpec, ids: string[]): AnimationSpec {
  const layers: Record<string, LayerOverride> = { ...spec.layers };
  for (const id of ids) delete layers[id];
  return withLayers(spec, layers);
}

/** Keeps only the overrides of layers in `ids` (used when the SVG changes). */
export function pickLayers(spec: AnimationSpec, ids: ReadonlySet<string>): AnimationSpec {
  const layers = Object.fromEntries(
    Object.entries(spec.layers ?? {}).filter(([id]) => ids.has(id)),
  );
  return withLayers(spec, layers);
}

function slug(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Name of each layer inside its CSS tokens (`--sk-<token>-stroke`): the slug of its name,
 * or `layer-<n>` from the element id. Unique and deterministic by document order.
 */
export function layerTokens(
  spec: AnimationSpec,
  elements: readonly DrawableElement[],
): Map<string, string> {
  const tokens = new Map<string, string>();
  const used = new Set<string>();
  for (const element of elements) {
    const fallback = `layer-${element.id.replace(/^sk-/, "")}`;
    const name = spec.layers?.[element.id]?.name;
    let token = (name && slug(name)) || fallback;
    // Tokens must not collide with the global ones (`--sk-stroke`, `--sk-speed`…).
    if (/^(stroke|fill|speed|iterations|play-state)$/.test(token)) token = `layer-${token}`;
    let unique = token;
    for (let n = 2; used.has(unique); n++) unique = `${token}-${n}`;
    used.add(unique);
    tokens.set(element.id, unique);
  }
  return tokens;
}
