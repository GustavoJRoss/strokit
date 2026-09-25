import { readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { SvgImportError } from "../src/svg/errors";
import { importSvg, sanitizeSvg } from "../src/svg/import";
import { fixture, parser } from "./helpers";

const maliciousDir = join(dirname(fileURLToPath(import.meta.url)), "fixtures", "malicious");
const malicious = readdirSync(maliciousDir).filter((name) => name !== "doctype-entity.svg");

const sanitize = (markup: string) => sanitizeSvg(markup, { parser });

describe("sanitizeSvg — malicious fixtures", () => {
  it.each(malicious)("%s leaves nothing executable or external", (name) => {
    const output = sanitize(fixture(`malicious/${name}`)).replace(
      'xmlns="http://www.w3.org/2000/svg"',
      "",
    );
    expect(output).not.toMatch(/<(svg:)?script/i);
    expect(output).not.toMatch(/\son\w+=/i);
    expect(output).not.toMatch(/javascript:/i);
    expect(output).not.toMatch(/foreignObject|iframe|<image|<animate|<set/i);
    expect(output).not.toMatch(/https?:|\/\/evil|data:/i);
    expect(output).not.toMatch(/@import|alert/i);
    // Every fixture keeps its harmless drawing.
    expect(output).toMatch(/<path /);
  });

  it("rejects DOCTYPE and entity declarations before parsing", () => {
    expect(() => sanitize(fixture("malicious/doctype-entity.svg"))).toThrowError(
      expect.objectContaining({ code: "doctype" }),
    );
  });

  it("unwraps <a> but keeps its children", () => {
    const output = sanitize(fixture("malicious/javascript-href.svg"));
    expect(output).toContain('<path d="M0 0 L10 10" stroke="red"/>');
    expect(output).toContain('<circle cx="5" cy="5" r="2" fill="blue"/>');
    expect(output).not.toContain("<a");
  });

  it("keeps internal references and rewrites xlink:href as href", () => {
    const output = sanitize(fixture("malicious/external-use.svg"));
    expect(output).toContain('<use href="#p" stroke="red"/>');
    expect(output).toContain("<use/>");
  });

  it("drops only the attributes that point outside the document", () => {
    const output = sanitize(fixture("malicious/external-url.svg"));
    expect(output).toContain('stroke="url(#g)"');
    expect(output).not.toContain("fill=");
    expect(output).not.toContain("mask=");
    expect(output).not.toContain("clip-path=");
    expect(output).toContain('<path d="M0 10 L10 0" stroke="blue"/>');
  });

  it("drops unknown namespaces and attributes", () => {
    const output = sanitize(
      '<svg xmlns="http://evil.example/ns" data-x="1" viewBox="0 0 1 1"><path d="M0 0" foo="bar"/></svg>',
    );
    expect(output).toBe('<svg viewBox="0 0 1 1"><path d="M0 0"/></svg>');
  });

  it("rejects an unbalanced url(", () => {
    const output = sanitize('<svg><path d="M0 0" fill="url(#a" stroke="red"/></svg>');
    expect(output).toBe('<svg><path d="M0 0" stroke="red"/></svg>');
  });

  it("keeps text only inside title and desc", () => {
    const output = sanitize(
      "<svg><title>Logo &amp; co</title><desc>d</desc><g>stray<path d='M0 0'/></g></svg>",
    );
    expect(output).toBe(
      '<svg><title>Logo &amp; co</title><desc>d</desc><g><path d="M0 0"/></g></svg>',
    );
  });

  it("reports removed elements as import warnings", () => {
    const { warnings } = importSvg(fixture("malicious/foreign-object.svg"), { parser });
    expect(warnings).toContainEqual({ code: "removed-element", element: "foreignObject" });
  });
});

describe("parseSvg guards", () => {
  const importMarkup = (markup: string) => () => importSvg(markup, { parser });

  it("rejects empty input", () => {
    expect(importMarkup("   ")).toThrowError(expect.objectContaining({ code: "empty" }));
  });

  it("rejects files over 500 KB", () => {
    const big = `<svg>${"<path d='M0 0'/>".repeat(40_000)}</svg>`;
    expect(importMarkup(big)).toThrowError(expect.objectContaining({ code: "too-large" }));
  });

  it("counts multi-byte characters when measuring size", async () => {
    const { utf8ByteLength } = await import("../src/svg/parse");
    expect(utf8ByteLength("aé€😀")).toBe(1 + 2 + 3 + 4);
  });

  it("rejects non-SVG roots", () => {
    expect(importMarkup("<html><body/></html>")).toThrowError(
      expect.objectContaining({ code: "not-svg" }),
    );
  });

  it("rejects documents the parser flags as invalid", () => {
    const flagging = {
      parseFromString: () => ({
        documentElement: {
          nodeType: 1,
          nodeName: "svg",
          nodeValue: null,
          attributes: [],
          childNodes: [{ nodeType: 1, nodeName: "parsererror", nodeValue: null, childNodes: [] }],
        },
      }),
    };
    expect(() => importSvg("<svg>", { parser: flagging })).toThrowError(
      expect.objectContaining({ code: "invalid-xml" }),
    );
  });

  it("rejects documents without a root element", () => {
    const empty = { parseFromString: () => ({ documentElement: null }) };
    expect(() => importSvg("<svg/>", { parser: empty })).toThrowError(SvgImportError);
  });
});
