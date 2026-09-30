import { expect, type Page, test } from "@playwright/test";
import { compile, importSvg, parseSpec, sampleAnimation } from "@strokit/core";
import { DOMParser } from "linkedom";
import { loadExample, openSection, readDraft } from "./helpers";

const parser = new DOMParser() as unknown as Parameters<typeof importSvg>[1]["parser"];

async function addStep(page: Page, preset: string) {
  await page.getByRole("combobox", { name: "Depois da última, tocar:" }).click();
  await page.getByRole("option", { name: preset }).click();
}

async function previewStyle(page: Page) {
  return page.evaluate(
    () =>
      document.querySelector('[data-testid="preview"]')?.shadowRoot?.querySelector("svg > style")
        ?.textContent ?? "",
  );
}

test("add a shine after the outline: one rule per element, second step delayed, preview = export", async ({
  page,
}) => {
  await page.goto("/editor");
  await loadExample(page, "Pico");
  const steps = page.getByRole("list", { name: "Sequência" }).getByRole("listitem");
  await expect(steps).toHaveCount(1);

  await addStep(page, "Brilho");
  await expect(steps).toHaveCount(2);
  await expect(steps.nth(1)).toContainText("2. Brilho");

  const code = page.getByTestId("export-code");
  await expect(code).toContainText("t1-shine");
  await expect(code).toContainText("2000ms infinite normal both");
  await expect(code).toContainText("<clipPath");
  await expect(code).toContainText("var(--sk-shine, #fff)");
  const exported = /<style>([\s\S]*?)<\/style>/.exec((await code.textContent()) ?? "")?.[1];
  expect(await previewStyle(page)).toBe(exported);

  // The outline step is now followed, so it can no longer repeat forever.
  await steps.nth(0).getByRole("button").first().click();
  await openSection(page, "Animação");
  await expect(page.getByRole("switch", { name: "Repetir para sempre" })).toBeDisabled();

  // Only the sequence's last step is editable as a loop; removing the shine frees it.
  await steps.nth(1).getByRole("button", { name: "Remover etapa" }).click();
  await expect(steps).toHaveCount(1);
  await expect(page.getByRole("switch", { name: "Repetir para sempre" })).toBeEnabled();
  await expect(code).not.toContainText("<clipPath");
});

test("shine direction changes the sweep", async ({ page }) => {
  await page.goto("/editor");
  await loadExample(page, "Pico");
  await addStep(page, "Brilho");
  const code = page.getByTestId("export-code");
  await expect(code).toContainText("skewX(20deg)");
  await openSection(page, "Animação");
  await page.getByRole("combobox").filter({ hasText: "Para a direita" }).click();
  await page.getByRole("option", { name: "Para baixo" }).click();
  await expect(code).toContainText("skewY(20deg)");
});

test("the order of a sequence can be changed", async ({ page }) => {
  await page.goto("/editor");
  await loadExample(page, "Pico");
  await addStep(page, "Pulsar");
  const steps = page.getByRole("list", { name: "Sequência" }).getByRole("listitem");
  // The outline preset cannot leave the first place.
  await expect(steps.nth(0).getByRole("button", { name: "Mover para baixo" })).toBeDisabled();
  await expect(steps.nth(1).getByRole("button", { name: "Mover para cima" })).toBeDisabled();
});

test("video frames match the CSS preview across a sequence with a shine", async ({ page }) => {
  await page.goto("/editor");
  await loadExample(page, "Pico");
  await addStep(page, "Brilho");
  await expect.poll(async () => (await readDraft(page))?.spec.tracks.length).toBe(2);
  const draft = await readDraft(page);
  if (!draft) throw new Error("no draft");
  const compiled = compile(importSvg(draft.svg, { parser }).document, parseSpec(draft.spec));

  for (const time of [0, 900, 1999, 2400, 2900, 3700, 5200]) {
    const browser = await page.evaluate((t) => {
      const root = document.querySelector('[data-testid="preview"]')?.shadowRoot;
      for (const animation of root?.getAnimations() ?? []) {
        animation.pause();
        animation.currentTime = t;
      }
      const state: Record<string, { dashoffset: number; fillOpacity: number; x: number }> = {};
      for (const element of root?.querySelectorAll("[data-sk-id]") ?? []) {
        const style = getComputedStyle(element);
        const matrix = new DOMMatrix(style.transform === "none" ? undefined : style.transform);
        state[element.getAttribute("data-sk-id") ?? ""] = {
          dashoffset: Number.parseFloat(style.strokeDashoffset),
          fillOpacity: Number(style.fillOpacity),
          x: matrix.e,
        };
      }
      return state;
    }, time);
    for (const [id, props] of sampleAnimation(compiled, time)) {
      const actual = browser[id];
      if (!actual) continue;
      const where = `${id} @${time}ms`;
      if (props["stroke-dashoffset"] !== undefined) {
        expect(actual.dashoffset, `dashoffset ${where}`).toBeCloseTo(
          Number(props["stroke-dashoffset"]),
          2,
        );
      }
      if (props["fill-opacity"] !== undefined) {
        expect(actual.fillOpacity, `fill-opacity ${where}`).toBeCloseTo(
          Number(props["fill-opacity"]),
          2,
        );
      }
      const x = /translate\(([-\d.]+)px/.exec(props.transform ?? "");
      if (x) expect(actual.x, `band x ${where}`).toBeCloseTo(Number(x[1]), 1);
    }
  }
});
