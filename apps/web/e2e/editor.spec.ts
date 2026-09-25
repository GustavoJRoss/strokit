import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, type Page, test } from "@playwright/test";

const maliciousDir = join(
  import.meta.dirname,
  "..",
  "..",
  "..",
  "packages",
  "core",
  "test",
  "fixtures",
  "malicious",
);

async function loadExample(page: Page, name: string) {
  await page.getByRole("button", { name: "Exemplos" }).first().click();
  await page.getByRole("menuitem", { name: new RegExp(name) }).click();
  await expect(page.getByRole("button", { name: /sk-0/ })).toBeVisible();
}

/** Text of the `<style>` in the preview's shadow root and in the export panel. */
async function styles(page: Page) {
  return page.evaluate(() => {
    const root = document.querySelector('[data-testid="preview"]')?.shadowRoot;
    const code = document.querySelector('[data-testid="export-code"]')?.textContent ?? "";
    return {
      preview: root?.querySelector("svg > style")?.textContent ?? null,
      exported: /<style>([\s\S]*?)<\/style>/.exec(code)?.[1] ?? null,
    };
  });
}

test("example → change duration → CSS changes → copy; preview equals export", async ({
  page,
  context,
  browserName,
}) => {
  await page.goto("/editor");
  await loadExample(page, "Órbita");

  const code = page.getByTestId("export-code");
  await expect(code).toContainText("1500ms");

  await page.getByRole("spinbutton", { name: "Duração" }).fill("2400");
  await expect(code).toContainText("2400ms");
  await expect(code).not.toContainText("1500ms");

  const { preview, exported } = await styles(page);
  expect(preview).not.toBeNull();
  expect(preview).toBe(exported);
  expect(preview).toContain("2400ms");

  if (browserName === "chromium") {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.getByRole("button", { name: "Copiar" }).click();
    await expect(page.getByText("Código copiado")).toBeVisible();
    const clipboard = await page.evaluate(() => navigator.clipboard.readText());
    expect(clipboard).toContain("2400ms");
    expect(clipboard).toContain("@media (prefers-reduced-motion: reduce)");
    expect(clipboard).not.toContain("data-sk-id");
  }
});

test("imports a file, sanitizes it and reports what was removed", async ({ page }) => {
  await page.goto("/editor");
  await page
    .getByTestId("file-input")
    .first()
    .setInputFiles(join(maliciousDir, "foreign-object.svg"));
  await expect(page.getByText("SVG importado com ajustes")).toBeVisible();
  const html = await page.evaluate(
    () => document.querySelector('[data-testid="preview"]')?.shadowRoot?.innerHTML ?? "",
  );
  expect(html).toContain("<path");
  expect(html).not.toMatch(/foreignObject|iframe|javascript:/i);
});

test("pasted markup that is not SVG shows a friendly error", async ({ page }) => {
  await page.goto("/editor");
  await page.getByRole("button", { name: "Colar markup" }).first().click();
  await page
    .getByLabel("Markup do SVG")
    .fill(readFileSync(join(maliciousDir, "doctype-entity.svg"), "utf8"));
  await page.getByRole("button", { name: "Importar", exact: true }).click();
  await expect(page.getByText("SVGs com DOCTYPE ou entidades não são aceitos.")).toBeVisible();
});

test("simulated reduced motion shows the static final state", async ({ page }) => {
  await page.goto("/editor");
  await loadExample(page, "Onda");
  await page.getByRole("switch", { name: "Simular reduced motion" }).click();
  const state = await page.evaluate(() => {
    const root = document.querySelector('[data-testid="preview"]')?.shadowRoot;
    const element = root?.querySelector('[data-sk-id="sk-0"]');
    return {
      animations: root?.getAnimations().length,
      dashoffset: element ? getComputedStyle(element).strokeDashoffset : null,
    };
  });
  expect(state.animations).toBe(0);
  expect(state.dashoffset).toMatch(/^0(px)?$/);
});

