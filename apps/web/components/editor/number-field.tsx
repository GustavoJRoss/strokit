"use client";

import { useEffect, useId, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";

type NumberFieldProps = {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  disabled?: boolean;
  onChange: (value: number) => void;
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Slider and numeric input kept in sync; both commit on every change (RF6). */
export function NumberField({
  label,
  value,
  min,
  max,
  step = 1,
  unit,
  disabled,
  onChange,
}: NumberFieldProps) {
  const id = useId();
  const [draft, setDraft] = useState(String(value));

  useEffect(() => setDraft(String(value)), [value]);

  const commit = (raw: string) => {
    const parsed = Number(raw);
    if (raw.trim() === "" || !Number.isFinite(parsed)) return;
    onChange(clamp(parsed, min, max));
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={id} className="text-sm">
          {label}
          {unit ? <span className="text-muted-foreground"> ({unit})</span> : null}
        </Label>
        <Input
          id={id}
          type="number"
          inputMode="decimal"
          min={min}
          max={max}
          step={step}
          value={draft}
          disabled={disabled}
          className="h-7 w-24 text-right tabular-nums"
          onChange={(event) => {
            setDraft(event.target.value);
            const parsed = Number(event.target.value);
            if (event.target.value.trim() !== "" && parsed >= min && parsed <= max)
              commit(event.target.value);
          }}
          onBlur={() => {
            commit(draft);
            setDraft(String(value));
          }}
        />
      </div>
      <Slider
        aria-label={label}
        min={min}
        max={max}
        step={step}
        value={[clamp(value, min, max)]}
        disabled={disabled}
        onValueChange={([next]) => next !== undefined && onChange(next)}
      />
    </div>
  );
}
