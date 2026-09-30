import { z } from "zod";
import { round } from "../util/number";
import { hasStart, travel } from "./path-motion";
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
  kind: "stroke",
  requiresStroke: true,
  autoStrokeFill: "ghost",
  compile: ({ params, timing, path }) => {
    const offset = travel(0, params.length - 1, path);
    // From another start point the dash has to wrap around the shape to come back to it.
    const gap = hasStart(path) ? round(1 - params.length) : 1;
    return {
      keyframes: [
        {
          name: "yoyo",
          stops: [
            { offset: 0, props: { "stroke-dashoffset": offset.from } },
            { offset: 1, props: { "stroke-dashoffset": offset.to } },
          ],
        },
      ],
      rule: {
        attrs: { pathLength: "1" },
        props: { "stroke-dasharray": `${round(params.length)} ${gap}` },
        animations: [{ ...timing, keyframes: "yoyo", fillMode: "both" }],
        reducedMotion: { "stroke-dasharray": "none" },
      },
    };
  },
};
