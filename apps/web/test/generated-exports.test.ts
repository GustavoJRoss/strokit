import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import {
  type AnimationSpec,
  applyPreset,
  compile,
  createEmptySpec,
  encodeShare,
  exporters,
  getPreset,
  importSvg,
  type PresetId,
  SHARE_HASH_PREFIX,
} from "@strokit/core";
import { describe, expect, it } from "vitest";

/**
 * Files below are real exporter outputs, compiled by `next build` and exercised by e2e:
 * - `app/exemplos/generated/*.tsx` (React/Motion components on /exemplos);
 * - `components/home/generated/*` (home: brand mark, gallery components and data, code samples);
 * - `public/showcase/*.svg` (downloadable CSS exports of the gallery).
 * Regenerate with: UPDATE_GENERATED=1 pnpm --filter @strokit/web test
 */
type Source = {
  /** Path under `public/`. */
  svg: string;
  name: string;
  preset: PresetId;
  configure?: (spec: AnimationSpec) => void;
};

type ComponentConfig = Source & { component: string; exporter: "react" | "motion"; dir: string };

type GalleryItem = Source & { id: string; component: string };

const root = join(import.meta.dirname, "..");
const EXEMPLOS = "app/exemplos/generated";
const HOME = "components/home/generated";

const loop =
  (patch: Partial<AnimationSpec["tracks"][number]["timing"]> = {}) =>
  (spec: AnimationSpec) => {
    for (const track of spec.tracks)
      Object.assign(track.timing, { iterations: "infinite", ...patch });
  };

const COMPONENTS: ComponentConfig[] = [
  {
    dir: EXEMPLOS,
    component: "OrbitaLogo",
    svg: "examples/orbita.svg",
    name: "Órbita",
    preset: "stagger-draw",
    exporter: "react",
    configure: loop(),
  },
  {
    dir: EXEMPLOS,
    component: "OndaLogo",
    svg: "examples/onda.svg",
    name: "Onda",
    preset: "comet",
    exporter: "react",
  },
  {
    dir: EXEMPLOS,
    component: "PicoLoader",
    svg: "examples/pico.svg",
    name: "Carregando",
    preset: "yoyo",
    exporter: "motion",
    configure: (spec) => {
      spec.global.a11y.mode = "status";
    },
  },
  {
    dir: EXEMPLOS,
    component: "OrbitaMotionLogo",
    svg: "examples/orbita.svg",
    name: "Órbita",
    preset: "draw-fill",
    exporter: "motion",
  },
  {
    dir: HOME,
    component: "BrandMark",
    svg: "brand/logo-mark.svg",
    name: "strokit",
    preset: "draw-fill",
    exporter: "react",
    configure: (spec) => {
      // The logo is fill-only: an auto stroke draws the outline, then the fill comes in.
      spec.global.autoStroke = { enabled: true, width: 5 };
      loop({ direction: "alternate", duration: 2800, easing: "ease-in-out" })(spec);
      const track = spec.tracks[0];
      if (track?.preset === "draw-fill") track.params.fillAt = 0.55;
    },
  },
  {
    dir: HOME,
    component: "SupportHeart",
    svg: "brand/heart.svg",
    name: "Apoie o strokit",
    preset: "draw",
    exporter: "react",
    configure: loop({ direction: "alternate", duration: 1800 }),
  },
];

/** One card per preset (the home gallery). Each also ships as a plain `.svg` in `public/showcase/`. */
const GALLERY: GalleryItem[] = [
  {
    id: "assinatura-draw",
    component: "AssinaturaDraw",
    svg: "examples/assinatura.svg",
    name: "Assinatura",
    preset: "draw",
    configure: loop({ direction: "alternate", duration: 2200 }),
  },
  {
    id: "pico-draw-fill",
    component: "PicoDrawFill",
    svg: "examples/pico.svg",
    name: "Pico",
    preset: "draw-fill",
    configure: loop({ direction: "alternate", duration: 2600 }),
  },
  {
    id: "orbita-stagger",
    component: "OrbitaStagger",
    svg: "examples/orbita.svg",
    name: "Órbita",
    preset: "stagger-draw",
    configure: loop(),
  },
  {
    id: "anel-comet",
    component: "AnelComet",
    svg: "examples/anel.svg",
    name: "Anel",
    preset: "comet",
  },
  {
    id: "onda-yoyo",
    component: "OndaYoyo",
    svg: "examples/onda.svg",
    name: "Onda",
    preset: "yoyo",
  },
  {
    id: "selo-march",
    component: "SeloMarch",
    svg: "examples/selo.svg",
    name: "Selo",
    preset: "march",
  },
  {
    id: "orbita-pulse",
    component: "OrbitaPulse",
    svg: "examples/orbita.svg",
    name: "Órbita",
    preset: "pulse",
  },
];

