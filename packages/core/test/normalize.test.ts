import { describe, expect, it } from "vitest";
import { importSvg } from "../src/svg/import";
import { parseLength, parseViewBox } from "../src/svg/normalize";
import { fixture, parser } from "./helpers";

const load = (markup: string) => importSvg(markup, { parser });

describe("normalizeSvg", () => {
  it("detects stroked drawables and resolves inherited stroke", () => {
    const { document, warnings } = load(fixture("simple-stroke.svg"));
    expect(warnings).toEqual([]);
    expect(document.viewBox).toEqual([0, 0, 120, 120]);
    expect(document.width).toBe(120);
    expect(document.height).toBe(120);
    expect(document.elements).toEqual([
      {
        id: "sk-0",
        tag: "circle",
        hasFill: false,
        hasStroke: true,
        stroke: "#1d4ed8",
        strokeWidth: 6,
      },
      {
        id: "sk-1",
        tag: "path",
        hasFill: false,
        hasStroke: true,
        stroke: "#1d4ed8",
        strokeWidth: 6,
      },
    ]);
    expect(document.raw).toContain('<circle cx="60" cy="60" r="44" data-sk-id="sk-0"/>');
    expect(
      document.raw.startsWith('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"'),
    ).toBe(true);
  });

  it("detects fill-only logos (RF4) with inherited and overridden fills", () => {
    const { document } = load(fixture("fill-only.svg"));
    expect(document.elements).toEqual([
      { id: "sk-0", tag: "path", hasFill: true, hasStroke: false, fill: "#0f172a" },
      { id: "sk-1", tag: "rect", hasFill: true, hasStroke: false, fill: "#f97316" },
    ]);
    expect(document.width).toBeUndefined();
  });

  it("normalizes Illustrator exports with class-based styles", () => {
    const { document } = load(fixture("illustrator-classes.svg"));
    expect(document.elements.map((element) => [element.tag, element.fill, element.stroke])).toEqual(
      [
        ["path", "#E30613", undefined],
        ["polyline", undefined, "#1D1D1B"],
        ["path", undefined, "#1D1D1B"],
        ["ellipse", "#2563eb", undefined],
        ["line", undefined, "#10b981"],
      ],
    );
    expect(document.elements[2]?.strokeWidth).toBe(5);
    expect(document.raw).not.toMatch(/xml:space|xmlns:xlink|enable-background|x="0px"/);
  });

  it("assigns ids to every basic shape in document order", () => {
    const { document } = load(fixture("shapes.svg"));
    expect(document.elements.map((element) => `${element.id}:${element.tag}`)).toEqual([
      "sk-0:rect",
      "sk-1:circle",
      "sk-2:ellipse",
      "sk-3:line",
      "sk-4:polyline",
      "sk-5:polygon",
    ]);
  });

  it("ignores defs, clip paths, masks and hidden subtrees", () => {
    const { document } = load(`<svg viewBox="0 0 10 10">
      <defs><path d="M0 0"/></defs>
      <clipPath id="c"><rect width="1" height="1"/></clipPath>
      <mask id="m"><circle r="1"/></mask>
      <g display="none"><path d="M1 1"/></g>
      <path d="M2 2"/>
    </svg>`);
    expect(document.elements).toHaveLength(1);
    expect(document.elements[0]).toMatchObject({ id: "sk-0", fill: "black", hasFill: true });
  });

  it("derives a viewBox from width/height or the SVG default viewport", () => {
    const sized = load('<svg width="64px" height="32"><path d="M0 0"/></svg>');
    expect(sized.document.viewBox).toEqual([0, 0, 64, 32]);
    expect(sized.warnings).toEqual([{ code: "missing-viewbox" }]);
    const bare = load('<svg viewBox="0 0 0 10"><path d="M0 0"/></svg>');
    expect(bare.document.viewBox).toEqual([0, 0, 300, 150]);
  });

  it("uses a default stroke width of 1", () => {
    const { document } = load('<svg viewBox="0 0 1 1"><line stroke="red" x2="1"/></svg>');
    expect(document.elements[0]).toEqual({
      id: "sk-0",
      tag: "line",
      hasFill: false,
      hasStroke: true,
      stroke: "red",
      strokeWidth: 1,
    });
  });

  it("fails when there is nothing to animate", () => {
    expect(() => load('<svg viewBox="0 0 1 1"><g/></svg>')).toThrowError(
      expect.objectContaining({ code: "no-drawables" }),
    );
  });
});

describe("length helpers", () => {
  it.each([
    ["12", 12],
    ["12.5px", 12.5],
    [" 1e2 ", 100],
    ["50%", undefined],
    ["2em", undefined],
    [undefined, undefined],
  ])("parseLength(%j) = %j", (input, expected) => {
    expect(parseLength(input)).toBe(expected);
  });

  it.each([
    ["0 0 10 20", [0, 0, 10, 20]],
    ["-5,-5,10,10", [-5, -5, 10, 10]],
    ["0 0 10", null],
    ["0 0 a 10", null],
    ["0 0 -1 10", null],
    [undefined, null],
  ])("parseViewBox(%j)", (input, expected) => {
    expect(parseViewBox(input)).toEqual(expected);
  });
});
