import { getPreset } from "../presets";
import type { AnimationSpec, PresetId, Track } from "./schema";
import type { Timing } from "./timing";

/** Preset given to layers that have none (fresh import, layers added by a re-import). */
export const DEFAULT_PRESET: PresetId = "draw-fill";

export function createEmptySpec(name = "Minha animação"): AnimationSpec {
  return {
    version: 1,
    name,
    global: {
      autoStroke: { enabled: false, width: 2 },
      a11y: { label: "Logo", mode: "img" },
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
 * Applies a preset to the given elements. An element belongs to at most one track, so the
 * targets leave their current tracks first and tracks left empty are removed.
 */
export function applyPreset(
  spec: AnimationSpec,
  targets: string[],
  preset: PresetId,
): AnimationSpec {
  const unique = [...new Set(targets)];
  if (unique.length === 0) return spec;
  const remaining = spec.tracks
    .map((track) => ({ ...track, targets: track.targets.filter((id) => !unique.includes(id)) }))
    .filter((track) => track.targets.length > 0);
  const track = createTrack(nextTrackId(spec), preset, unique);
  return { ...spec, tracks: [...remaining, track] };
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
