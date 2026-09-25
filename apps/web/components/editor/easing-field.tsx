"use client";

import type { Easing, EasingPreset } from "@strokit/core";
import { useId, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Bezier = [number, number, number, number];

const PRESETS: { value: EasingPreset; label: string; curve: Bezier }[] = [
  { value: "linear", label: "Linear", curve: [0, 0, 1, 1] },
  { value: "ease", label: "Suave", curve: [0.25, 0.1, 0.25, 1] },
  { value: "ease-in", label: "Acelerar", curve: [0.42, 0, 1, 1] },
  { value: "ease-out", label: "Desacelerar", curve: [0, 0, 0.58, 1] },
  { value: "ease-in-out", label: "Acelerar e desacelerar", curve: [0.42, 0, 0.58, 1] },
];

const CUSTOM = "custom";

// Plot geometry: x ∈ [0, 1], y ∈ [-0.5, 1.5] so overshooting curves stay visible.
const W = 200;
const H = 240;
const PAD = 16;
const Y_MIN = -0.5;
const Y_MAX = 1.5;

const toX = (x: number) => PAD + x * (W - 2 * PAD);
const toY = (y: number) => PAD + ((Y_MAX - y) / (Y_MAX - Y_MIN)) * (H - 2 * PAD);
const round2 = (value: number) => Math.round(value * 100) / 100;
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/** Short UI label for summaries ("Acelerar e desacelerar", "Personalizado"). */
export function easingLabel(easing: Easing): string {
  if (typeof easing !== "string") return "Personalizado";
  return PRESETS.find((preset) => preset.value === easing)?.label ?? easing;
}

export function curveOf(easing: Easing): Bezier {
  if (typeof easing !== "string") return easing.cubicBezier;
  return PRESETS.find((preset) => preset.value === easing)?.curve ?? [0.25, 0.1, 0.25, 1];
}

function BezierEditor({ value, onChange }: { value: Bezier; onChange: (value: Bezier) => void }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const baseId = useId();
  const [x1, y1, x2, y2] = value;

  const setPoint = (point: 0 | 1, x: number, y: number) => {
    const next: Bezier = [...value];
    next[point * 2] = round2(clamp(x, 0, 1));
    next[point * 2 + 1] = round2(clamp(y, Y_MIN, Y_MAX));
    onChange(next);
  };

  const fromPointer = (event: React.PointerEvent, point: 0 | 1) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const sx = ((event.clientX - rect.left) / rect.width) * W;
    const sy = ((event.clientY - rect.top) / rect.height) * H;
    setPoint(
      point,
      (sx - PAD) / (W - 2 * PAD),
      Y_MAX - ((sy - PAD) / (H - 2 * PAD)) * (Y_MAX - Y_MIN),
    );
  };

  const handle = (point: 0 | 1, x: number, y: number) => (
    <circle
      cx={toX(x)}
      cy={toY(y)}
      r={7}
      tabIndex={0}
      role="slider"
      aria-label={`Ponto de controle ${point + 1}`}
      aria-valuetext={`x ${x}, y ${y}`}
      aria-valuenow={y}
      aria-valuemin={Y_MIN}
      aria-valuemax={Y_MAX}
      className="cursor-grab fill-background stroke-primary outline-none [stroke-width:2.5] focus-visible:stroke-ring focus-visible:[stroke-width:4] active:cursor-grabbing"
      onPointerDown={(event) => {
        event.currentTarget.setPointerCapture(event.pointerId);
      }}
      onPointerMove={(event) => {
        if (event.currentTarget.hasPointerCapture(event.pointerId)) fromPointer(event, point);
      }}
      onKeyDown={(event) => {
        const step = event.shiftKey ? 0.1 : 0.01;
        const moves: Record<string, [number, number]> = {
          ArrowLeft: [-step, 0],
          ArrowRight: [step, 0],
          ArrowUp: [0, step],
          ArrowDown: [0, -step],
        };
        const move = moves[event.key];
        if (!move) return;
        event.preventDefault();
        setPoint(point, x + move[0], y + move[1]);
      }}
    />
  );

  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="sr-only">Curva de easing</legend>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="mx-auto h-48 w-40 touch-none select-none"
      >
        <title>Curva de easing: arraste os pontos ou use as setas</title>
        <rect
          x={toX(0)}
          y={toY(1)}
          width={toX(1) - toX(0)}
          height={toY(0) - toY(1)}
          className="fill-muted stroke-border"
        />
        <line
          x1={toX(0)}
          y1={toY(0)}
          x2={toX(x1)}
          y2={toY(y1)}
          className="stroke-muted-foreground"
        />
        <line
          x1={toX(1)}
          y1={toY(1)}
          x2={toX(x2)}
          y2={toY(y2)}
          className="stroke-muted-foreground"
        />
        <path
          d={`M ${toX(0)} ${toY(0)} C ${toX(x1)} ${toY(y1)}, ${toX(x2)} ${toY(y2)}, ${toX(1)} ${toY(1)}`}
          className="fill-none stroke-foreground [stroke-width:2.5]"
        />
        {handle(0, x1, y1)}
        {handle(1, x2, y2)}
      </svg>
      <div className="grid grid-cols-4 gap-1.5">
        {(["x1", "y1", "x2", "y2"] as const).map((name, index) => (
          <div key={name} className="flex flex-col gap-1">
            <Label htmlFor={`${baseId}-${name}`} className="text-muted-foreground text-xs">
              {name}
            </Label>
            <Input
              id={`${baseId}-${name}`}
              type="number"
              step={0.01}
              min={index % 2 === 0 ? 0 : Y_MIN}
              max={index % 2 === 0 ? 1 : Y_MAX}
              value={value[index]}
              className="h-7 px-1.5 text-xs tabular-nums"
              onChange={(event) => {
                const parsed = Number(event.target.value);
                if (event.target.value === "" || !Number.isFinite(parsed)) return;
                const next: Bezier = [...value];
                next[index] = round2(
                  index % 2 === 0 ? clamp(parsed, 0, 1) : clamp(parsed, Y_MIN, Y_MAX),
                );
                onChange(next);
              }}
            />
          </div>
        ))}
      </div>
      <code className="text-center text-muted-foreground text-xs">
        cubic-bezier({value.join(", ")})
      </code>
    </fieldset>
  );
}

export function EasingField({
  value,
  onChange,
}: {
  value: Easing;
  onChange: (value: Easing) => void;
}) {
  const id = useId();
  const selected = typeof value === "string" ? value : CUSTOM;
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={id} className="text-sm">
          Easing
        </Label>
        <Select
          value={selected}
          onValueChange={(next) =>
            onChange(next === CUSTOM ? { cubicBezier: curveOf(value) } : (next as EasingPreset))
          }
        >
          <SelectTrigger id={id} size="sm" className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PRESETS.map((preset) => (
              <SelectItem key={preset.value} value={preset.value}>
                {preset.label}
              </SelectItem>
            ))}
            <SelectItem value={CUSTOM}>Personalizado</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {typeof value !== "string" && (
        <BezierEditor
          value={value.cubicBezier}
          onChange={(cubicBezier) => onChange({ cubicBezier })}
        />
      )}
    </div>
  );
}
