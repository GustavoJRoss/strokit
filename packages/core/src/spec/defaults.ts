import { getPreset } from "../presets";
import { chainIssues, orderedTracks } from "./chain";
import type { AnimationSpec, PresetId, Track } from "./schema";
import type { Timing } from "./timing";

/** Preset given to layers that have none (fresh import, layers added by a re-import). */
export const DEFAULT_PRESET: PresetId = "draw-fill";

export function createEmptySpec(name = "Minha animação"): AnimationSpec {
  return {
    version: 2,
    name,
    global: {
      autoStroke: { enabled: false, width: 2 },
      a11y: { label: "Logo", mode: "img" },
      strokeUnit: "visual",
    },
    tracks: [],
  };
}

function nextTrackId(spec: AnimationSpec): string {
  const used = spec.tracks
    .map((track) => /^track-(\d+)$/.exec(track.id)?.[1])
    .filter((value): value is string => value !== undefined)
    .map(Number);
  return `track-${used.length === 0 ? 0 : Math.max(...used) + 1}`;
}

export function createTrack(id: string, preset: PresetId, targets: string[]): Track {
  const definition = getPreset(preset);
  // Params come from the same preset as `preset`, but TS cannot correlate the two through
  // the union, so the pairing is asserted here, in one place.
  return {
    id,
    preset,
    targets: [...targets],
    params: structuredCloneParams(definition.defaults.params),
    timing: { ...definition.defaults.timing },
  } as Track;
}

function structuredCloneParams<P>(params: P): P {
  return JSON.parse(JSON.stringify(params)) as P;
}

/**
 * Drops tracks left without targets. Tracks that followed a dropped one now follow whatever it
 * followed, so a chain never points at a track that is gone.
 */
export function pruneTracks(tracks: Track[]): Track[] {
  const kept = tracks.filter((track) => track.targets.length > 0);
  const keptIds = new Set(kept.map((track) => track.id));
  const byId = new Map(tracks.map((track) => [track.id, track]));
  return kept.map((track) => {
    let after = track.after;
    const seen = new Set<string>();
    while (after !== undefined && !keptIds.has(after) && !seen.has(after)) {
      seen.add(after);
      after = byId.get(after)?.after;
    }
    if (after === track.after) return track;
    const { after: _dropped, ...rest } = track;
    return (after === undefined ? rest : { ...rest, after }) as Track;
  });
}

/**
 * Applies a preset to the given elements, replacing whatever animated them (the whole chain).
 * The targets leave their current tracks first and tracks left empty are removed.
 */
export function applyPreset(
  spec: AnimationSpec,
  targets: string[],
  preset: PresetId,
): AnimationSpec {
  const unique = [...new Set(targets)];
  if (unique.length === 0) return spec;
  const remaining = pruneTracks(
    spec.tracks.map((track) => ({
      ...track,
      targets: track.targets.filter((id) => !unique.includes(id)),
    })),
  );
  const track = createTrack(nextTrackId(spec), preset, unique);
  return { ...spec, tracks: [...remaining, track] };
}

/** Steps that animate the element, in playing order (a chain; a single track when not chained). */
export function chainOf(spec: AnimationSpec, elementId: string): Track[] {
  return orderedTracks(spec.tracks.filter((track) => track.targets.includes(elementId)));
}

/**
 * Adds an animation that plays after the ones the elements already have. Elements whose chains
 * end in different tracks get one new step per end, so every step keeps a single chain. The step
 * it follows can no longer loop forever and becomes a single iteration. Outline presets only
 * start a chain: for elements that already have steps the spec is returned unchanged.
 */
