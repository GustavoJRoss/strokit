import { presets } from "../presets";
import type { Track } from "./schema";

type ChainTrack = Pick<Track, "id" | "targets" | "after" | "preset" | "timing">;

export type ChainIssue = { trackIndex: number; path: (string | number)[]; message: string };

/** Track ids from the track's predecessor back to the head of its chain (cycle-safe). */
export function ancestorIds(tracks: readonly ChainTrack[], track: ChainTrack): string[] {
  const byId = new Map(tracks.map((item) => [item.id, item]));
  const ids: string[] = [];
  let current = track.after === undefined ? undefined : byId.get(track.after);
  while (current && !ids.includes(current.id) && current.id !== track.id) {
    ids.push(current.id);
    current = current.after === undefined ? undefined : byId.get(current.after);
  }
  return ids;
}

function followsItself(tracks: readonly ChainTrack[], track: ChainTrack): boolean {
  const byId = new Map(tracks.map((item) => [item.id, item]));
  const seen = new Set<string>();
  let current: ChainTrack | undefined = track;
  while (current?.after !== undefined && !seen.has(current.id)) {
    seen.add(current.id);
    if (current.after === track.id) return true;
    current = byId.get(current.after);
  }
  return false;
}

/** Position of the track in its chain: 0 for a head, 1 for the next step, and so on. */
export function chainDepth(tracks: readonly ChainTrack[], track: ChainTrack): number {
  return ancestorIds(tracks, track).length;
}

/**
 * Tracks in playing order: chain heads first, then each next step. The order is stable, so
 * independent tracks keep their place in the spec.
 */
export function orderedTracks<T extends ChainTrack>(tracks: readonly T[]): T[] {
  return tracks
    .map((track, index) => ({ track, index, depth: chainDepth(tracks, track) }))
    .sort((a, b) => a.depth - b.depth || a.index - b.index)
    .map((item) => item.track);
}

export type TrackTime = { start: number; end: number };

/**
 * When each track plays (ms): `start` is the end of the track it follows (or 0) plus its own
 * `timing.delay`; `end` counts every iteration. Validation keeps infinite tracks out of the
 * middle of a chain, so an infinite `end` only matters for the last step.
 */
export function trackTimes(tracks: readonly ChainTrack[]): Map<string, TrackTime> {
  const byId = new Map(tracks.map((track) => [track.id, track]));
  const times = new Map<string, TrackTime>();
  const resolve = (track: ChainTrack, seen: ReadonlySet<string>): TrackTime => {
    const known = times.get(track.id);
    if (known) return known;
    const parent =
      track.after !== undefined && !seen.has(track.after) ? byId.get(track.after) : undefined;
    const base = parent ? resolve(parent, new Set([...seen, track.id])).end : 0;
    const start = base + track.timing.delay;
    const cycles = track.timing.iterations === "infinite" ? 1 : track.timing.iterations;
    const time = { start, end: start + track.timing.duration * cycles };
    times.set(track.id, time);
    return time;
  };
  for (const track of tracks) resolve(track, new Set());
  return times;
}

/**
 * Rules for tracks that share elements or follow each other:
 * - `after` names an existing track, without cycles, that is not infinite;
 * - an element may be in several tracks only when they form one chain;
 * - along a chain, at most one "stroke" preset (dash properties), and only as the first step.
 */
export function chainIssues(tracks: readonly ChainTrack[]): ChainIssue[] {
  const issues: ChainIssue[] = [];
  const byId = new Map(tracks.map((track) => [track.id, track]));
  const ancestors = tracks.map((track) => ancestorIds(tracks, track));

  tracks.forEach((track, trackIndex) => {
    if (track.after === undefined) return;
    const parent = byId.get(track.after);
    if (!parent) {
      issues.push({
        trackIndex,
        path: ["tracks", trackIndex, "after"],
        message: `Track "${track.id}" follows unknown track "${track.after}"`,
      });
    } else if (followsItself(tracks, track)) {
      issues.push({
        trackIndex,
        path: ["tracks", trackIndex, "after"],
        message: `Track "${track.id}" is part of a cycle`,
      });
    } else if (parent.timing.iterations === "infinite") {
      issues.push({
        trackIndex,
        path: ["tracks", trackIndex, "after"],
        message: `Track "${track.after}" never ends, so "${track.id}" cannot follow it`,
      });
    }
  });

  const owners = new Map<string, number[]>();
  tracks.forEach((track, trackIndex) => {
    for (const target of track.targets)
      owners.set(target, [...(owners.get(target) ?? []), trackIndex]);
  });
  for (const [element, indexes] of owners) {
    indexes.forEach((index, position) => {
      const track = tracks[index] as ChainTrack;
      const clash = indexes
        .slice(0, position)
        .find(
          (other) =>
            !ancestors[index]?.includes((tracks[other] as ChainTrack).id) &&
            !ancestors[other]?.includes(track.id),
        );
      if (clash !== undefined) {
        issues.push({
          trackIndex: index,
          path: ["tracks", index, "targets", track.targets.indexOf(element)],
          message: `Element "${element}" is already animated by track "${(tracks[clash] as ChainTrack).id}"`,
        });
      }
    });
    const chain = indexes
      .map((index) => tracks[index] as ChainTrack)
      .sort((a, b) => chainDepth(tracks, a) - chainDepth(tracks, b));
    chain.forEach((track, position) => {
      if (position > 0 && presets[track.preset].kind === "stroke") {
        issues.push({
          trackIndex: tracks.indexOf(track),
          path: ["tracks", tracks.indexOf(track), "preset"],
          message: `Outline preset "${track.preset}" must be the first step for element "${element}"`,
        });
      }
    });
  }
  return issues;
}
