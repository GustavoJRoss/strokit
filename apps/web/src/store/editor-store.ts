import {
  type AnimationSpec,
  appendDrawnPaths,
  appendStep,
  applyPreset,
  BLANK_VIEWBOX,
  createEmptySpec,
  DEFAULT_PRESET,
  deleteLayers as deleteLayersFromSvg,
  type GroupErrorCode,
  groupLayers,
  type ImportWarning,
  importSvg,
  type LayerPatch,
  moveElements,
  moveStep,
  type PresetId,
  type ReconcileResult,
  reconcileSpec,
  removeStep,
  resetLayers,
  type SharedAnimation,
  type SvgDocument,
  setStepPreset,
  type Timing,
  toUserWidth,
  type UngroupErrorCode,
  ungroupLayers,
  updateLayers,
  updateTrackParams,
  updateTrackTiming,
  visualUnit,
} from "@strokit/core";
import { create } from "zustand";

export type Background = "light" | "dark" | "checker";
export type ExportTab = "css" | "react" | "motion";
export type SelectMode = "replace" | "toggle" | "range";
/** What a click on the canvas does: select layers, or set the start point of a layer. */
export type CanvasTool = "select" | "start";

/** Shapes the draw mode can make. */
export type DrawTool = "pencil" | "pen" | "line" | "rect" | "ellipse";

/** What undo brings back: the document, the spec and the selection. Cheap: all of it is immutable. */
export type Snapshot = {
  doc: SvgDocument | null;
  fileName: string | null;
  spec: AnimationSpec;
  selection: string[];
};

/** Draw mode UI state. */
export type DrawState = {
  active: boolean;
  tool: DrawTool;
  /** Stroke width of new shapes, in the same visual units (%) as the width sliders. */
  width: number;
  /** Stroke color of new shapes. */
  color: string;
  /**
   * Pressing on an existing shape selects it (and drags it) instead of starting a new one. Set
   * when the active tool is picked again: the next shape is drawn even over another one.
   */
  overShapes: boolean;
};

/** Undo/redo stacks for every edit of the document or the spec. */
export type History = {
  past: Snapshot[];
  future: Snapshot[];
  /** Key of the last recorded edit, to merge bursts (a slider drag) into one step. */
  lastKey?: string;
  lastAt: number;
};

/** Preview-only state. Never part of the AnimationSpec, never exported. */
export type Playback = {
  playing: boolean;
  rate: number;
  background: Background;
  /** Bumped to restart the preview from t=0. */
  restartToken: number;
};

export type EditorState = {
  doc: SvgDocument | null;
  fileName: string | null;
  importWarnings: ImportWarning[];
  spec: AnimationSpec;
  selection: string[];
  selectionAnchor: string | null;
  hovered: string | null;
  /** Step of the selected layers' sequence being edited (UI only); the first one when null. */
  activeStepId: string | null;
  playback: Playback;
  exportTab: ExportTab;
  tool: CanvasTool;
  draw: DrawState;
  history: History;
  /** Bumped when a document is loaded (import, link, reset): the canvas view recenters. */
  loadToken: number;
};

