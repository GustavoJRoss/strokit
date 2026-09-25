import { z } from "zod";

export const easingPresetSchema = z.enum(["linear", "ease", "ease-in", "ease-out", "ease-in-out"]);

export const cubicBezierSchema = z.object({
  cubicBezier: z.tuple([
    z.number().min(0).max(1),
    z.number(),
    z.number().min(0).max(1),
    z.number(),
  ]),
});

export const easingSchema = z.union([easingPresetSchema, cubicBezierSchema]);

export const timingSchema = z.object({
  /** ms */
  duration: z.number().int().min(50).max(60_000),
  /** ms */
  delay: z.number().int().min(0).max(60_000),
  easing: easingSchema,
  iterations: z.union([z.number().positive().max(1000), z.literal("infinite")]),
  direction: z.enum(["normal", "reverse", "alternate", "alternate-reverse"]),
});

export type EasingPreset = z.infer<typeof easingPresetSchema>;
export type Easing = z.infer<typeof easingSchema>;
export type Timing = z.infer<typeof timingSchema>;
