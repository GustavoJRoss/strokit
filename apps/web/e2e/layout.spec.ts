import { expect, type Locator, type Page, test } from "@playwright/test";
import { loadExample, openSection } from "./helpers";

test.use({ viewport: { width: 1280, height: 800 } });

const panel = (page: Page, id: "layers" | "preview" | "params" | "export") =>
  page.locator(`#panel-${id}`);

async function box(locator: Locator) {
  const rect = await locator.boundingBox();
  if (!rect) throw new Error("element not visible");
  return rect;
}

/** Size of the rendered SVG inside the preview's shadow root. */
const svgSize = (page: Page) =>
  page.getByTestId("preview").evaluate((host) => {
    const rect = host.shadowRoot?.querySelector("svg")?.getBoundingClientRect();
    return rect ? { width: rect.width, height: rect.height } : null;
  });

async function drag(page: Page, separator: Locator, dx: number, dy: number) {
  const { x, y, width, height } = await box(separator);
  await page.mouse.move(x + width / 2, y + height / 2);
  await page.mouse.down();
  await page.mouse.move(x + width / 2 + dx, y + height / 2 + dy, { steps: 12 });
  await page.mouse.up();
}

test.beforeEach(async ({ page }) => {
  await page.goto("/editor");
  await loadExample(page, "Órbita");
});

test("dragging the code separator resizes the export panel and the SVG follows", async ({
  page,
}) => {
  const before = { export: (await box(panel(page, "export"))).height, svg: await svgSize(page) };
  await drag(page, page.getByRole("separator", { name: "Redimensionar código" }), 0, -160);
  const after = { export: (await box(panel(page, "export"))).height, svg: await svgSize(page) };
  expect(after.export - before.export).toBeGreaterThan(120);
  expect(after.svg?.height ?? 0).toBeLessThan((before.svg?.height ?? 0) - 100);

  await drag(page, page.getByRole("separator", { name: "Redimensionar código" }), 0, 260);
  expect((await svgSize(page))?.height ?? 0).toBeGreaterThan(before.svg?.height ?? 0);
});

test("side panels resize by mouse and keyboard", async ({ page }) => {
  const layers = (await box(panel(page, "layers"))).width;
  await drag(page, page.getByRole("separator", { name: "Redimensionar camadas" }), 90, 0);
  expect((await box(panel(page, "layers"))).width - layers).toBeGreaterThan(60);

  const params = (await box(panel(page, "params"))).width;
  await page.getByRole("separator", { name: "Redimensionar parâmetros" }).focus();
  for (let i = 0; i < 5; i++) await page.keyboard.press("ArrowLeft");
  expect((await box(panel(page, "params"))).width).toBeGreaterThan(params + 20);
});

test("side panels collapse to a rail and come back; the preview grows", async ({ page }) => {
  const layers = (await box(panel(page, "layers"))).width;
  const preview = (await box(panel(page, "preview"))).width;

  await page.getByRole("button", { name: "Esconder camadas" }).click();
  await expect(page.getByRole("button", { name: "Mostrar camadas" })).toBeVisible();
  expect((await box(panel(page, "layers"))).width).toBeLessThan(40);

  await page.getByRole("button", { name: "Esconder parâmetros" }).click();
  await expect(page.getByRole("button", { name: "Mostrar parâmetros" })).toBeVisible();
  expect((await box(panel(page, "preview"))).width).toBeGreaterThan(preview + 300);

  await page.getByRole("button", { name: "Mostrar camadas" }).click();
  await expect(page.getByRole("button", { name: /sk-0/ })).toBeVisible();
  expect(Math.abs((await box(panel(page, "layers"))).width - layers)).toBeLessThan(4);
});

