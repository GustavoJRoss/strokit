import type { PresetId, Track } from "../spec/schema";
import { drawPreset } from "./draw";
import type { Preset } from "./types";

export type TrackOf<K extends PresetId> = Extract<Track, { preset: K }>;

export type PresetRegistry = { [K in PresetId]: Preset<K, TrackOf<K>["params"]> };

export const presets: PresetRegistry = {
  draw: drawPreset,
};

export const presetIds = Object.keys(presets) as PresetId[];

export function getPreset<K extends PresetId>(id: K): PresetRegistry[K] {
  return presets[id];
}
