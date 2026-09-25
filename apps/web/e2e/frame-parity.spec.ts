import { expect, type Page, test } from "@playwright/test";
import { compile, decodeShare, importSvg, sampleAnimation } from "@strokit/core";
import { DOMParser } from "linkedom";
import { loadExample } from "./helpers";

/**
 * Video frames come from `sampleAnimation()`, the preview from the browser's CSS engine.
 * They must agree: seek the real CSS animations and compare with the core at the same times.
 */
const parser = new DOMParser() as unknown as Parameters<typeof importSvg>[1]["parser"];
const TIMES = [0, 137, 480, 905, 1333, 2100, 3777];

async function compiledFromUrl(page: Page) {
  await expect.poll(() => new URL(page.url()).hash).toMatch(/^#s=/);
  const { svg, spec } = decodeShare(new URL(page.url()).hash);
  return compile(importSvg(svg, { parser }).document, spec);
}

async function browserState(page: Page, time: number) {
  return page.evaluate((t) => {
    const root = document.querySelector('[data-testid="preview"]')?.shadowRoot;
    for (const animation of root?.getAnimations() ?? []) {
      animation.pause();
      animation.currentTime = t;
    }
    const state: Record<string, Record<string, number>> = {};
    for (const element of root?.querySelectorAll("[data-sk-id]") ?? []) {
      const style = getComputedStyle(element);
      const matrix = new DOMMatrix(style.transform === "none" ? undefined : style.transform);
      state[element.getAttribute("data-sk-id") ?? ""] = {
        dashoffset: Number.parseFloat(style.strokeDashoffset),
        opacity: Number(style.opacity),
        fillOpacity: Number(style.fillOpacity),
        scale: matrix.a,
      };
    }
    return state;
  }, time);
}

const PRESETS = [
  "Desenhar",
  "Desenhar e preencher",
  "Desenhar em sequência",
  "Cometa",
  "Vai e vem",
  "Formigas marchando",
  "Pulsar",
];

for (const preset of PRESETS) {
  test(`video frames match the CSS preview: ${preset}`, async ({ page }) => {
    await page.goto("/editor");
    await loadExample(page, "Órbita");
    // Preset cards are named "<label> <description>"; descriptions start with a capital letter,
    // which tells "Desenhar" apart from "Desenhar e preencher".
    await page.getByRole("button", { name: new RegExp(`^${preset} [A-ZÀ-Ú]`) }).click();
    // Let the debounced share hash catch up with the preset change.
    await page.waitForTimeout(450);
    const compiled = await compiledFromUrl(page);

    for (const time of TIMES) {
      const browser = await browserState(page, time);
      const core = sampleAnimation(compiled, time);
      for (const [id, props] of core) {
        const actual = browser[id];
        expect(actual, `${id} rendered`).toBeDefined();
        if (!actual) continue;
        const where = `${preset} ${id} @${time}ms`;
        if (props["stroke-dashoffset"] !== undefined) {
          expect(actual.dashoffset, `dashoffset ${where}`).toBeCloseTo(
            Number(props["stroke-dashoffset"]),
            2,
          );
        }
        if (props.opacity !== undefined) {
          expect(actual.opacity, `opacity ${where}`).toBeCloseTo(Number(props.opacity), 2);
        }
        if (props["fill-opacity"] !== undefined) {
          expect(actual.fillOpacity, `fill-opacity ${where}`).toBeCloseTo(
            Number(props["fill-opacity"]),
            2,
          );
        }
        const scale = /scale\(([-\d.]+)\)/.exec(props.transform ?? "");
        if (scale) expect(actual.scale, `scale ${where}`).toBeCloseTo(Number(scale[1]), 2);
      }
    }
  });
}
