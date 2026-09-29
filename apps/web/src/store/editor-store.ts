import {
  type AnimationSpec,
  applyPreset,
  createEmptySpec,
  DEFAULT_PRESET,
  type ImportWarning,
  importSvg,
  type LayerPatch,
  type PresetId,
  type ReconcileResult,
  reconcileSpec,
  resetLayers,
  type SharedAnimation,
  type SvgDocument,
  type Timing,
  updateLayers,
  updateTrackParams,
  updateTrackTiming,
} from "@strokit/core";
import { create } from "zustand";

export type Background = "light" | "dark" | "checker";
export type ExportTab = "css" | "react" | "motion";
export type SelectMode = "replace" | "toggle" | "range";
/** What a click on the canvas does: select layers, or set the start point of a layer. */
export type CanvasTool = "select" | "start";

/** Preview-only state. Never part of the AnimationSpec, never exported. */
export type Playback = {
  playing: boolean;
  rate: number;
  reducedMotion: boolean;
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
  playback: Playback;
  exportTab: ExportTab;
  tool: CanvasTool;
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
  togglePlaying: () => void;
  setRate: (rate: number) => void;
  setReducedMotion: (reducedMotion: boolean) => void;
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
    playback: {
      playing: true,
      rate: 1,
      reducedMotion: false,
      background: "checker",
      restartToken: 0,
    },
    exportTab: "css",
    tool: "select",
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
      tool: "select",
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
      tool: "select",
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
    set({ spec: applyPreset(spec, targets, preset) });
  },

  updateTiming: (trackId, patch) => set({ spec: updateTrackTiming(get().spec, trackId, patch) }),

  updateParams: (trackId, params) => set({ spec: updateTrackParams(get().spec, trackId, params) }),

  setA11yLabel: (label) => {
    const { spec } = get();
    set({ spec: { ...spec, global: { ...spec.global, a11y: { ...spec.global.a11y, label } } } });
  },

  setAutoStroke: (patch) => {
    const { spec } = get();
    set({
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
    set({ spec: updateLayers(spec, targets, patch) });
  },

  resetLayers: (ids) => {
    const { spec, selection } = get();
    set({ spec: resetLayers(spec, ids ?? selection) });
  },

  setLayerStart: (id, start) => {
    set({
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
      playback: { ...state.playback, restartToken: state.playback.restartToken + 1 },
    }));
    return result;
  },

  setTool: (tool) => set({ tool }),

  togglePlaying: () =>
    set((state) => ({ playback: { ...state.playback, playing: !state.playback.playing } })),

  setRate: (rate) => set((state) => ({ playback: { ...state.playback, rate } })),

  setReducedMotion: (reducedMotion) =>
    set((state) => ({ playback: { ...state.playback, reducedMotion } })),

  setBackground: (background) => set((state) => ({ playback: { ...state.playback, background } })),

  restart: () =>
    set((state) => ({
      playback: { ...state.playback, playing: true, restartToken: state.playback.restartToken + 1 },
    })),

  setExportTab: (exportTab) => set({ exportTab }),
}));
