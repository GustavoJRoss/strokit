import type { PresetId, Track } from "../spec/schema";
import { cometPreset } from "./comet";
import { drawFillPreset } from "./draw-fill";
import { fadePreset } from "./fade";
import { marchPreset } from "./march";
import { pulsePreset } from "./pulse";
import { shinePreset } from "./shine";
import { spinPreset } from "./spin";
import type { Preset } from "./types";
import { yoyoPreset } from "./yoyo";

export type TrackOf<K extends PresetId> = Extract<Track, { preset: K }>;

export type PresetRegistry = { [K in PresetId]: Preset<K, TrackOf<K>["params"]> };

/** Insertion order is the order shown in the editor. */
export const presets: PresetRegistry = {
  "draw-fill": drawFillPreset,
  comet: cometPreset,
  yoyo: yoyoPreset,
  march: marchPreset,
  pulse: pulsePreset,
  fade: fadePreset,
  spin: spinPreset,
  shine: shinePreset,
};

export const presetIds = Object.keys(presets) as PresetId[];

export function getPreset<K extends PresetId>(id: K): PresetRegistry[K] {
  return presets[id];
}
