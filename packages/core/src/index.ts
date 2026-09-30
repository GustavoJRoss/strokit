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
export {
  type GeometryLike,
  type MatrixLike,
  nearestIndex,
  type Point,
  pickNearestOutline,
  pickPathFraction,
  pointAtFraction,
} from "./dom/nearest-point";
export { appendDrawnPaths, BLANK_VIEWBOX, type DrawnPath } from "./draw/append";
export { freehandPath, simplify, smoothPath } from "./draw/freehand";
export { type DrawPoint, type ShapeKind, type ShapeOptions, shapePath } from "./draw/shapes";
export * as exporters from "./exporters";
export { toComponentName } from "./exporters/jsx";
export { getPreset, presetIds, presets } from "./presets";
export { describeParams, type ParamField, type ParamMeta } from "./presets/fields";
export { DEFAULT_PATH, type PathMotion } from "./presets/path-motion";
export type {
  OverlayContext,
  OverlayOutput,
  Preset,
  PresetContext,
  PresetKind,
  PresetOutput,
} from "./presets/types";
export {
  animationLength,
  type FrameOptions,
  renderFrame,
  sampleAnimation,
} from "./render/frame";
export {
  decodeShare,
  encodeShare,
  PROJECT_EXTENSION,
  type ProjectFile,
  parseProject,
  SHARE_HASH_PREFIX,
  SHARE_URL_LIMIT,
  type SharedAnimation,
  ShareError,
  type ShareErrorCode,
  serializeProject,
} from "./share";
export { orderedTracks, type TrackTime, trackTimes } from "./spec/chain";
export {
  appendStep,
  applyPreset,
  chainOf,
  createEmptySpec,
  createTrack,
  DEFAULT_PRESET,
  findTrackForElement,
  moveStep,
  pruneTracks,
  removeStep,
  setStepPreset,
  updateTrackParams,
  updateTrackTiming,
} from "./spec/defaults";
export {
  colorSchema,
  getLayer,
  type LayerOverride,
  type LayerPatch,
  layerOverrideSchema,
  layerTokens,
  pickLayers,
  resetLayers,
  updateLayers,
} from "./spec/layers";
export { CURRENT_SPEC_VERSION, migrate, parseSpec, SpecVersionError } from "./spec/migrate";
export { type ReconcileResult, reconcileSpec } from "./spec/reconcile";
export {
  type AnimationSpec,
  animationSpecSchema,
  type PresetId,
  type Track,
  trackSchema,
} from "./spec/schema";
export { type Easing, type EasingPreset, easingPresetSchema, type Timing } from "./spec/timing";
export { type ImportWarning, SvgImportError, type SvgImportErrorCode } from "./svg/errors";
export { type ImportOptions, type ImportResult, importSvg, sanitizeSvg } from "./svg/import";
export { type LayerNode, layerTree } from "./svg/layers";
export { normalizeSvg } from "./svg/normalize";
export { type DomParserLike, MAX_SVG_BYTES, parseSvg } from "./svg/parse";
export { serializeSvg } from "./svg/serialize";
export {
  type StrokeScales,
  strokeScales,
  toUserWidth,
  toVisualWidth,
  visualUnit,
} from "./svg/stroke-scale";
export type { SvgElementNode, SvgNode } from "./svg/tree";
export type { DrawableElement, DrawableTag, SvgDocument } from "./svg/types";
