import { z } from "zod";
import { reveal } from "./path-motion";
import type { Preset } from "./types";

export const drawParamsSchema = z.object({}).strict();

export type DrawParams = z.infer<typeof drawParamsSchema>;

/** `pathLength="1"` + `dasharray: 1 1`, `dashoffset: 1 → 0` (ARCHITECTURE §6). */
export const drawPreset: Preset<"draw", DrawParams> = {
  id: "draw",
  label: "Desenhar",
  description: "A logo se desenha do início ao fim.",
  paramsSchema: drawParamsSchema,
  defaults: {
    params: {},
    timing: { duration: 1500, delay: 0, easing: "ease-in-out", iterations: 1, direction: "normal" },
  },
  requiresStroke: true,
  compile: ({ timing, path }) => {
    const stroke = reveal(path);
    return {
      keyframes: [
        {
          name: "draw",
          stops: [
            { offset: 0, props: stroke.from },
            { offset: 1, props: stroke.to },
          ],
        },
      ],
      rule: {
        attrs: { pathLength: "1" },
        props: stroke.props,
        animations: [{ ...timing, keyframes: "draw", fillMode: "both" }],
        reducedMotion: stroke.reducedMotion,
      },
    };
  },
};
