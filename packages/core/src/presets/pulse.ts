import { z } from "zod";
import { round } from "../util/number";
import type { Preset } from "./types";

export const pulseParamsSchema = z
  .object({
    scale: z.number().min(1).max(1.5).meta({ label: "Escala máxima", step: 0.01 }),
    minOpacity: z.number().min(0).max(1).meta({ label: "Opacidade mínima", step: 0.05 }),
  })
  .strict();

export type PulseParams = z.infer<typeof pulseParamsSchema>;

/**
 * Soft waiting state: opacity and scale around each element's own center
 * (`transform-box: fill-box`). `compile()` moves any SVG `transform` to a wrapper `<g>`.
 */
export const pulsePreset: Preset<"pulse", PulseParams> = {
  id: "pulse",
  label: "Pulsar",
  description: "Estado de espera: opacidade e escala suaves.",
  paramsSchema: pulseParamsSchema,
  defaults: {
    params: { scale: 1.06, minOpacity: 0.5 },
    timing: {
      duration: 1400,
      delay: 0,
      easing: "ease-in-out",
      iterations: "infinite",
      direction: "normal",
    },
  },
  kind: "layer",
  requiresStroke: false,
  compile: ({ params, timing }) => ({
    keyframes: [
      {
        name: "pulse",
        stops: [
          { offset: 0, props: { opacity: "1", transform: "scale(1)" } },
          {
            offset: 0.5,
            props: {
              opacity: String(round(params.minOpacity)),
              transform: `scale(${round(params.scale)})`,
            },
          },
          { offset: 1, props: { opacity: "1", transform: "scale(1)" } },
        ],
      },
    ],
    rule: {
      props: { "transform-box": "fill-box", "transform-origin": "center" },
      animations: [{ ...timing, keyframes: "pulse", fillMode: "both" }],
      reducedMotion: { opacity: "1", transform: "none" },
    },
  }),
};
