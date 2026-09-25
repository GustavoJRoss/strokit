export { compile } from "./compile/compile";
export type {
  AnimationDef,
  CompiledAnimation,
  CompileWarning,
  CssProps,
  ElementRule,
  KeyframeStop,
  KeyframesDef,
} from "./compile/types";
export * as exporters from "./exporters";
export { getPreset, presetIds, presets } from "./presets";
export type { Preset, PresetContext, PresetOutput } from "./presets/types";
export { applyPreset, createEmptySpec, createTrack } from "./spec/defaults";
export { CURRENT_SPEC_VERSION, migrate, parseSpec, SpecVersionError } from "./spec/migrate";
export {
  type AnimationSpec,
  animationSpecSchema,
  type PresetId,
  type Track,
  trackSchema,
} from "./spec/schema";
export type { Easing, EasingPreset, Timing } from "./spec/timing";
export { type ImportWarning, SvgImportError, type SvgImportErrorCode } from "./svg/errors";
export { type ImportOptions, type ImportResult, importSvg, sanitizeSvg } from "./svg/import";
export { normalizeSvg } from "./svg/normalize";
export { type DomParserLike, MAX_SVG_BYTES, parseSvg } from "./svg/parse";
export { serializeSvg } from "./svg/serialize";
export type { SvgElementNode, SvgNode } from "./svg/tree";
export type { DrawableElement, DrawableTag, SvgDocument } from "./svg/types";