test("selecting a layer outlines it on the canvas", async ({ page }) => {
  await page.goto("/editor");
  await loadExample(page, "Pico");
  const layer = page.getByRole("button", { name: /sk-2/ });
  await layer.click();
  await expect(layer).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByText("Aplica às 1 camada(s) selecionada(s).")).toBeVisible();
});

/** Pauses every preview animation at `time` and reads computed styles of one element. */
async function sample(page: Page, id: string, time: number) {
  return page.evaluate(
    ({ id, time }) => {
      const root = document.querySelector('[data-testid="preview"]')?.shadowRoot;
      for (const animation of root?.getAnimations() ?? []) {
        animation.pause();
        animation.currentTime = time;
      }
      const element = root?.querySelector(`[data-sk-id="${id}"]`);
      if (!element) return null;
      const style = getComputedStyle(element);
      return {
        dashoffset: Number.parseFloat(style.strokeDashoffset),
        dasharray: style.strokeDasharray,
        fillOpacity: Number(style.fillOpacity),
        stroke: style.stroke,
      };
    },
    { id, time },
  );
}

test.describe("fill-only logo (acceptance, phase 3)", () => {
  test("draw-fill draws the auto-stroke outline, then fills", async ({ page }) => {
    await page.goto("/editor");
    await loadExample(page, "Pico");
    await page.getByRole("button", { name: /Desenhar e preencher/ }).click();
    await expect(page.getByTestId("export-code")).toContainText("fill-opacity");
    await expect(page.getByText(/camada\(s\) sem traço/)).toHaveCount(0);

    const start = await sample(page, "sk-1", 0);
    expect(start?.dashoffset).toBeCloseTo(1);
    expect(start?.fillOpacity).toBe(0);
    expect(start?.stroke).not.toBe("none");

    const outlined = await sample(page, "sk-1", 1200);
    expect(outlined?.dashoffset).toBeCloseTo(0);
    expect(outlined?.fillOpacity).toBe(0);

    const end = await sample(page, "sk-1", 2000);
    expect(end?.fillOpacity).toBe(1);
  });

  test("yoyo runs a visible dash over a ghosted fill", async ({ page }) => {
    await page.goto("/editor");
    await loadExample(page, "Pico");
    await page.getByRole("button", { name: /Vai e vem/ }).click();
    await expect(page.getByTestId("export-code")).toContainText("infinite alternate");

    const mid = await sample(page, "sk-1", 600);
    expect(mid?.fillOpacity).toBeCloseTo(0.2);
    expect(mid?.dasharray).toMatch(/^0\.25(px)?,? 1(px)?$/);
    expect(mid?.dashoffset).toBeLessThan(0);
  });

  test("warns and offers auto-stroke when it is off", async ({ page }) => {
    await page.goto("/editor");
    await loadExample(page, "Pico");
    await page.getByRole("switch", { name: "Traço automático" }).click();
    await expect(page.getByText("5 camada(s) sem traço")).toBeVisible();
    await page.getByRole("button", { name: "Ativar traço automático" }).click();
    await expect(page.getByText(/camada\(s\) sem traço/)).toHaveCount(0);
  });
});

test("custom easing: the curve editor writes cubic-bezier()", async ({ page }) => {
  await page.goto("/editor");
  await loadExample(page, "Órbita");
  await page.getByRole("combobox", { name: "Easing" }).click();
  await page.getByRole("option", { name: "Personalizado" }).click();
  const code = page.getByTestId("export-code");
  await expect(code).toContainText("cubic-bezier(0.42, 0, 0.58, 1)");

  const handle = page.getByRole("slider", { name: "Ponto de controle 1" });
  await handle.focus();
  await page.keyboard.press("Shift+ArrowUp");
  await expect(code).toContainText("cubic-bezier(0.42, 0.1, 0.58, 1)");

  await page.getByLabel("y2").fill("1.4");
  await expect(code).toContainText("cubic-bezier(0.42, 0.1, 0.58, 1.4)");
});
