import {
  type AnimationSpec,
  type CompiledAnimation,
  compile,
  exporters,
  findTrackForElement,
  type SvgDocument,
  type Track,
  toComponentName,
} from "@strokit/core";
import { memoizeLast } from "@/lib/memoize";
import type { EditorState } from "./editor-store";

/**
 * Derived data is never stored (ARCHITECTURE §8). Each selector memoizes on the identity of
 * its inputs, so every component shares one compile and one export per spec change.
 */
const compileMemo = memoizeLast((doc: SvgDocument, spec: AnimationSpec) => compile(doc, spec));
const cssMemo = memoizeLast((compiled: CompiledAnimation) => exporters.css(compiled));
const reactMemo = memoizeLast((compiled: CompiledAnimation, componentName: string) =>
  exporters.react(compiled, { componentName }),
);
const motionMemo = memoizeLast((compiled: CompiledAnimation, componentName: string) =>
  exporters.motion(compiled, { componentName }),
);
const previewMemo = memoizeLast((compiled: CompiledAnimation) =>
  exporters.css(compiled, { includeElementIds: true }),
);

export const selectCompiled = (state: EditorState): CompiledAnimation | null =>
  state.doc ? compileMemo(state.doc, state.spec) : null;

/** Exported code (CSS tab). */
export const selectCssExport = (state: EditorState): string | null => {
  const compiled = selectCompiled(state);
  return compiled ? cssMemo(compiled) : null;
};

export const selectComponentName = (state: EditorState): string => toComponentName(state.spec.name);

/** Code for the active export tab. */
export const selectExportCode = (state: EditorState): string | null => {
  const compiled = selectCompiled(state);
  if (!compiled) return null;
  if (state.exportTab === "react") return reactMemo(compiled, selectComponentName(state));
  if (state.exportTab === "motion") return motionMemo(compiled, selectComponentName(state));
  return cssMemo(compiled);
};

/** What the preview renders: the same CSS, plus `data-sk-id` for hover and selection. */
export const selectPreviewMarkup = (state: EditorState): string | null => {
  const compiled = selectCompiled(state);
  return compiled ? previewMemo(compiled) : null;
};

/** Track being edited: the one animating the first selected element, or the only track. */
export const selectActiveTrack = (state: EditorState): Track | null => {
  const first = state.selection[0];
  if (first !== undefined) return findTrackForElement(state.spec, first) ?? null;
  return state.spec.tracks.length === 1 ? (state.spec.tracks[0] ?? null) : null;
};
