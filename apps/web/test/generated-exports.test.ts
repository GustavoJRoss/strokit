import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  type AnimationSpec,
  applyPreset,
  compile,
  createEmptySpec,
  exporters,
  importSvg,
  type PresetId,
} from "@strokekit/core";
import { describe, expect, it } from "vitest";

/**
 * `app/exemplos/generated/*.tsx` are real exporter outputs, compiled by `next build` and
 * exercised by e2e. Regenerate with: UPDATE_GENERATED=1 pnpm --filter @strokekit/web test
 */
type Config = {
  component: string;
  example: string;
  name: string;
  preset: PresetId;
  exporter: "react" | "motion";
  configure?: (spec: AnimationSpec) => void;
};

const GENERATED: Config[] = [
  {
    component: "OrbitaLogo",
    example: "orbita.svg",
    name: "Órbita",
    preset: "stagger-draw",
    exporter: "react",
    configure: (spec) => {
      const track = spec.tracks[0];
      if (track) track.timing.iterations = "infinite";
    },
  },
  { component: "OndaLogo", example: "onda.svg", name: "Onda", preset: "comet", exporter: "react" },
  {
    component: "PicoLoader",
    example: "pico.svg",
    name: "Carregando",
    preset: "yoyo",
    exporter: "motion",
    configure: (spec) => {
      spec.global.a11y.mode = "status";
    },
  },
  {
    component: "OrbitaMotionLogo",
    example: "orbita.svg",
    name: "Órbita",
    preset: "draw-fill",
    exporter: "motion",
  },
];

const root = join(import.meta.dirname, "..");

function generate(config: Config): string {
  const markup = readFileSync(join(root, "public", "examples", config.example), "utf8");
  const { document } = importSvg(markup, { parser: new DOMParser() });
  const spec = applyPreset(
    createEmptySpec(config.name),
    document.elements.map((element) => element.id),
    config.preset,
  );
  spec.global.a11y.label = config.name;
  spec.global.autoStroke.enabled = document.elements.some((element) => !element.hasStroke);
  config.configure?.(spec);
  return exporters[config.exporter](compile(document, spec), { componentName: config.component });
}

describe("generated example components", () => {
  it.each(GENERATED)("$component is up to date", (config) => {
    const path = join(root, "app", "exemplos", "generated", `${config.component}.tsx`);
    const code = generate(config);
    if (process.env.UPDATE_GENERATED) writeFileSync(path, code);
    expect(readFileSync(path, "utf8")).toBe(code);
  });
});
