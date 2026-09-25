import type { PresetId, Track } from "../spec/schema";
import { cometPreset } from "./comet";
import { drawPreset } from "./draw";
import { drawFillPreset } from "./draw-fill";
import { marchPreset } from "./march";
import { pulsePreset } from "./pulse";
import { staggerDrawPreset } from "./stagger-draw";
import type { Preset } from "./types";
import { yoyoPreset } from "./yoyo";

export type TrackOf<K extends PresetId> = Extract<Track, { preset: K }>;

export type PresetRegistry = { [K in PresetId]: Preset<K, TrackOf<K>["params"]> };

/** Insertion order is the order shown in the editor. */
export const presets: PresetRegistry = {
  draw: drawPreset,
  "draw-fill": drawFillPreset,
  "stagger-draw": staggerDrawPreset,
  comet: cometPreset,
  yoyo: yoyoPreset,
  march: marchPreset,
  pulse: pulsePreset,
};

export const presetIds = Object.keys(presets) as PresetId[];

export function getPreset<K extends PresetId>(id: K): PresetRegistry[K] {
  return presets[id];
}
