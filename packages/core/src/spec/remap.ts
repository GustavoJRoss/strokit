import { pruneTracks } from "./defaults";
import type { AnimationSpec } from "./schema";

/**
 * Carries a spec over a renumbering of the elements (`old id → new id`), as happens when the
 * document order changes. Ids missing from the map are dropped, along with the tracks that
 * were left with no targets.
 */
export function remapSpec(
  spec: AnimationSpec,
  renumbered: ReadonlyMap<string, string>,
): AnimationSpec {
  const tracks = pruneTracks(
    spec.tracks.map((track) => ({
      ...track,
      targets: track.targets.flatMap((id) => renumbered.get(id) ?? []),
    })),
  );
  const { layers, ...rest } = spec;
  const kept = Object.entries(layers ?? {}).flatMap(([id, override]) => {
    const next = renumbered.get(id);
    return next === undefined ? [] : [[next, override] as const];
  });
  const next: AnimationSpec = { ...rest, tracks };
  if (kept.length > 0) next.layers = Object.fromEntries(kept);
  return next;
}
