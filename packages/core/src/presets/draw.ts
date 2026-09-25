import { z } from "zod";
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
  compile: ({ timing }) => ({
    keyframes: [
      {
        name: "draw",
        stops: [
          { offset: 0, props: { "stroke-dashoffset": "1" } },
          { offset: 1, props: { "stroke-dashoffset": "0" } },
        ],
      },
    ],
    rule: {
      attrs: { pathLength: "1" },
      props: { "stroke-dasharray": "1 1" },
      animations: [{ ...timing, keyframes: "draw", fillMode: "both" }],
      reducedMotion: { "stroke-dashoffset": "0" },
    },
  }),
};