export type EditorActions = {
  /** Throws `SvgImportError` when the markup cannot be used. */
  loadSvg: (markup: string, fileName: string) => void;
  /** Restores a shared link or project file. Throws `SvgImportError` for a bad SVG. */
  loadShared: (shared: SharedAnimation) => void;
  reset: () => void;
  select: (id: string, mode?: SelectMode) => void;
  /** Selects several layers at once (a group). "toggle" adds them, or removes them if all are in. */
  selectMany: (ids: string[], mode?: "replace" | "toggle") => void;
  selectAll: () => void;
  clearSelection: () => void;
  setHovered: (id: string | null) => void;
  applyPresetToSelection: (preset: PresetId) => void;
  /** Adds an animation after the ones the selected layers (or all) already have, and edits it. */
  addStepToSelection: (preset: PresetId) => void;
  removeStep: (trackId: string) => void;
  moveStep: (trackId: string, direction: -1 | 1) => void;
  selectStep: (trackId: string) => void;
  /** Swaps the preset of one step of a sequence, keeping its place. */
  replaceStepPreset: (trackId: string, preset: PresetId) => void;
  updateTiming: (trackId: string, patch: Partial<Timing>) => void;
  updateParams: (trackId: string, params: Record<string, unknown>) => void;
  setA11yLabel: (label: string) => void;
  setAutoStroke: (patch: Partial<AnimationSpec["global"]["autoStroke"]>) => void;
  /** Edits the given layers (defaults to the selection). */
  updateLayers: (patch: LayerPatch, ids?: string[]) => void;
  resetLayers: (ids?: string[]) => void;
  /** Sets where the stroke animation of a layer starts (0–1) and selects it. */
  setLayerStart: (id: string, start: number) => void;
  /** Replaces the SVG, keeping animations and edits of the elements that remain. Throws `SvgImportError`. */
  replaceSvg: (markup: string) => ReconcileResult;
  setTool: (tool: CanvasTool) => void;
  /**
   * Moves layers by (`dx`, `dy`) in viewBox units. The SVG itself is edited (their `transform`),
   * so the move is exported and shared like the drawing. `merge` folds repeated calls on the same
   * layers (arrow keys) into one undo step.
   */
  moveLayers: (ids: string[], dx: number, dy: number, merge?: boolean) => void;
  /** Puts the selected layers in a new group. Returns why it could not, `null` when it did. */
  groupSelection: () => GroupErrorCode | null;
  /** Dissolves the group the selection is made of. Returns why it could not, `null` when it did. */
  ungroupSelection: () => UngroupErrorCode | null;
  /**
   * Deletes layers (the selection by default) from the SVG; the ones left keep their animation
   * and edits. Returns whether anything went; `undo` brings it back.
   */
  deleteLayers: (ids?: string[]) => boolean;
  /** Enters draw mode (creating a blank SVG on the first shape when there is none). */
  enterDraw: () => void;
  exitDraw: () => void;
  setDrawTool: (tool: DrawTool) => void;
  /** Lets the next shape start on top of another one (see `DrawState.overShapes`). */
  setDrawOver: (overShapes: boolean) => void;
  setDrawStyle: (patch: Partial<Pick<DrawState, "width" | "color">>) => void;
  /** Adds shapes (path data in viewBox units) to the SVG, styled with the draw settings. */
  addDrawnShapes: (shapes: string[], untitledName: string) => void;
  undo: () => void;
  redo: () => void;
  togglePlaying: () => void;
  setRate: (rate: number) => void;
  setBackground: (background: Background) => void;
  restart: () => void;
  setExportTab: (tab: ExportTab) => void;
};

export function getInitialState(): EditorState {
  return {
    doc: null,
    fileName: null,
    importWarnings: [],
    spec: createEmptySpec(),
    selection: [],
    selectionAnchor: null,
    hovered: null,
    activeStepId: null,
    playback: {
      playing: true,
      rate: 1,
      background: "checker",
      restartToken: 0,
    },
    exportTab: "css",
    tool: "select",
    draw: initialDraw(),
    history: emptyHistory(),
    loadToken: 0,
  };
}

/** Readable on light, dark and checker backgrounds; exports still theme it through `--sk-stroke`. */
export const DEFAULT_DRAW_COLOR = "#3b82f6";

function initialDraw(): DrawState {
  return {
    active: false,
    tool: "pencil",
    width: 2,
    color: DEFAULT_DRAW_COLOR,
    overShapes: false,
  };
}

const HISTORY_LIMIT = 100;
/** Edits with the same key closer together than this (ms) share one undo step. */
const COALESCE_MS = 500;

function emptyHistory(): History {
  return { past: [], future: [], lastAt: 0 };
}

function snapshotOf(state: EditorState): Snapshot {
  const { doc, fileName, spec, selection } = state;
  return { doc, fileName, spec, selection };
}

/**
 * State after an edit that rewrote the SVG and the spec together (group, ungroup): a step in the
 * history, the new document, and `ids` selected. The caller has already remapped the spec to the
 * new ids, so this imports the markup as it is instead of reconciling.
 */
function restructured(
  state: EditorState,
  markup: string,
  spec: AnimationSpec,
  ids: string[],
): Partial<EditorState> {
  const { document, warnings } = importSvg(markup, { parser: new DOMParser() });
  return {
    ...hist(state),
    doc: document,
    importWarnings: warnings,
    spec,
    selection: ids,
    selectionAnchor: ids.at(-1) ?? null,
    hovered: null,
    activeStepId: null,
  };
}

