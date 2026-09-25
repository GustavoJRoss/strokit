import { describe, expect, it } from "vitest";
import { z } from "zod";
import { describeParams } from "../src/presets/fields";

describe("describeParams", () => {
  it("describes numbers, enums and booleans with metadata", () => {
    const schema = z.object({
      length: z.number().min(0).max(1).meta({ label: "Comprimento", step: 0.01 }),
      step: z.number().min(0).default(80).meta({ label: "Passo", unit: "ms" }),
      order: z.enum(["document", "reverse"]).meta({ label: "Ordem" }),
      loop: z.boolean().optional(),
      ignored: z.string(),
    });
    expect(describeParams(schema)).toEqual([
      { key: "length", kind: "number", label: "Comprimento", min: 0, max: 1, step: 0.01 },
      { key: "step", kind: "number", label: "Passo", min: 0, unit: "ms" },
      { key: "order", kind: "enum", label: "Ordem", options: ["document", "reverse"] },
      { key: "loop", kind: "boolean", label: "loop" },
    ]);
  });

  it("returns no fields for empty or non-object schemas", () => {
    expect(describeParams(z.object({}).strict())).toEqual([]);
    expect(describeParams(z.number())).toEqual([]);
  });
});
