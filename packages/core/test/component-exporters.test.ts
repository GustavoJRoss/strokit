import { describe, expect, it } from "vitest";
import { compile } from "../src/compile/compile";
import {
  jsxAttributeName,
  jsxAttributeValue,
  templateLiteral,
  toComponentName,
  toJsLiteral,
  toJsx,
} from "../src/exporters/jsx";
import { exportMotion, toMotionKeyframes, toMotionTrack } from "../src/exporters/motion";
import { exportReact } from "../src/exporters/react";
import { presetIds } from "../src/presets";
import { applyPreset, createEmptySpec } from "../src/spec/defaults";
import type { PresetId } from "../src/spec/schema";
import { importSvg } from "../src/svg/import";
import { fixture, parser } from "./helpers";

function compiledFor(name: string, preset: PresetId, mode: "img" | "status" = "img") {
  const { document } = importSvg(fixture(name), { parser });
  const spec = applyPreset(
    createEmptySpec(),
    document.elements.map((element) => element.id),
    preset,
  );
  spec.global.autoStroke.enabled = true;
  spec.global.a11y.mode = mode;
  return compile(document, spec);
}

const cases = presetIds.flatMap((id) =>
  ["simple-stroke.svg", "illustrator-classes.svg"].map((name) => [id, name] as const),
);

describe("exporters.react", () => {
  it.each(cases)("%s × %s", (preset, name) => {
    const output = exportReact(compiledFor(name, preset), { componentName: "TestLogo" });
    expect(output).toMatchSnapshot();
    expect(output).toContain("@media (prefers-reduced-motion: reduce)");
    expect(output).not.toMatch(/from "(?!react")/);
  });

  it("wraps the SVG in a live region for loaders", () => {
    const output = exportReact(compiledFor("simple-stroke.svg", "yoyo", "status"));
    expect(output).toContain('<span role="status" className={className}');
    expect(output).toContain('aria-hidden="true"');
    expect(output).toContain("<span style={visuallyHidden}>{label}</span>");
    expect(output).toContain("export function AnimatedLogo(");
  });

  it("drives speed, loop and pause through CSS custom properties", () => {
    const output = exportReact(compiledFor("simple-stroke.svg", "draw"));
    expect(output).toContain("calc(1500ms / var(--sk-speed, 1))");
    expect(output).toContain("var(--sk-iterations, 1)");
    expect(output).toContain("animation-play-state: var(--sk-play-state, running);");
  });
});

describe("exporters.motion", () => {
  it.each(cases)("%s × %s", (preset, name) => {
    const output = exportMotion(compiledFor(name, preset), { componentName: "TestLogo" });
    expect(output).toMatchSnapshot();
    expect(output.startsWith('"use client";')).toBe(true);
    expect(output).toContain("@media (prefers-reduced-motion: reduce)");
    expect(output).not.toContain("@keyframes");
  });

  it("maps keyframes to value arrays, carrying values missing from a stop", () => {
    expect(
      toMotionKeyframes({
        name: "x",
        stops: [
          { offset: 1, props: { opacity: "1", transform: "scale(1)" } },
          { offset: 0, props: { opacity: "0.5", transform: "scale(1.2)", fill: "red" } },
          { offset: 0.5, props: { opacity: "0.7" } },
        ],
      }),
    ).toEqual({
      keyframes: { opacity: [0.5, 0.7, 1], scale: [1.2, 1.2, 1], fill: ["red", "red", "red"] },
      times: [0, 0.5, 1],
    });
  });

  it("translates timing: seconds, easing, repeats and direction", () => {
    const definition = {
      name: "k",
      stops: [
        { offset: 0, props: { "stroke-dashoffset": "1" } },
        { offset: 0.25, props: { "stroke-dashoffset": "0.5" } },
        { offset: 1, props: { "stroke-dashoffset": "0" } },
      ],
    };
    const base = { keyframes: "k", fillMode: "both" as const, duration: 1200, delay: 300 };
    expect(
      toMotionTrack(
        ".a",
        { ...base, easing: "ease", iterations: 3, direction: "normal" },
        definition,
      ),
    ).toEqual({
      selector: ".a",
      keyframes: { strokeDashoffset: [1, 0.5, 0] },
      options: {
        duration: 1.2,
        delay: 0.3,
        ease: [0.25, 0.1, 0.25, 1],
        times: [0, 0.25, 1],
        repeat: 2,
        repeatType: "loop",
      },
    });
    const reversed = toMotionTrack(
      ".a",
      {
        ...base,
        easing: { cubicBezier: [0.1, 0, 0.2, 1] },
        iterations: "infinite",
        direction: "alternate-reverse",
      },
      definition,
    );
    expect(reversed.keyframes).toEqual({ strokeDashoffset: [0, 0.5, 1] });
    expect(reversed.options).toMatchObject({
      times: [0, 0.75, 1],
      ease: [0.1, 0, 0.2, 1],
      repeat: Number.POSITIVE_INFINITY,
      repeatType: "reverse",
    });
  });
});

describe("JSX helpers", () => {
  it("maps SVG attributes to React props", () => {
    expect(jsxAttributeName("stroke-width")).toBe("strokeWidth");
    expect(jsxAttributeName("class")).toBe("className");
    expect(jsxAttributeName("data-x")).toBe("data-x");
    expect(jsxAttributeName("aria-label")).toBe("aria-label");
    expect(jsxAttributeName("viewBox")).toBe("viewBox");
    expect(jsxAttributeName("xml:space")).toBeNull();
    expect(jsxAttributeName("xmlns")).toBeNull();
  });

  it("escapes values and text safely", () => {
    expect(jsxAttributeValue("M0 0")).toBe('"M0 0"');
    expect(jsxAttributeValue('a"b{c}')).toBe('{"a\\"b{c}"}');
    expect(
      toJsx(
        {
          type: "element",
          name: "g",
          attrs: {},
          children: [
            {
              type: "element",
              name: "title",
              attrs: {},
              children: [{ type: "text", value: "<a> & {b}" }],
            },
            { type: "text", value: "  " },
            { type: "element", name: "desc", attrs: {}, children: [] },
          ],
        },
        0,
      ),
    ).toBe('<g>\n  <title>{"<a> & {b}"}</title>\n  <desc />\n</g>');
    // biome-ignore lint/suspicious/noTemplateCurlyInString: testing that `${` gets escaped
    expect(templateLiteral("a`b${c}\\")).toBe("`a\\`b\\${c}\\\\`");
  });

  it("derives valid component names", () => {
    expect(toComponentName("Órbita azul")).toBe("OrbitaAzulLogo");
    expect(toComponentName("minha-logo")).toBe("MinhaLogo");
    expect(toComponentName("3d")).toBe("Logo3dLogo");
    expect(toComponentName("!!!")).toBe("AnimatedLogo");
  });

  it("prints readable JS literals", () => {
    expect(
      toJsLiteral({ a: [1, 2], "b-c": { d: Number.POSITIVE_INFINITY }, e: [{ f: "g" }] }),
    ).toBe(
      '{\n  a: [1, 2],\n  "b-c": {\n    d: Number.POSITIVE_INFINITY,\n  },\n  e: [\n    {\n      f: "g",\n    },\n  ],\n}',
    );
  });
});
