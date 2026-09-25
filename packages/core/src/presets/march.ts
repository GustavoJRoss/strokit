import { z } from "zod";
import { round } from "../util/number";
import type { Preset } from "./types";

export const marchParamsSchema = z
  .object({
    dash: z.number().min(0.005).max(0.2).meta({ label: "Traço", step: 0.005 }),
    gap: z.number().min(0.005).max(0.2).meta({ label: "Espaço", step: 0.005 }),
  })
  .strict();

export type MarchParams = z.infer<typeof marchParamsSchema>;

/**
 * Marching ants. The pattern is rescaled so a whole number of dashes fits the (normalized)
 * length, which keeps the seam invisible on closed shapes; the offset moves one pattern per cycle.
 */
export function fitPattern(dash: number, gap: number): { dash: number; gap: number } {
  const count = Math.max(1, Math.round(1 / (dash + gap)));
  const unit = 1 / count;
  const fittedDash = round((unit * dash) / (dash + gap));
  return { dash: fittedDash, gap: round(unit - fittedDash) };
}

export const marchPreset: Preset<"march", MarchParams> = {
  id: "march",
  label: "Formigas marchando",
  description: "Tracejado curto que anda sem parar pelo contorno.",
  paramsSchema: marchParamsSchema,
  defaults: {
    params: { dash: 0.04, gap: 0.03 },
    timing: {
      duration: 800,
      delay: 0,
      easing: "linear",
      iterations: "infinite",
      direction: "normal",
    },
  },
  requiresStroke: true,
  compile: ({ params, timing }) => {
    const pattern = fitPattern(params.dash, params.gap);
    return {
      keyframes: [
        {
          name: "march",
          stops: [
            { offset: 0, props: { "stroke-dashoffset": "0" } },
            {
              offset: 1,
              props: { "stroke-dashoffset": String(round(-(pattern.dash + pattern.gap))) },
            },
          ],
        },
      ],
      rule: {
        attrs: { pathLength: "1" },
        props: { "stroke-dasharray": `${pattern.dash} ${pattern.gap}` },
        animations: [{ ...timing, keyframes: "march", fillMode: "both" }],
        reducedMotion: {},
      },
    };
  },
};
