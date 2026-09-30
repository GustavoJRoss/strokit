import type { SvgDocument } from "../svg/types";
import { applyPreset, DEFAULT_PRESET, pruneTracks } from "./defaults";
import { pickLayers } from "./layers";
import type { AnimationSpec } from "./schema";

export type ReconcileResult = {
  spec: AnimationSpec;
  /** Elements that kept their animation and edits. */
  kept: string[];
  /** New elements; they get `draw`, like on import. */
  added: string[];
  /** Ids that were animated or edited and no longer exist. */
  removed: string[];
};

/**
 * Carries a spec over to an edited version of its SVG. Element ids follow document order, so
 * tracks and layer edits stay on the elements that keep their position.
 */
export function reconcileSpec(spec: AnimationSpec, document: SvgDocument): ReconcileResult {
  const ids = document.elements.map((element) => element.id);
  const exists = new Set(ids);
  const known = new Set([
    ...spec.tracks.flatMap((track) => track.targets),
    ...Object.keys(spec.layers ?? {}),
  ]);

  const tracks = pruneTracks(
    spec.tracks.map((track) => ({
      ...track,
      targets: track.targets.filter((id) => exists.has(id)),
    })),
  );
  const animated = new Set(tracks.flatMap((track) => track.targets));
  const added = ids.filter((id) => !animated.has(id));

  let next = pickLayers({ ...spec, tracks }, exists);
  if (added.length > 0) {
    next = applyPreset(next, added, DEFAULT_PRESET);
    const needsStroke = document.elements.some(
      (element) => added.includes(element.id) && !element.hasStroke,
    );
    if (needsStroke && !next.global.autoStroke.enabled) {
      next = {
        ...next,
        global: { ...next.global, autoStroke: { ...next.global.autoStroke, enabled: true } },
      };
    }
  }
  return {
    spec: next,
    kept: ids.filter((id) => known.has(id)),
    added: added.filter((id) => !known.has(id)),
    removed: [...known].filter((id) => !exists.has(id)),
  };
}
