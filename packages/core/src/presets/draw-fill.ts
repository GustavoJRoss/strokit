import { z } from "zod";
import { reveal } from "./path-motion";
import type { Preset } from "./types";

export const drawFillParamsSchema = z
  .object({
    fillAt: z.number().min(0.1).max(0.95).meta({ label: "Início do preenchimento", step: 0.05 }),
  })
  .strict();

export type DrawFillParams = z.infer<typeof drawFillParamsSchema>;

/** Draws the outline, then fades the fill in from `fillAt` (fraction of the duration) to the end. */
export const drawFillPreset: Preset<"draw-fill", DrawFillParams> = {
  id: "draw-fill",
  label: "Desenhar e preencher",
  description: "Desenha o contorno e depois preenche. Recomendado para logos só com preenchimento.",
  paramsSchema: drawFillParamsSchema,
  defaults: {
    params: { fillAt: 0.6 },
    timing: { duration: 2000, delay: 0, easing: "ease-in-out", iterations: 1, direction: "normal" },
  },
  requiresStroke: true,
  compile: ({ params, timing, path }) => {
    const stroke = reveal(path);
    return {
      keyframes: [
        {
          name: "draw-fill",
          stops: [
            { offset: 0, props: { ...stroke.from, "fill-opacity": "0" } },
            { offset: params.fillAt, props: { ...stroke.to, "fill-opacity": "0" } },
            { offset: 1, props: { ...stroke.to, "fill-opacity": "1" } },
          ],
        },
      ],
      rule: {
        attrs: { pathLength: "1" },
        props: stroke.props,
        animations: [{ ...timing, keyframes: "draw-fill", fillMode: "both" }],
        reducedMotion: { ...stroke.reducedMotion, "fill-opacity": "1" },
      },
    };
  },
};
