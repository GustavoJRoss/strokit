import { z } from "zod";
import { round } from "../util/number";
import type { Preset } from "./types";

export const cometParamsSchema = z
  .object({
    length: z.number().min(0.02).max(0.9).meta({ label: "Comprimento do traço", step: 0.01 }),
  })
  .strict();

export type CometParams = z.infer<typeof cometParamsSchema>;

/** `dasharray: L (1-L)` + `dashoffset: 1 → 0`: a short dash loops seamlessly around the shape. */
export const cometPreset: Preset<"comet", CometParams> = {
  id: "comet",
  label: "Cometa",
  description: "Um traço curto percorre o contorno em loop.",
  paramsSchema: cometParamsSchema,
  defaults: {
    params: { length: 0.2 },
    timing: {
      duration: 1600,
      delay: 0,
      easing: "linear",
      iterations: "infinite",
      direction: "normal",
    },
  },
  requiresStroke: true,
  compile: ({ params, timing }) => ({
    keyframes: [
      {
        name: "comet",
        stops: [
          { offset: 0, props: { "stroke-dashoffset": "1" } },
          { offset: 1, props: { "stroke-dashoffset": "0" } },
        ],
      },
    ],
    rule: {
      attrs: { pathLength: "1" },
      props: { "stroke-dasharray": `${round(params.length)} ${round(1 - params.length)}` },
      animations: [{ ...timing, keyframes: "comet", fillMode: "both" }],
      reducedMotion: { "stroke-dasharray": "none" },
    },
  }),
};