export function appendStep(
  spec: AnimationSpec,
  targets: string[],
  preset: PresetId,
): AnimationSpec {
  const unique = [...new Set(targets)];
  if (unique.length === 0) return spec;
  const tails = new Map<string | undefined, string[]>();
  for (const id of unique) {
    const tail = chainOf(spec, id).at(-1)?.id;
    tails.set(tail, [...(tails.get(tail) ?? []), id]);
  }
  if (getPreset(preset).kind === "stroke" && [...tails.keys()].some((tail) => tail !== undefined)) {
    return spec;
  }
  let next = spec;
  for (const [tail, ids] of tails) {
    const step = createTrack(nextTrackId(next), preset, ids);
    const tracks = next.tracks.map((track) =>
      track.id === tail && track.timing.iterations === "infinite"
        ? { ...track, timing: { ...track.timing, iterations: 1 } }
        : track,
    );
    next = { ...next, tracks: [...tracks, tail === undefined ? step : { ...step, after: tail }] };
  }
  return next;
}

/**
 * Swaps the animation of one step for another preset (its defaults), keeping its place, targets
 * and link in the chain. A step that others follow cannot loop forever. Unchanged when the
 * result would be invalid (an outline preset in the middle of a chain).
 */
export function setStepPreset(
  spec: AnimationSpec,
  trackId: string,
  preset: PresetId,
): AnimationSpec {
  const current = spec.tracks.find((track) => track.id === trackId);
  if (!current) return spec;
  const fresh = createTrack(current.id, preset, current.targets);
  const followed = spec.tracks.some((track) => track.after === trackId);
  const replacement: Track = {
    ...fresh,
    ...(current.after === undefined ? {} : { after: current.after }),
    timing:
      followed && fresh.timing.iterations === "infinite"
        ? { ...fresh.timing, iterations: 1 }
        : fresh.timing,
  };
  const tracks = spec.tracks.map((track) => (track.id === trackId ? replacement : track));
  return chainIssues(tracks).length > 0 ? spec : { ...spec, tracks };
}

/** Removes one step; the steps that followed it now follow what it followed. */
export function removeStep(spec: AnimationSpec, trackId: string): AnimationSpec {
  return {
    ...spec,
    tracks: pruneTracks(
      spec.tracks.map((track) => (track.id === trackId ? { ...track, targets: [] } : track)),
    ),
  };
}

/**
 * Swaps a step with the previous (`-1`) or next (`1`) one of its chain: their animations trade
 * places while the timeline slots stay. Unchanged when there is no such step or the result
 * would be invalid (an outline preset that is no longer first, a looping step in the middle).
 */
export function moveStep(spec: AnimationSpec, trackId: string, direction: -1 | 1): AnimationSpec {
  const track = spec.tracks.find((item) => item.id === trackId);
  if (!track) return spec;
  const neighbor =
    direction === -1
      ? spec.tracks.find((item) => item.id === track.after)
      : spec.tracks.find((item) => item.after === trackId);
  if (!neighbor) return spec;
  const swap = (from: Track, to: Track): Track =>
    ({ ...from, preset: to.preset, params: to.params, timing: to.timing }) as Track;
  const tracks = spec.tracks.map((item) => {
    if (item.id === track.id) return swap(item, neighbor);
    if (item.id === neighbor.id) return swap(item, track);
    return item;
  });
  return chainIssues(tracks).length > 0 ? spec : { ...spec, tracks };
}

export function findTrackForElement(spec: AnimationSpec, elementId: string): Track | undefined {
  return spec.tracks.find((track) => track.targets.includes(elementId));
}

export function updateTrackTiming(
  spec: AnimationSpec,
  trackId: string,
  patch: Partial<Timing>,
): AnimationSpec {
  return {
    ...spec,
    tracks: spec.tracks.map((track) =>
      track.id === trackId ? { ...track, timing: { ...track.timing, ...patch } } : track,
    ),
  };
}

export function updateTrackParams(
  spec: AnimationSpec,
  trackId: string,
  params: Record<string, unknown>,
): AnimationSpec {
  return {
    ...spec,
    tracks: spec.tracks.map((track) =>
      track.id === trackId
        ? ({ ...track, params: { ...track.params, ...params } } as Track)
        : track,
    ),
  };
}
