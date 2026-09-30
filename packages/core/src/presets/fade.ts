import { z } from "zod";
import { round } from "../util/number";
import type { Preset } from "./types";

export const fadeDirections = ["up", "down", "left", "right", "none"] as const;

export const fadeParamsSchema = z
  .object({
    direction: z.enum(fadeDirections).meta({
      label: "Direção",
      options: {
        up: "Para cima",
        down: "Para baixo",
        left: "Para a esquerda",
        right: "Para a direita",
        none: "Sem deslocamento",
      },
    }),
    distance: z.number().min(0).max(30).meta({ label: "Distância", step: 1, unit: "%" }),
  })
  .strict();

export type FadeParams = z.infer<typeof fadeParamsSchema>;

/** Unit vector of the start offset: the piece starts on the opposite side of where it moves. */
const START_SIDE = {
  up: [0, 1],
  down: [0, -1],
  left: [1, 0],
  right: [-1, 0],
  none: [0, 0],
} as const;

/**
 * Fades the whole piece in (no outline) while sliding it in `direction`. The distance is a
 * percentage of the viewBox, so every element travels the same amount whatever its own size.
 * `compile()` moves any SVG `transform`/`opacity` to a wrapper `<g>`.
 */
export const fadePreset: Preset<"fade", FadeParams> = {
  id: "fade",
  label: "Aparecer",
  description: "A peça inteira aparece com fade, deslizando na direção escolhida.",
  paramsSchema: fadeParamsSchema,
  defaults: {
    params: { direction: "up", distance: 8 },
    timing: { duration: 900, delay: 0, easing: "ease-out", iterations: 1, direction: "normal" },
  },
  kind: "layer",
  requiresStroke: false,
  compile: ({ params, timing, viewBox }) => {
    const [, , width, height] = viewBox ?? [0, 0, 100, 100];
    const [sx, sy] = START_SIDE[params.direction];
    const dx = round(sx * (params.distance / 100) * width);
    const dy = round(sy * (params.distance / 100) * height);
    return {
      keyframes: [
        {
          name: "fade",
          stops: [
            { offset: 0, props: { opacity: "0", transform: `translate(${dx}px, ${dy}px)` } },
            { offset: 1, props: { opacity: "1", transform: "translate(0px, 0px)" } },
          ],
        },
      ],
      rule: {
        props: {},
        animations: [{ ...timing, keyframes: "fade", fillMode: "both" }],
        reducedMotion: { opacity: "1", transform: "none" },
      },
    };
  },
};
