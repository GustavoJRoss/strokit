import { ShareError, SvgImportError } from "@strokit/core";
import { describe, expect, it } from "vitest";
import { en } from "@/lib/i18n/dictionaries/en";
import { es } from "@/lib/i18n/dictionaries/es";
import { pt } from "@/lib/i18n/dictionaries/pt";
import { importErrorMessage, importWarningMessage } from "@/lib/messages";
import { baseName, FileReadError, readSvgFile } from "@/lib/svg-file";

describe("readSvgFile", () => {
  it("reads .svg files", async () => {
    const file = new File(["<svg/>"], "logo.svg", { type: "" });
    await expect(readSvgFile(file)).resolves.toBe("<svg/>");
  });

  it("rejects other file types and files over 500 KB", async () => {
    await expect(readSvgFile(new File(["x"], "logo.png", { type: "image/png" }))).rejects.toThrow(
      FileReadError,
    );
    const big = new File(["x".repeat(500 * 1024 + 1)], "big.svg", { type: "image/svg+xml" });
    await expect(readSvgFile(big)).rejects.toThrow(/500 KB/);
  });

  it("derives a display name", () => {
    expect(baseName("Minha Logo.SVG")).toBe("Minha Logo");
    expect(baseName(".svg")).toBe("logo");
  });
});

describe("messages", () => {
  it("translates errors by code and falls back to a generic message", () => {
    expect(importErrorMessage(new FileReadError("not-svg-file", "x"), pt)).toBe(
      "Escolha um arquivo .svg.",
    );
    expect(importErrorMessage(new FileReadError("too-large", "x"), en)).toBe(
      "The SVG is over the 500 KB limit.",
    );
    expect(importErrorMessage(new SvgImportError("doctype", "x"), es)).toBe(
      "No se aceptan SVG con DOCTYPE o entidades.",
    );
    expect(importErrorMessage(new ShareError("corrupt-link", "x"), en)).toBe(
      "The link is incomplete or corrupted.",
    );
    expect(importErrorMessage("??", pt)).toBe("Não foi possível importar o SVG.");
  });

  it("formats warnings in the chosen language", () => {
    expect(importWarningMessage({ code: "removed-element", element: "script" }, pt)).toContain(
      "<script>",
    );
    expect(importWarningMessage({ code: "removed-element", element: "script" }, en)).toMatch(
      /^<script> element removed/,
    );
    expect(
      importWarningMessage({ code: "unsupported-css-selector", selector: "g > .a" }, es),
    ).toContain("g > .a");
    expect(importWarningMessage({ code: "missing-viewbox" }, en)).toContain("viewBox");
  });
});
