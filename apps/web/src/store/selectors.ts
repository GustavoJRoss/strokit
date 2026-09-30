import {
  type AnimationSpec,
  type CompiledAnimation,
  chainOf,
  compile,
  exporters,
  type LayerNode,
  layerTree,
  type SvgDocument,
  type SvgElementNode,
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
const treeMemo = memoizeLast((root: SvgElementNode) => layerTree(root));
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

/**
 * Element whose sequence the panel shows: the first selected one, or, with no selection, any
 * animated element when they all play the same sequence.
 */
function referenceElement(spec: AnimationSpec, selection: string[]): string | undefined {
  const first = selection[0];
  if (first !== undefined) return first;
  const animated = [...new Set(spec.tracks.flatMap((track) => track.targets))];
  const key = (id: string) =>
    chainOf(spec, id)
      .map((track) => track.id)
      .join(">");
  const [head] = animated;
  return head !== undefined && animated.every((id) => key(id) === key(head)) ? head : undefined;
}

const NO_STEPS: Track[] = [];
const chainMemo = memoizeLast((spec: AnimationSpec, reference: string | undefined): Track[] => {
  const chain = reference === undefined ? NO_STEPS : chainOf(spec, reference);
  return chain.length === 0 ? NO_STEPS : chain;
});

/** Steps (animations played in sequence) of the selected layers, in playing order. */
export const selectChain = (state: EditorState): Track[] =>
  chainMemo(state.spec, referenceElement(state.spec, state.selection));

/** Step being edited: the chosen one, else the first of the sequence. */
export const selectActiveTrack = (state: EditorState): Track | null => {
  const chain = selectChain(state);
  return chain.find((track) => track.id === state.activeStepId) ?? chain[0] ?? null;
};

const NO_LAYERS: LayerNode[] = [];

/** Layers grouped by their `<g>` ancestors, for the layers panel. */
export const selectLayerTree = (state: EditorState): LayerNode[] =>
  state.doc ? treeMemo(state.doc.root) : NO_LAYERS;
