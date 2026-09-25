import { z } from "zod";

/** Metadata presets attach to params with `.meta()` so editors can render controls. */
export type ParamMeta = {
  label?: string;
  step?: number;
  unit?: string;
  /** Enum value → UI label. */
  options?: Record<string, string>;
};

export type ParamField =
  | {
      key: string;
      kind: "number";
      label: string;
      min?: number;
      max?: number;
      step?: number;
      unit?: string;
    }
  | { key: string; kind: "enum"; label: string; options: { value: string; label: string }[] }
  | { key: string; kind: "boolean"; label: string };

function unwrap(schema: z.ZodType): z.ZodType {
  let current = schema;
  while (current instanceof z.ZodDefault || current instanceof z.ZodOptional) {
    current = current.unwrap() as z.ZodType;
  }
  return current;
}

/**
 * Describes the fields of a preset params schema so UIs can generate controls without
 * knowing presets. Only flat objects of number / enum / boolean are supported.
 */
export function describeParams(schema: z.ZodType): ParamField[] {
  if (!(schema instanceof z.ZodObject)) return [];
  const fields: ParamField[] = [];
  for (const [key, raw] of Object.entries(schema.shape as Record<string, z.ZodType>)) {
    const meta = (raw.meta() ?? {}) as ParamMeta;
    const field = unwrap(raw);
    const label = meta.label ?? key;
    if (field instanceof z.ZodNumber) {
      const number: ParamField = { key, kind: "number", label };
      if (field.minValue !== null && Number.isFinite(field.minValue)) number.min = field.minValue;
      if (field.maxValue !== null && Number.isFinite(field.maxValue)) number.max = field.maxValue;
      if (meta.step !== undefined) number.step = meta.step;
      if (meta.unit !== undefined) number.unit = meta.unit;
      fields.push(number);
    } else if (field instanceof z.ZodEnum) {
      fields.push({
        key,
        kind: "enum",
        label,
        options: field.options.map((option) => {
          const value = String(option);
          return { value, label: meta.options?.[value] ?? value };
        }),
      });
    } else if (field instanceof z.ZodBoolean) {
      fields.push({ key, kind: "boolean", label });
    }
  }
  return fields;
}
