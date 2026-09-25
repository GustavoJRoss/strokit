import { describe, expect, it } from "vitest";
import { compile } from "../src/compile/compile";
import { exportCss, formatEasing } from "../src/exporters/css";
import { applyPreset, createEmptySpec } from "../src/spec/defaults";
import { importSvg } from "../src/svg/import";
import { fixture, parser } from "./helpers";

function exportFixture(
  name: string,
  configure?: (spec: ReturnType<typeof createEmptySpec>) => void,
) {
  const { document } = importSvg(fixture(name), { parser });
  const spec = applyPreset(
    createEmptySpec(),
    document.elements.map((element) => element.id),
    "draw",
  );
  configure?.(spec);
  return exportCss(compile(document, spec));
}

function styleOf(svg: string): string {
  return /<style>([\s\S]*)<\/style>/.exec(svg)?.[1] ?? "";
}

describe("exporters.css × draw", () => {
  it.each(["simple-stroke.svg", "illustrator-classes.svg"])("%s", (name) => {
    const output = exportFixture(name);
    expect(output).toMatchSnapshot();
  });

  it.each(["simple-stroke.svg", "illustrator-classes.svg", "shapes.svg"])(
    "%s always honors reduced motion and themes colors through CSS variables",
    (name) => {
      const css = styleOf(exportFixture(name));
      expect(css).toContain("@media (prefers-reduced-motion: reduce)");
      // Every hex color in the CSS is a var() fallback, never a fixed value.
      const hexes = css.match(/#[0-9a-f]{3,8}\b/gi) ?? [];
      const fallbacks = css.match(/var\(--sk-stroke, #[0-9a-f]{3,8}\)/gi) ?? [];
      expect(hexes.length).toBe(fallbacks.length);
    },
  );

  it("groups identical rules into one class and strips editor ids by default", () => {
    const output = exportFixture("simple-stroke.svg");
    expect(output.match(/class="sk-[0-9a-z]+-0"/g)).toHaveLength(2);
    expect(output).not.toContain("data-sk-id");
  });

  it("keeps element ids for the editor preview when asked", () => {
    const { document } = importSvg(fixture("simple-stroke.svg"), { parser });
    const spec = applyPreset(createEmptySpec(), ["sk-0"], "draw");
    const output = exportCss(compile(document, spec), { includeElementIds: true });
    expect(output).toContain('data-sk-id="sk-0"');
    expect(output).toContain('data-sk-id="sk-1"');
  });

  it("writes timing, easing and iterations into the animation shorthand", () => {
    const css = styleOf(
      exportFixture("simple-stroke.svg", (spec) => {
        const track = spec.tracks[0];
        if (!track) return;
        track.timing = {
          duration: 900,
          delay: 250,
          easing: { cubicBezier: [0.33333, 0, 0.2, 1] },
          iterations: "infinite",
          direction: "alternate",
        };
      }),
    );
    expect(css).toMatch(
      /animation: sk-[0-9a-z]+-t0-draw 900ms cubic-bezier\(0\.3333, 0, 0\.2, 1\) 250ms infinite alternate both;/,
    );
  });

  it("emits the reduced-motion block even without tracks", () => {
    const { document } = importSvg(fixture("simple-stroke.svg"), { parser });
    const css = styleOf(exportCss(compile(document, createEmptySpec())));
    expect(css).toContain("@media (prefers-reduced-motion: reduce)");
    expect(css).toContain("animation: none;");
  });

  it("formats easing presets verbatim", () => {
    expect(formatEasing("linear")).toBe("linear");
  });
});
