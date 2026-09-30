import { z } from "zod";
import type { Matrix } from "../svg/transform";
import type { SvgElementNode } from "../svg/tree";
import { round } from "../util/number";
import type { Preset } from "./types";

export const shineDirections = ["right", "left", "down", "up"] as const;

export const shineParamsSchema = z
  .object({
    direction: z.enum(shineDirections).meta({
      label: "Direção",
      options: {
        right: "Para a direita",
        left: "Para a esquerda",
        down: "Para baixo",
        up: "Para cima",
      },
    }),
    angle: z.number().min(-45).max(45).meta({ label: "Inclinação", step: 1, unit: "°" }),
    width: z.number().min(10).max(60).meta({ label: "Largura do brilho", step: 1, unit: "%" }),
    intensity: z.number().min(0.1).max(1).meta({ label: "Intensidade", step: 0.05 }),
    rest: z.number().min(0).max(80).meta({ label: "Pausa entre brilhos", step: 5, unit: "%" }),
  })
  .strict();

export type ShineParams = z.infer<typeof shineParamsSchema>;

function matrixAttr(matrix: Matrix): string {
  return `matrix(${matrix.map(round).join(" ")})`;
}

/** Copy of a drawable for a `<clipPath>`: geometry only, placed with its accumulated matrix. */
function clipShape(node: SvgElementNode, matrix: Matrix): SvgElementNode {
  const attrs: Record<string, string> = {};
  for (const [name, value] of Object.entries(node.attrs)) {
    if (name === "fill-rule") attrs["clip-rule"] = value;
    else if (
      !/^(data-sk-id|id|class|style|transform|fill|stroke|opacity|stroke-.*|fill-.*)$/.test(name)
    ) {
      attrs[name] = value;
    }
  }
  attrs.transform = matrixAttr(matrix);
  return { type: "element", name: node.name, attrs, children: [] };
}

function element(
  name: string,
  attrs: Record<string, string>,
  children: SvgElementNode[] = [],
): SvgElementNode {
  return { type: "element", name, attrs, children };
}

/**
 * Coin-like glint: a soft light band sweeps across the whole piece in `direction`, clipped to the
 * silhouette of the filled shapes. The band is a `<rect>` with a static gradient whose CSS
 * `transform` is animated in viewBox units (like `fade`), so the CSS is independent of scale.
 * `rest` leaves the band parked off-canvas for the end of each cycle (the pause of a glint loop).
 */
export const shinePreset: Preset<"shine", ShineParams> = {
  id: "shine",
  label: "Brilho",
  description: "Um reflexo de luz atravessa a peça na direção escolhida, como numa moeda.",
  paramsSchema: shineParamsSchema,
  defaults: {
    params: { direction: "right", angle: 20, width: 25, intensity: 0.6, rest: 40 },
    timing: {
      duration: 1600,
      delay: 0,
      easing: "ease-in-out",
      iterations: "infinite",
      direction: "normal",
    },
  },
  kind: "layer",
  requiresStroke: false,
  compile: () => ({
    keyframes: [],
    rule: { props: {}, animations: [], reducedMotion: {} },
  }),
  compileOverlay: ({ prefix, targets, params, timing, viewBox }) => {
    const [vx, vy, vw, vh] = viewBox;
    const horizontal = params.direction === "left" || params.direction === "right";
    const forward = params.direction === "right" || params.direction === "down";
    const along = horizontal ? vw : vh;
    const across = horizontal ? vh : vw;
    const thickness = round((along * params.width) / 100);
    const length = round(across * 2);
    const tilt = Math.abs(Math.tan((params.angle * Math.PI) / 180));
    const margin = round(thickness / 2 + (length / 2) * tilt);
    const from = forward ? -margin : along + margin;
    const to = forward ? along + margin : -margin;
    const center = round(horizontal ? vy + vh / 2 : vx + vw / 2);
    const place = (position: number): string =>
      horizontal
        ? `translate(${round(vx + position)}px, ${center}px) skewX(${params.angle}deg)`
        : `translate(${center}px, ${round(vy + position)}px) skewY(${params.angle}deg)`;

    const clipId = `${prefix}-clip`;
    const gradientId = `${prefix}-grad`;
    const bandId = `${prefix}-band`;
    const skipped: string[] = [];
    const shapes: SvgElementNode[] = [];
    for (const { element: drawable, node, matrix } of targets) {
      if (!drawable.hasFill || matrix === null) skipped.push(drawable.id);
      else shapes.push(clipShape(node, matrix));
    }
    if (shapes.length === 0) {
      return { defs: [], nodes: [], keyframes: [], rules: [], skipped };
    }

    const stopOpacities = ["0", String(round(params.intensity)), "0"];
    const stops = stopOpacities.map((opacity, index) =>
      element("stop", {
        "data-sk-id": `${prefix}-stop-${index}`,
        offset: ["0", "0.5", "1"][index] as string,
        "stop-opacity": opacity,
      }),
    );
    const gradient = element(
      "linearGradient",
      {
        id: gradientId,
        x1: "0",
        y1: "0",
        x2: horizontal ? "1" : "0",
        y2: horizontal ? "0" : "1",
      },
      stops,
    );
    const band = element("rect", {
      "data-sk-id": bandId,
      x: String(round(horizontal ? -thickness / 2 : -length / 2)),
      y: String(round(horizontal ? -length / 2 : -thickness / 2)),
      width: String(horizontal ? thickness : length),
      height: String(horizontal ? length : thickness),
      fill: `url(#${gradientId})`,
    });

    const sweepEnd = round(1 - params.rest / 100);
    const rest = params.rest > 0;
    const keyframeStops = [
      { offset: 0, props: { transform: place(from) } },
      { offset: sweepEnd, props: { transform: place(to) } },
      ...(rest ? [{ offset: 1, props: { transform: place(to) } }] : []),
    ];

    return {
      defs: [element("defs", {}, [element("clipPath", { id: clipId }, shapes), gradient])],
      nodes: [
        element(
          "g",
          { "clip-path": `url(#${clipId})`, "pointer-events": "none", "aria-hidden": "true" },
          [band],
        ),
      ],
      keyframes: [{ name: "shine", stops: keyframeStops }],
      rules: [
        {
          elementId: bandId,
          // Parked off-canvas: the resting state, and what reduced motion shows.
          props: { transform: place(from) },
          animations: [{ ...timing, keyframes: "shine", fillMode: "both" }],
          reducedMotion: {},
        },
        ...stops.map((_, index) => ({
          elementId: `${prefix}-stop-${index}`,
          props: { "stop-color": "var(--sk-shine, #fff)" },
          animations: [],
          reducedMotion: {},
        })),
      ],
      skipped,
    };
  },
};
