import { expect, type Page, test } from "@playwright/test";
import { compile, importSvg, parseSpec, sampleAnimation } from "@strokit/core";
import { DOMParser } from "linkedom";
import { loadExample, readDraft } from "./helpers";

/**
 * Video frames come from `sampleAnimation()`, the preview from the browser's CSS engine.
 * They must agree: seek the real CSS animations and compare with the core at the same times.
 */
const parser = new DOMParser() as unknown as Parameters<typeof importSvg>[1]["parser"];
const TIMES = [0, 137, 480, 905, 1333, 2100, 3777];

/** Rebuilds the editor's animation from its local draft, once the draft carries `presetId`. */
async function compiledFromDraft(page: Page, presetId: string) {
  await expect.poll(async () => (await readDraft(page))?.spec.tracks[0]?.preset).toBe(presetId);
  const draft = await readDraft(page);
  if (!draft) throw new Error("no draft");
  return compile(importSvg(draft.svg, { parser }).document, parseSpec(draft.spec));
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
  ["Desenhar e preencher", "draw-fill"],
  ["Cometa", "comet"],
  ["Vai e vem", "yoyo"],
  ["Formigas marchando", "march"],
  ["Pulsar", "pulse"],
  ["Girar", "spin"],
] as const;

for (const [preset, presetId] of PRESETS) {
  test(`video frames match the CSS preview: ${preset}`, async ({ page }) => {
    await page.goto("/editor");
    await loadExample(page, "Órbita");
    // Preset cards are named "<label> <description>"; descriptions start with a capital letter.
    await page.getByRole("button", { name: new RegExp(`^${preset} [A-ZÀ-Ú]`) }).click();
    const compiled = await compiledFromDraft(page, presetId);

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