test("the Layout menu toggles panels and restores the default", async ({ page }) => {
  await page.getByRole("button", { name: "Layout" }).click();
  await page.getByRole("menuitemcheckbox", { name: "Parâmetros" }).click();
  await expect(page.getByRole("menuitemcheckbox", { name: "Parâmetros" })).toHaveAttribute(
    "aria-checked",
    "false",
  );
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "Mostrar parâmetros" })).toBeVisible();

  await page.getByRole("button", { name: "Layout" }).click();
  await page.getByRole("menuitem", { name: "Restaurar layout" }).click();
  await expect(page.getByRole("button", { name: "Esconder parâmetros" })).toBeVisible();
});

test("collapsing the code keeps its header, tabs and actions", async ({ page }) => {
  await page.getByRole("button", { name: "Recolher código" }).click();
  expect((await box(panel(page, "export"))).height).toBeLessThan(50);
  await expect(page.getByRole("tab", { name: "React" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Copiar" })).toBeVisible();
  await expect(page.getByTestId("export-code")).toBeHidden();
  await page.getByRole("button", { name: "Mostrar código" }).click();
  await expect(page.getByTestId("export-code")).toBeVisible();
});

test("sections: Preset open, the rest closed with a summary; opening shows the fields", async ({
  page,
}) => {
  await expect(page.getByRole("button", { name: /^Preset/ })).toHaveAttribute(
    "aria-expanded",
    "true",
  );
  const timing = page.getByRole("button", { name: /^Animação/ });
  await expect(timing).toHaveAttribute("aria-expanded", "false");
  await expect(timing).toContainText("1500 ms · Acelerar e desacelerar · 1x");
  await expect(page.getByRole("button", { name: /^Geral/ })).toContainText(
    "Traço automático desligado",
  );
  await expect(page.getByRole("spinbutton", { name: "Duração" })).toHaveCount(0);

  await timing.click();
  await expect(page.getByRole("spinbutton", { name: "Duração" })).toBeVisible();
  await expect(timing).not.toContainText("1500 ms ·");
});

test("a closed Geral section still signals layers without stroke", async ({ page }) => {
  await loadExample(page, "Pico");
  await openSection(page, "Geral");
  await page.getByRole("switch", { name: "Traço automático" }).click();
  await page.getByRole("button", { name: /^Geral/ }).click();
  await expect(page.getByRole("button", { name: /^Geral/ })).toHaveAttribute(
    "aria-expanded",
    "false",
  );
  await expect(page.getByLabel("5 camadas sem traço")).toBeVisible();
});

test("sizes, hidden panels and open sections are remembered; restore resets them", async ({
  page,
}) => {
  await drag(page, page.getByRole("separator", { name: "Redimensionar código" }), 0, -120);
  const exportHeight = (await box(panel(page, "export"))).height;
  await openSection(page, "Animação");
  await page.getByRole("button", { name: "Esconder parâmetros" }).click();
  await expect(page.getByRole("button", { name: "Mostrar parâmetros" })).toBeVisible();

  await page.reload();
  await expect(page.getByRole("button", { name: "Mostrar parâmetros" })).toBeVisible();
  expect(Math.abs((await box(panel(page, "export"))).height - exportHeight)).toBeLessThan(4);
  await page.getByRole("button", { name: "Mostrar parâmetros" }).click();
  await expect(page.getByRole("button", { name: /^Animação/ })).toHaveAttribute(
    "aria-expanded",
    "true",
  );

  await page.getByRole("button", { name: "Layout" }).click();
  await page.getByRole("menuitem", { name: "Restaurar layout" }).click();
  await expect(page.getByRole("button", { name: /^Animação/ })).toHaveAttribute(
    "aria-expanded",
    "false",
  );
  await page.reload();
  await expect(page.getByRole("button", { name: "Esconder parâmetros" })).toBeVisible();
  await expect(page.getByRole("button", { name: /^Animação/ })).toHaveAttribute(
    "aria-expanded",
    "false",
  );
});

test("narrow screens keep the stacked layout without separators", async ({ page }) => {
  await page.setViewportSize({ width: 700, height: 900 });
  await expect(page.getByRole("separator")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Layout" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /^Preset/ })).toBeVisible();
});
