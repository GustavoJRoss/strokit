import { z } from "zod";
import { cometParamsSchema } from "../presets/comet";
import { drawFillParamsSchema } from "../presets/draw-fill";
import { marchParamsSchema } from "../presets/march";
import { pulseParamsSchema } from "../presets/pulse";
import { yoyoParamsSchema } from "../presets/yoyo";
import { layerOverrideSchema } from "./layers";
import { timingSchema } from "./timing";

const trackBase = z.object({
  id: z.string().min(1),
  /** DrawableElement ids. */
  targets: z.array(z.string().min(1)),
  timing: timingSchema,
});

export const trackSchema = z.discriminatedUnion("preset", [
  trackBase.extend({ preset: z.literal("draw-fill"), params: drawFillParamsSchema }),
  trackBase.extend({ preset: z.literal("comet"), params: cometParamsSchema }),
  trackBase.extend({ preset: z.literal("yoyo"), params: yoyoParamsSchema }),
  trackBase.extend({ preset: z.literal("march"), params: marchParamsSchema }),
  trackBase.extend({ preset: z.literal("pulse"), params: pulseParamsSchema }),
]);

export const animationSpecSchema = z
  .object({
    version: z.literal(1),
    name: z.string().max(120),
    global: z.object({
      /** SPEC RF4 */
      autoStroke: z.object({ enabled: z.boolean(), width: z.number().positive().max(100) }),
      a11y: z.object({ label: z.string().max(200), mode: z.enum(["img", "status"]) }),
    }),
    tracks: z.array(trackSchema),
    /** Per-layer edits by element id. Absent when there are none (keeps old specs identical). */
    layers: z.record(z.string().min(1), layerOverrideSchema).optional(),
  })
  .superRefine((spec, ctx) => {
    const trackIds = new Set<string>();
    const owners = new Map<string, string>();
    spec.tracks.forEach((track, trackIndex) => {
      if (trackIds.has(track.id)) {
        ctx.addIssue({
          code: "custom",
          message: `Duplicate track id "${track.id}"`,
          path: ["tracks", trackIndex, "id"],
        });
      }
      trackIds.add(track.id);
      track.targets.forEach((target, targetIndex) => {
        const owner = owners.get(target);
        if (owner !== undefined) {
          ctx.addIssue({
            code: "custom",
            message: `Element "${target}" is already animated by track "${owner}"`,
            path: ["tracks", trackIndex, "targets", targetIndex],
          });
        }
        owners.set(target, track.id);
      });
    });
  });

export type Track = z.infer<typeof trackSchema>;
export type PresetId = Track["preset"];
export type AnimationSpec = z.infer<typeof animationSpecSchema>;