/** Same animation shown in the three export formats on the home page. */
const CODE_SAMPLE: Source = { svg: "examples/anel.svg", name: "Anel", preset: "comet" };

function build(source: Source) {
  const markup = readFileSync(join(root, "public", source.svg), "utf8");
  const { document } = importSvg(markup, { parser: new DOMParser() });
  const spec = applyPreset(
    createEmptySpec(source.name),
    document.elements.map((element) => element.id),
    source.preset,
  );
  spec.global.a11y.label = source.name;
  spec.global.autoStroke.enabled = document.elements.some((element) => !element.hasStroke);
  source.configure?.(spec);
  return { document, spec, compiled: compile(document, spec) };
}

function galleryModule(): string {
  const imports = GALLERY.map((item) => `import { ${item.component} } from "./${item.component}";`);
  const entries = GALLERY.map((item) => {
    const { document, spec } = build(item);
    const hash = `${SHARE_HASH_PREFIX}${encodeShare({ svg: document.raw, spec })}`;
    return `  {
    id: ${JSON.stringify(item.id)},
    name: ${JSON.stringify(item.name)},
    preset: ${JSON.stringify(item.preset)},
    presetLabel: ${JSON.stringify(getPreset(item.preset).label)},
    Component: ${item.component},
    download: ${JSON.stringify(`/showcase/${item.id}.svg`)},
    editorHref: ${JSON.stringify(`/editor${hash}`)},
  },`;
  });
  return `// Generated by test/generated-exports.test.ts. Do not edit.
import type { ComponentType } from "react";
${imports.join("\n")}

export type GalleryEntry = {
  id: string;
  name: string;
  preset: string;
  presetLabel: string;
  Component: ComponentType<{ size?: number | string; speed?: number; className?: string }>;
  download: string;
  editorHref: string;
};

export const gallery: GalleryEntry[] = [
${entries.join("\n")}
];
`;
}

function codeSamplesModule(): string {
  const { compiled } = build(CODE_SAMPLE);
  const options = { componentName: "AnelLogo" };
  return `// Generated by test/generated-exports.test.ts. Do not edit.
export const codeSamples = ${JSON.stringify(
    {
      css: exporters.css(compiled),
      react: exporters.react(compiled, options),
      motion: exporters.motion(compiled, options),
    },
    null,
    2,
  )} as const;
`;
}

type Output = { path: string; content: () => string };

const OUTPUTS: Output[] = [
  ...COMPONENTS.map((config) => ({
    path: join(config.dir, `${config.component}.tsx`),
    content: () =>
      exporters[config.exporter](build(config).compiled, { componentName: config.component }),
  })),
  ...GALLERY.flatMap((item) => [
    {
      path: join(HOME, `${item.component}.tsx`),
      content: () => exporters.react(build(item).compiled, { componentName: item.component }),
    },
    {
      path: join("public", "showcase", `${item.id}.svg`),
      content: () => exporters.css(build(item).compiled),
    },
  ]),
  { path: join(HOME, "gallery.ts"), content: galleryModule },
  { path: join(HOME, "code-samples.ts"), content: codeSamplesModule },
];

describe("generated exporter outputs", () => {
  it.each(OUTPUTS)("$path is up to date", ({ path, content }) => {
    const absolute = join(root, path);
    const expected = content();
    if (process.env.UPDATE_GENERATED) {
      mkdirSync(dirname(absolute), { recursive: true });
      writeFileSync(absolute, expected);
    }
    expect(readFileSync(absolute, "utf8")).toBe(expected);
  });
});
