import { describe, expect, it } from "vitest";
import { appendDrawnPaths, BLANK_VIEWBOX } from "../src/draw/append";
import { shapePath } from "../src/draw/shapes";
import { importSvg } from "../src/svg/import";
import { fixture, parser } from "./helpers";

describe("shapePath", () => {
  it("draws a line", () => {
    expect(shapePath("line", { x: 0, y: 0 }, { x: 10, y: 20 })).toBe("M0 0L10 20");
  });

  it("snaps a line to 45° steps when constrained", () => {
    expect(shapePath("line", { x: 0, y: 0 }, { x: 100, y: 8 }, { constrain: true })).toBe(
      "M0 0L100.32 0",
    );
    expect(shapePath("line", { x: 0, y: 0 }, { x: 50, y: 60 }, { constrain: true })).toMatch(
      /^M0 0L[\d.]+ [\d.]+$/,
    );
  });

  it("extends a line both ways from the center", () => {
    expect(shapePath("line", { x: 50, y: 50 }, { x: 60, y: 50 }, { fromCenter: true })).toBe(
      "M40 50L60 50",
    );
  });

  it("draws a rectangle from any drag direction", () => {
    const expected = "M10 20H40V60H10Z";
    expect(shapePath("rect", { x: 10, y: 20 }, { x: 40, y: 60 })).toBe(expected);
    expect(shapePath("rect", { x: 40, y: 60 }, { x: 10, y: 20 })).toBe(expected);
    expect(shapePath("rect", { x: 40, y: 20 }, { x: 10, y: 60 })).toBe(expected);
  });

  it("makes a square when constrained and grows from the center when asked", () => {
    expect(shapePath("rect", { x: 0, y: 0 }, { x: 30, y: 10 }, { constrain: true })).toBe(
      "M0 0H30V30H0Z",
    );
    expect(shapePath("rect", { x: 50, y: 50 }, { x: 60, y: 55 }, { fromCenter: true })).toBe(
      "M40 45H60V55H40Z",
    );
  });

  it("draws an ellipse as two arcs and a circle when constrained", () => {
    expect(shapePath("ellipse", { x: 0, y: 0 }, { x: 40, y: 20 })).toBe(
      "M0 10A20 10 0 1 1 40 10A20 10 0 1 1 0 10Z",
    );
    expect(shapePath("ellipse", { x: 0, y: 0 }, { x: 40, y: 20 }, { constrain: true })).toBe(
      "M0 20A20 20 0 1 1 40 20A20 20 0 1 1 0 20Z",
    );
  });

  it("returns null for clicks and invalid points", () => {
    expect(shapePath("line", { x: 5, y: 5 }, { x: 5, y: 5 })).toBeNull();
    expect(shapePath("rect", { x: 5, y: 5 }, { x: 5, y: 50 })).toBeNull();
    expect(shapePath("ellipse", { x: 5, y: 5 }, { x: 50, y: 5 })).toBeNull();
    expect(shapePath("rect", { x: Number.NaN, y: 0 }, { x: 1, y: 1 })).toBeNull();
  });

  it("rounds to two decimals", () => {
    expect(shapePath("line", { x: 0.123456, y: 0 }, { x: 1.987654, y: 0 })).toBe("M0.12 0L1.99 0");
  });
});

describe("appendDrawnPaths", () => {
  const style = { stroke: "currentColor", strokeWidth: 10.24 };

  it("starts a blank SVG when there is no document", () => {
    const markup = appendDrawnPaths(null, [{ d: "M0 0L10 10", ...style }]);
    expect(markup).toContain(`viewBox="${BLANK_VIEWBOX.join(" ")}"`);
    const { document } = importSvg(markup, { parser });
    expect(document.elements).toHaveLength(1);
    expect(document.elements[0]).toMatchObject({ tag: "path", hasStroke: true, hasFill: false });
    expect(document.elements[0]?.strokeWidth).toBe(10.24);
  });

  it("adds paths on top of an existing document without touching it", () => {
    const { document } = importSvg(fixture("simple-stroke.svg"), { parser });
    const before = document.raw;
    const markup = appendDrawnPaths(document.root, [
      { d: "M0 0H10V10H0Z", ...style },
      { d: "M1 1L2 2", ...style },
    ]);
    expect(document.raw).toBe(before);
    const next = importSvg(markup, { parser }).document;
    expect(next.elements).toHaveLength(document.elements.length + 2);
    // Existing layers keep their ids: drawn shapes come last.
    expect(next.elements.slice(0, document.elements.length).map((element) => element.tag)).toEqual(
      document.elements.map((element) => element.tag),
    );
  });

  it("drops path data that is not plain path syntax and invalid colors", () => {
    const markup = appendDrawnPaths(null, [
      { d: '"/><script>alert(1)</script>', ...style },
      { d: "M0 0L5 5", stroke: "url(#x);}", strokeWidth: 2 },
    ]);
    expect(markup).not.toContain("script");
    expect(markup).toContain('stroke="currentColor"');
    expect(markup.match(/<path/g)).toHaveLength(1);
  });
});