/** The history after an edit that changes `state`; spread it into the `set` that makes the edit. */
function hist(state: EditorState, key?: string): { history: History } {
  const { history } = state;
  const now = Date.now();
  const merge =
    key !== undefined &&
    history.lastKey === key &&
    history.past.length > 0 &&
    now - history.lastAt < COALESCE_MS;
  if (merge) return { history: { ...history, future: [], lastAt: now } };
  return {
    history: {
      past: [...history.past, snapshotOf(state)].slice(-HISTORY_LIMIT),
      future: [],
      lastKey: key,
      lastAt: now,
    },
  };
}

export const useEditorStore = create<EditorState & EditorActions>()((set, get) => ({
  ...getInitialState(),

  loadSvg: (markup, fileName) => {
    const { document, warnings } = importSvg(markup, { parser: new DOMParser() });
    const ids = document.elements.map((element) => element.id);
    const base = createEmptySpec(fileName);
    base.global.a11y.label = fileName;
    // Fill-only logos need auto-stroke for stroke presets to show anything (RF4).
    base.global.autoStroke.enabled = document.elements.some((element) => !element.hasStroke);
    set((state) => ({
      doc: document,
      fileName,
      importWarnings: warnings,
      spec: applyPreset(base, ids, DEFAULT_PRESET),
      selection: [],
      selectionAnchor: null,
      hovered: null,
      activeStepId: null,
      tool: "select",
      history: emptyHistory(),
      loadToken: state.loadToken + 1,
      playback: { ...state.playback, playing: true, restartToken: state.playback.restartToken + 1 },
    }));
  },

  loadShared: (shared) => {
    const { document, warnings } = importSvg(shared.svg, { parser: new DOMParser() });
    set((state) => ({
      doc: document,
      fileName: shared.spec.name,
      importWarnings: warnings,
      spec: shared.spec,
      selection: [],
      selectionAnchor: null,
      hovered: null,
      activeStepId: null,
      tool: "select",
      history: emptyHistory(),
      loadToken: state.loadToken + 1,
      playback: { ...state.playback, playing: true, restartToken: state.playback.restartToken + 1 },
    }));
  },

  reset: () => set(getInitialState()),

  select: (id, mode = "replace") => {
    const { doc, selection, selectionAnchor } = get();
    if (!doc) return;
    if (mode === "toggle") {
      set({
        selection: selection.includes(id)
          ? selection.filter((item) => item !== id)
          : [...selection, id],
        selectionAnchor: id,
      });
      return;
    }
    if (mode === "range" && selectionAnchor) {
      const order = doc.elements.map((element) => element.id);
      const [from, to] = [order.indexOf(selectionAnchor), order.indexOf(id)].sort((a, b) => a - b);
      if (from !== undefined && to !== undefined && from >= 0) {
        set({ selection: order.slice(from, to + 1) });
        return;
      }
    }
    set({ selection: [id], selectionAnchor: id });
  },

  selectMany: (ids, mode = "replace") => {
    const { selection } = get();
    if (mode === "toggle") {
      const all = ids.every((id) => selection.includes(id));
      set({
        selection: all
          ? selection.filter((id) => !ids.includes(id))
          : [...selection, ...ids.filter((id) => !selection.includes(id))],
        selectionAnchor: ids[0] ?? null,
      });
      return;
    }
    set({ selection: [...ids], selectionAnchor: ids[0] ?? null });
  },

  selectAll: () => {
    const { doc } = get();
    set({ selection: doc ? doc.elements.map((element) => element.id) : [] });
  },

  clearSelection: () => set({ selection: [], selectionAnchor: null }),

  setHovered: (hovered) => set({ hovered }),

  applyPresetToSelection: (preset) => {
    const { doc, spec, selection } = get();
    if (!doc) return;
    const targets = selection.length > 0 ? selection : doc.elements.map((element) => element.id);
    set({ ...hist(get()), spec: applyPreset(spec, targets, preset), activeStepId: null });
  },

  addStepToSelection: (preset) => {
    const { doc, spec, selection } = get();
    if (!doc) return;
    const targets = selection.length > 0 ? selection : doc.elements.map((element) => element.id);
    const next = appendStep(spec, targets, preset);
    if (next === spec) return;
    const known = new Set(spec.tracks.map((track) => track.id));
    const added = next.tracks.filter((track) => !known.has(track.id)).at(-1);
    set({ ...hist(get()), spec: next, activeStepId: added?.id ?? null });
  },

  removeStep: (trackId) => {
    const { spec } = get();
    const next = removeStep(spec, trackId);
    if (next === spec) return;
    set({ ...hist(get()), spec: next, activeStepId: null });
  },

  moveStep: (trackId, direction) => {
    const { spec } = get();
    const track = spec.tracks.find((item) => item.id === trackId);
    const next = moveStep(spec, trackId, direction);
    if (next === spec || !track) return;
    // The animation moved to the neighbouring slot, so the edited step follows it.
    const slot =
      direction === -1 ? track.after : spec.tracks.find((item) => item.after === trackId)?.id;
    set({ ...hist(get()), spec: next, activeStepId: slot ?? trackId });
  },

  selectStep: (activeStepId) => set({ activeStepId }),

  replaceStepPreset: (trackId, preset) =>
    set({
      ...hist(get()),
      spec: setStepPreset(get().spec, trackId, preset),
      activeStepId: trackId,
    }),

  updateTiming: (trackId, patch) =>
    set({
      ...hist(get(), `timing:${trackId}:${Object.keys(patch).join(",")}`),
      spec: updateTrackTiming(get().spec, trackId, patch),
    }),

  updateParams: (trackId, params) =>
    set({
      ...hist(get(), `params:${trackId}:${Object.keys(params).join(",")}`),
      spec: updateTrackParams(get().spec, trackId, params),
    }),

  setA11yLabel: (label) => {
    const { spec } = get();
    set({
      ...hist(get(), "a11y-label"),
      spec: { ...spec, global: { ...spec.global, a11y: { ...spec.global.a11y, label } } },
    });
  },

  setAutoStroke: (patch) => {
    const { spec } = get();
    set({
      ...hist(get(), `auto-stroke:${Object.keys(patch).join(",")}`),
      spec: {
        ...spec,
        global: { ...spec.global, autoStroke: { ...spec.global.autoStroke, ...patch } },
      },
    });
  },

  updateLayers: (patch, ids) => {
    const { spec, selection } = get();
    const targets = ids ?? selection;
    if (targets.length === 0) return;
    set({
      ...hist(get(), `layers:${targets.join(",")}:${Object.keys(patch).join(",")}`),
      spec: updateLayers(spec, targets, patch),
    });
  },

  resetLayers: (ids) => {
    const { spec, selection } = get();
    set({ ...hist(get()), spec: resetLayers(spec, ids ?? selection) });
  },

  setLayerStart: (id, start) => {
    set({
      ...hist(get(), `layer-start:${id}`),
      spec: updateLayers(get().spec, [id], { start: start === 0 ? undefined : start }),
      selection: [id],
      selectionAnchor: id,
    });
  },

  replaceSvg: (markup) => {
    const { document, warnings } = importSvg(markup, { parser: new DOMParser() });
    const result = reconcileSpec(get().spec, document);
    const exists = new Set(document.elements.map((element) => element.id));
    set((state) => ({
      doc: document,
      importWarnings: warnings,
      spec: result.spec,
      selection: state.selection.filter((id) => exists.has(id)),
      hovered: null,
    }));
    return result;
  },

  setTool: (tool) => set({ tool }),

  moveLayers: (ids, dx, dy, merge = false) => {
    const { doc } = get();
    if (!doc || ids.length === 0 || (dx === 0 && dy === 0)) return;
    const markup = moveElements(doc, ids, dx, dy);
    // Taken before the edit; `replaceSvg` does not touch the history.
    const history = hist(get(), merge ? `move:${ids.join(",")}` : undefined);
    get().replaceSvg(markup);
    set(history);
  },

  groupSelection: () => {
    const { doc, spec, selection } = get();
    if (!doc) return "too-few";
    const result = groupLayers(doc, spec, selection);
    if (!result.ok) return result.code;
    set(restructured(get(), result.markup, result.spec, result.ids));
    return null;
  },

  ungroupSelection: () => {
    const { doc, spec, selection } = get();
    if (!doc) return "no-group";
    const result = ungroupLayers(doc, spec, selection);
    if (!result.ok) return result.code;
    set(restructured(get(), result.markup, result.spec, result.ids));
    return null;
  },

  deleteLayers: (ids) => {
    const { doc, spec, selection } = get();
    const targets = ids ?? selection;
    if (!doc || targets.length === 0) return false;
    const result = deleteLayersFromSvg(doc, spec, targets);
    if (result.removed === 0) return false;
    const history = hist(get());
    if (result.markup === null) {
      set({
        ...history,
        doc: null,
        fileName: null,
        importWarnings: [],
        spec: createEmptySpec(),
        selection: [],
        selectionAnchor: null,
        hovered: null,
        activeStepId: null,
        tool: "select",
      });
      return true;
    }
    const { document, warnings } = importSvg(result.markup, { parser: new DOMParser() });
    set({
      ...history,
      doc: document,
      importWarnings: warnings,
      spec: result.spec,
      selection: [],
      selectionAnchor: null,
      hovered: null,
      activeStepId: null,
      tool: "select",
    });
    return true;
  },

  enterDraw: () =>
    set((state) => ({
      tool: "select",
      selection: [],
      selectionAnchor: null,
      hovered: null,
      draw: { ...state.draw, active: true, overShapes: false },
    })),

  exitDraw: () =>
    set((state) => ({
      draw: { ...state.draw, active: false, overShapes: false },
      playback: { ...state.playback, restartToken: state.playback.restartToken + 1 },
    })),

  setDrawTool: (tool) => set((state) => ({ draw: { ...state.draw, tool, overShapes: false } })),

  setDrawOver: (overShapes) => set((state) => ({ draw: { ...state.draw, overShapes } })),

  setDrawStyle: (patch) => set((state) => ({ draw: { ...state.draw, ...patch } })),

  addDrawnShapes: (shapes, untitledName) => {
    const before = get();
    const { doc, draw } = before;
    const unit = visualUnit(doc?.viewBox ?? BLANK_VIEWBOX);
    // Shapes go on the root, where no transform scales them: visual units map straight to viewBox units.
    const width = toUserWidth(draw.width, unit, 1);
    const markup = appendDrawnPaths(
      doc?.root ?? null,
      shapes.map((d) => ({ d, stroke: draw.color, strokeWidth: width })),
    );
    // Taken before the edit; `loadSvg` below clears the history, so it is applied afterwards.
    const history = hist(before);
    if (doc) get().replaceSvg(markup);
    else {
      // The first shape creates the document, but must not recenter the canvas under the pen.
      get().loadSvg(markup, untitledName);
      set({ loadToken: before.loadToken });
    }
    const { doc: next } = get();
    if (!next) return;
    const added = next.elements.slice(-shapes.length).map((element) => element.id);
    set((state) => ({
      ...history,
      selection: added,
      selectionAnchor: added.at(-1) ?? null,
      draw: { ...state.draw, overShapes: false },
    }));
  },

  undo: () => {
    const state = get();
    const previous = state.history.past.at(-1);
    if (!previous) return;
    set({
      ...previous,
      hovered: null,
      activeStepId: null,
      history: {
        past: state.history.past.slice(0, -1),
        future: [...state.history.future, snapshotOf(state)],
        lastAt: 0,
      },
    });
  },

  redo: () => {
    const state = get();
    const next = state.history.future.at(-1);
    if (!next) return;
    set({
      ...next,
      hovered: null,
      activeStepId: null,
      history: {
        past: [...state.history.past, snapshotOf(state)].slice(-HISTORY_LIMIT),
        future: state.history.future.slice(0, -1),
        lastAt: 0,
      },
    });
  },

  togglePlaying: () =>
    set((state) => ({ playback: { ...state.playback, playing: !state.playback.playing } })),

  setRate: (rate) => set((state) => ({ playback: { ...state.playback, rate } })),

  setBackground: (background) => set((state) => ({ playback: { ...state.playback, background } })),

  restart: () =>
    set((state) => ({
      playback: { ...state.playback, playing: true, restartToken: state.playback.restartToken + 1 },
    })),

  setExportTab: (exportTab) => set({ exportTab }),
}));
