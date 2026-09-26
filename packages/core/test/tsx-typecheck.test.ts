import { spawnSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { compile } from "../src/compile/compile";
import { exportMotion } from "../src/exporters/motion";
import { exportReact } from "../src/exporters/react";
import { presetIds } from "../src/presets";
import { applyPreset, createEmptySpec } from "../src/spec/defaults";
import { updateLayers } from "../src/spec/layers";
import { importSvg } from "../src/svg/import";
import { fixture, parser } from "./helpers";

/**
 * The exported TSX must compile under strict settings, with the real React and Motion types.
 * This runs the TypeScript compiler on generated files for every preset and both a11y modes.
 */
const outDir = join(import.meta.dirname, ".tsx-check");
const tsc = join(import.meta.dirname, "..", "node_modules", ".bin", "tsc");

afterAll(() => rmSync(outDir, { recursive: true, force: true }));

describe("exported TSX compiles", () => {
  it("React and Motion exports typecheck for every preset", { timeout: 60_000 }, () => {
    rmSync(outDir, { recursive: true, force: true });
    mkdirSync(outDir, { recursive: true });
    const files: string[] = [];
    for (const name of ["simple-stroke.svg", "illustrator-classes.svg"]) {
      const { document } = importSvg(fixture(name), { parser });
      for (const preset of presetIds) {
        for (const mode of ["img", "status"] as const) {
          // The last layer stays out of the track but is edited: a rule with no animation.
          const ids = document.elements.map((element) => element.id);
          const spec = updateLayers(
            applyPreset(createEmptySpec(), ids.slice(0, -1), preset),
            [ids[0] ?? "", ids[ids.length - 1] ?? ""],
            { name: "Primeira", stroke: "#e11d48", opacity: 0.5, linecap: "round" },
          );
          spec.global.autoStroke.enabled = true;
          spec.global.a11y = { label: 'Logo "x" {y}', mode };
          const compiled = compile(document, spec);
          const base = `${name.replace(".svg", "")}-${preset}-${mode}`;
          writeFileSync(
            join(outDir, `${base}-react.tsx`),
            exportReact(compiled, { componentName: "TestLogo" }),
          );
          writeFileSync(
            join(outDir, `${base}-motion.tsx`),
            exportMotion(compiled, { componentName: "TestLogo" }),
          );
          files.push(`${base}-react.tsx`, `${base}-motion.tsx`);
        }
      }
    }
    writeFileSync(
      join(outDir, "tsconfig.json"),
      JSON.stringify({
        compilerOptions: {
          target: "ES2022",
          lib: ["DOM", "ES2023"],
          module: "ESNext",
          moduleResolution: "Bundler",
          jsx: "react-jsx",
          strict: true,
          noUncheckedIndexedAccess: true,
          exactOptionalPropertyTypes: true,
          noEmit: true,
          skipLibCheck: true,
          isolatedModules: true,
          types: [],
        },
        include: files,
      }),
    );
    const result = spawnSync(tsc, ["-p", join(outDir, "tsconfig.json")], { encoding: "utf8" });
    expect(result.stdout + result.stderr).toBe("");
    expect(result.status).toBe(0);
  });
});
