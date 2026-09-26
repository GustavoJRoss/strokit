import { describe, expect, it } from "vitest";
import { en } from "@/lib/i18n/dictionaries/en";
import { es } from "@/lib/i18n/dictionaries/es";
import { pt } from "@/lib/i18n/dictionaries/pt";
import { detectLocale, isLocale, LOCALE_BOOT_SCRIPT } from "@/lib/i18n/locales";

type Leaf = { path: string; value: unknown };

function leaves(value: unknown, path = ""): Leaf[] {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return Object.entries(value).flatMap(([key, item]) =>
      leaves(item, path ? `${path}.${key}` : key),
    );
  }
  if (Array.isArray(value))
    return value.flatMap((item, index) => leaves(item, `${path}[${index}]`));
  return [{ path, value }];
}

describe("dictionaries", () => {
  const reference = leaves(pt).map((leaf) => leaf.path);

  it.each([
    ["en", en],
    ["es", es],
  ])("%s has exactly the keys of pt", (_name, dictionary) => {
    expect(leaves(dictionary).map((leaf) => leaf.path)).toEqual(reference);
  });

  it.each([
    ["pt", pt],
    ["en", en],
    ["es", es],
  ])("%s has no empty strings and every function returns text", (_name, dictionary) => {
    for (const { path, value } of leaves(dictionary)) {
      if (typeof value === "function") {
        const result = (value as (...args: unknown[]) => unknown)(2, "x", "y");
        expect(typeof result, path).toBe("string");
        expect((result as string).length, path).toBeGreaterThan(0);
      } else {
        expect(typeof value, path).toBe("string");
        expect((value as string).trim(), path).not.toBe("");
      }
    }
  });

  it("uses real plurals", () => {
    expect(pt.params.global.missing(1)).toBe("1 camada sem traço");
    expect(pt.params.global.missing(5)).toBe("5 camadas sem traço");
    expect(en.params.preset.appliesToSelection(1)).toBe("Applies to 1 selected layer.");
    expect(es.params.timing.trackInfo("Cometa", 3)).toBe("Cometa · 3 capas");
  });
});

describe("locales", () => {
  it("detects the first supported browser language, else English", () => {
    expect(detectLocale(["pt-BR", "en-US"])).toBe("pt");
    expect(detectLocale(["de-DE", "es-MX"])).toBe("es");
    expect(detectLocale(["EN-gb"])).toBe("en");
    expect(detectLocale(["de-DE", "fr"])).toBe("en");
    expect(detectLocale([])).toBe("en");
    expect(isLocale("pt")).toBe(true);
    expect(isLocale("fr")).toBe(false);
  });

  it("boot script hides the page only for non-default languages, with a timeout", () => {
    expect(LOCALE_BOOT_SCRIPT).toContain("i18n-pending");
    expect(LOCALE_BOOT_SCRIPT).toContain("setTimeout");
    expect(LOCALE_BOOT_SCRIPT).toContain("strokit:locale");
  });
});
