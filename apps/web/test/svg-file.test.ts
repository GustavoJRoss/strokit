import { describe, expect, it } from "vitest";
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
  it("formats errors and warnings in Portuguese", () => {
    expect(importErrorMessage(new FileReadError("Escolha um arquivo .svg."))).toBe(
      "Escolha um arquivo .svg.",
    );
    expect(importErrorMessage("??")).toBe("Não foi possível importar o SVG.");
    expect(importWarningMessage({ code: "removed-element", element: "script" })).toContain(
      "<script>",
    );
    expect(
      importWarningMessage({ code: "unsupported-css-selector", selector: "g > .a" }),
    ).toContain("g > .a");
    expect(importWarningMessage({ code: "missing-viewbox" })).toContain("viewBox");
  });
});
