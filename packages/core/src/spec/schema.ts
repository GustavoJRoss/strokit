import { z } from "zod";
import { drawParamsSchema } from "../presets/draw";
import { timingSchema } from "./timing";

const trackBase = z.object({
  id: z.string().min(1),
  /** DrawableElement ids. */
  targets: z.array(z.string().min(1)),
  timing: timingSchema,
});

export const trackSchema = z.discriminatedUnion("preset", [
  trackBase.extend({ preset: z.literal("draw"), params: drawParamsSchema }),
]);

export const animationSpecSchema = z
  .object({
    version: z.literal(1),
    name: z.string().max(120),
    global: z.object({
      playbackRate: z.number().min(0.25).max(2),
      background: z.enum(["light", "dark", "checker"]),
      /** SPEC RF4 */
      autoStroke: z.object({ enabled: z.boolean(), width: z.number().positive().max(100) }),
      a11y: z.object({ label: z.string().max(200), mode: z.enum(["img", "status"]) }),
    }),
    tracks: z.array(trackSchema),
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
