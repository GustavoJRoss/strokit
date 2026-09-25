import { z } from "zod";
import { round } from "../util/number";
import { shuffledIndices } from "../util/random";
import type { Preset } from "./types";

export const staggerDrawParamsSchema = z
  .object({
    step: z.number().int().min(0).max(2000).meta({ label: "Intervalo", step: 10, unit: "ms" }),
    order: z.enum(["document", "reverse", "random"]).meta({
      label: "Ordem",
      options: { document: "Do documento", reverse: "Reversa", random: "Aleatória" },
    }),
    seed: z.number().int().min(0).max(9999).meta({ label: "Semente (aleatória)" }),
  })
  .strict();

export type StaggerDrawParams = z.infer<typeof staggerDrawParamsSchema>;

function position(index: number, total: number, params: StaggerDrawParams): number {
  if (params.order === "reverse") return total - 1 - index;
  if (params.order === "random") return shuffledIndices(total, params.seed)[index] ?? index;
  return index;
}

/**
 * `draw` with an incremental delay. With a single iteration the delay is `animation-delay`.
 * When it repeats, `animation-delay` would only offset the first cycle and the loop would drift,
 * so each element gets its own keyframes inside one shared cycle of `duration + (n-1)·step`.
 */
export const staggerDrawPreset: Preset<"stagger-draw", StaggerDrawParams> = {
  id: "stagger-draw",
  label: "Desenhar em sequência",
  description: "Cada camada se desenha com um atraso em relação à anterior.",
  paramsSchema: staggerDrawParamsSchema,
  defaults: {
    params: { step: 150, order: "document", seed: 1 },
    timing: { duration: 900, delay: 0, easing: "ease-in-out", iterations: 1, direction: "normal" },
  },
  requiresStroke: true,
  compile: ({ index, total, params, timing }) => {
    const offset = position(index, total, params) * params.step;
    const rule = {
      attrs: { pathLength: "1" },
      props: { "stroke-dasharray": "1 1" },
      reducedMotion: { "stroke-dashoffset": "0" },
    };

    if (timing.iterations === 1) {
      return {
        keyframes: [
          {
            name: "stagger-draw",
            stops: [
              { offset: 0, props: { "stroke-dashoffset": "1" } },
              { offset: 1, props: { "stroke-dashoffset": "0" } },
            ],
          },
        ],
        rule: {
          ...rule,
          animations: [
            {
              ...timing,
              delay: timing.delay + offset,
              keyframes: "stagger-draw",
              fillMode: "both",
            },
          ],
        },
      };
    }

    const cycle = timing.duration + (total - 1) * params.step;
    const start = round(offset / cycle);
    const end = round((offset + timing.duration) / cycle);
    const name = `stagger-draw-${offset}`;
    const stops = [{ offset: 0, props: { "stroke-dashoffset": "1" } }];
    if (start > 0) stops.push({ offset: start, props: { "stroke-dashoffset": "1" } });
    stops.push({ offset: end, props: { "stroke-dashoffset": "0" } });
    if (end < 1) stops.push({ offset: 1, props: { "stroke-dashoffset": "0" } });
    return {
      keyframes: [{ name, stops }],
      rule: {
        ...rule,
        animations: [{ ...timing, duration: cycle, keyframes: name, fillMode: "both" }],
      },
    };
  },
};
