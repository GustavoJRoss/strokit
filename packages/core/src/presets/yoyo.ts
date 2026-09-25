import { z } from "zod";
import { round } from "../util/number";
import type { Preset } from "./types";

export const yoyoParamsSchema = z
  .object({
    length: z.number().min(0.02).max(0.9).meta({ label: "Comprimento do traço", step: 0.01 }),
  })
  .strict();

export type YoyoParams = z.infer<typeof yoyoParamsSchema>;

/**
 * A dash that runs to the end of the path and back. `dasharray: L 1` never repeats, so the
 * dash stays inside open paths instead of wrapping around (ARCHITECTURE §12).
 */
export const yoyoPreset: Preset<"yoyo", YoyoParams> = {
  id: "yoyo",
  label: "Vai e vem",
  description: "Um risco que vai e volta pelo contorno. Ideal para telas de carregamento.",
  paramsSchema: yoyoParamsSchema,
  defaults: {
    params: { length: 0.25 },
    timing: {
      duration: 1200,
      delay: 0,
      easing: "ease-in-out",
      iterations: "infinite",
      direction: "alternate",
    },
  },
  requiresStroke: true,
  autoStrokeFill: "ghost",
  compile: ({ params, timing }) => ({
    keyframes: [
      {
        name: "yoyo",
        stops: [
          { offset: 0, props: { "stroke-dashoffset": "0" } },
          { offset: 1, props: { "stroke-dashoffset": String(round(params.length - 1)) } },
        ],
      },
    ],
    rule: {
      attrs: { pathLength: "1" },
      props: { "stroke-dasharray": `${round(params.length)} 1` },
      animations: [{ ...timing, keyframes: "yoyo", fillMode: "both" }],
      reducedMotion: { "stroke-dasharray": "none" },
    },
  }),
};
