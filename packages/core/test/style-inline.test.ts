import { describe, expect, it } from "vitest";
import { parseSvg } from "../src/svg/parse";
import { serializeSvg } from "../src/svg/serialize";
import { inlineStyles, parseCss } from "../src/svg/style-inline";
import { fixture, parser } from "./helpers";

const inline = (markup: string) => inlineStyles(parseSvg(markup, parser));

describe("parseCss", () => {
  it("parses flat rules, drops comments and at-rules", () => {
    const rules = parseCss(`
      /* comment */ @import url(x.css);
      @charset "utf-8";
      .a, path { fill: red; stroke : blue !important ; broken; }
      @media print { .a { fill: black } }
      @font-face { font-family: x; }
      #b{opacity:.5}
    `);
    expect(rules).toEqual([
      {
        selectors: [".a", "path"],
        declarations: [
          ["fill", "red"],
          ["stroke", "blue"],
        ],
      },
      { selectors: ["#b"], declarations: [["opacity", ".5"]] },
    ]);
  });

  it("stops at unterminated rules and unterminated at-rules", () => {
    expect(parseCss(".a { fill: red")).toEqual([]);
    expect(parseCss("@import url(x)")).toEqual([]);
    expect(parseCss("@media print { .a { fill: red }")).toEqual([]);
  });
});

describe("inlineStyles", () => {
  it("resolves Illustrator class styles into attributes", () => {
    const { root, warnings } = inline(fixture("illustrator-classes.svg"));
    const output = serializeSvg(root);
    expect(output).not.toMatch(/<style|class=|style=/);
    expect(output).toContain('<path d="M10 90 L40 10 L70 90 Z" fill="#E30613"/>');
    expect(output).toContain(
      '<polyline points="80,90 110,10 140,90" fill="none" stroke="#1D1D1B" stroke-width="4" stroke-miterlimit="10"/>',
    );
    // `path.st1` is more specific than `.st1`.
    expect(output).toContain('d="M150 90 L190 10" fill="none" stroke="#1D1D1B" stroke-width="5"');
    expect(output).toContain(
      '<ellipse id="accent" cx="170" cy="70" rx="12" ry="8" fill="#2563eb"/>',
    );
    // Inline style beats class rules.
    expect(output).toContain('stroke="#10b981"');
    expect(warnings).toEqual([{ code: "unsupported-css-selector", selector: "g > .st0" }]);
  });

  it("lets CSS override presentation attributes and ignores non-presentation properties", () => {
    const { root } = inline(
      '<svg><style>rect{fill:red;font-size:20px} *{stroke:blue}</style><rect fill="green" width="1" height="1"/></svg>',
    );
    expect(serializeSvg(root)).toBe(
      '<svg stroke="blue"><rect fill="red" width="1" height="1" stroke="blue"/></svg>',
    );
  });

  it("applies equal-specificity rules in source order", () => {
    const { root } = inline(
      '<svg><style>.a{fill:red}.b{fill:blue}</style><path class="b a" d="M0 0"/></svg>',
    );
    expect(serializeSvg(root)).toContain('fill="blue"');
  });

  it("does not mutate its input", () => {
    const parsed = parseSvg('<svg><path style="fill:red" d="M0 0"/></svg>', parser);
    inlineStyles(parsed);
    expect(serializeSvg(parsed)).toBe('<svg><path style="fill:red" d="M0 0"/></svg>');
  });
});
