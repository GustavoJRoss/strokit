import { z } from "zod";
import { round } from "../util/number";
import type { Preset } from "./types";

export const spinParamsSchema = z
  .object({
    direction: z.enum(["cw", "ccw"]).meta({
      label: "Sentido",
      options: { cw: "Horário", ccw: "Anti-horário" },
    }),
    angle: z.number().min(15).max(720).meta({ label: "Ângulo", step: 15, unit: "°" }),
    pivot: z.enum(["logo", "piece"]).meta({
      label: "Pivô",
      options: { logo: "Logo inteira", piece: "Cada peça" },
    }),
  })
  .strict();

export type SpinParams = z.infer<typeof spinParamsSchema>;

/**
 * Rotates the piece. With pivot "logo" every element turns around the center of the viewBox, so
 * the whole logo spins as one: `compile()` hands over that center in the element's own
 * coordinates (`origin`), because a CSS origin lives in the local space and any SVG `transform`
 * on the element or its ancestors would shift it. With pivot "piece" (or no usable origin) each
 * element turns around its own center, like `pulse`. `compile()` moves any SVG `transform` to a
 * wrapper `<g>`.
 */
export const spinPreset: Preset<"spin", SpinParams> = {
  id: "spin",
  label: "Girar",
  description: "A logo gira em torno do centro. Ótimo para telas de carregamento.",
  paramsSchema: spinParamsSchema,
  defaults: {
    params: { direction: "cw", angle: 360, pivot: "logo" },
    timing: {
      duration: 1500,
      delay: 0,
      easing: "linear",
      iterations: "infinite",
      direction: "normal",
    },
  },
  requiresStroke: false,
  compile: ({ params, timing, origin, mirrored }) => {
    // A mirrored local space (negative determinant) turns the rotation the other way on screen.
    const sign = (params.direction === "cw" ? 1 : -1) * (mirrored ? -1 : 1);
    const turn = `rotate(${round(sign * params.angle)}deg)`;
    const props =
      params.pivot === "logo" && origin
        ? {
            "transform-box": "view-box",
            "transform-origin": `${round(origin[0])}px ${round(origin[1])}px`,
          }
        : { "transform-box": "fill-box", "transform-origin": "center" };
    return {
      keyframes: [
        {
          name: "spin",
          stops: [
            { offset: 0, props: { transform: "rotate(0deg)" } },
            { offset: 1, props: { transform: turn } },
          ],
        },
      ],
      rule: {
        props,
        animations: [{ ...timing, keyframes: "spin", fillMode: "both" }],
        reducedMotion: { transform: "none" },
      },
    };
  },
};
