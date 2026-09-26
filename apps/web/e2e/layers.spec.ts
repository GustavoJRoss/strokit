import { expect, type Page, test } from "@playwright/test";
import { compile, importSvg, parseSpec, sampleAnimation } from "@strokit/core";
import { DOMParser } from "linkedom";
import { captureClipboard, copiedText, loadExample, readDraft } from "./helpers";

const parser = new DOMParser() as unknown as Parameters<typeof importSvg>[1]["parser"];

async function previewStyle(page: Page) {
  return page.evaluate(() => {
    const root = document.querySelector('[data-testid="preview"]')?.shadowRoot;
    return root?.querySelector("svg > style")?.textContent ?? "";
  });
}

async function exportedStyle(page: Page) {
  const code = (await page.getByTestId("export-code").textContent()) ?? "";
  return /<style>([\s\S]*?)<\/style>/.exec(code)?.[1] ?? "";
}

async function setColor(page: Page, label: string, value: string) {
  const field = page.getByRole("textbox", { name: `${label} (texto)` });
  await field.fill(value);
  await field.press("Enter");
}

test("recolor a layer: own CSS token, preview = export, kept in the share link", async ({
  page,
  context,
}) => {
  await captureClipboard(page);
  await page.goto("/editor");
  await loadExample(page, "Órbita");
  await page.getByRole("button", { name: /sk-2/ }).click();
  await page.getByRole("textbox", { name: "Nome" }).fill("Sorriso");
  await page.getByRole("textbox", { name: "Nome" }).press("Enter");
  await setColor(page, "Cor do traço", "#e11d48");
  await page.getByRole("spinbutton", { name: "Espessura do traço" }).fill("9");

  const code = page.getByTestId("export-code");
  await expect(code).toContainText("var(--sk-sorriso-stroke, var(--sk-stroke, #e11d48))");
  await expect(code).toContainText("stroke-width: 9");
  expect(await previewStyle(page)).toBe(await exportedStyle(page));

  // An invalid color is refused with a message and changes nothing.
  await setColor(page, "Cor do traço", "red;} svg{display:none");
  await expect(page.getByText("Cor inválida")).toBeVisible();
  await expect(code).toContainText("#e11d48");

  // Hiding a layer takes it out of the markup.
  await page.getByRole("button", { name: "Ocultar camada" }).nth(3).click();
  await expect(code).not.toContainText('cx="126"');

  await expect.poll(async () => (await readDraft(page))?.svg).toBeTruthy();
  const before = await exportedStyle(page);
  await page.getByRole("button", { name: "Compartilhar" }).click();
  await page.getByRole("menuitem", { name: "Copiar link" }).click();
  const url = await copiedText(page);
  const other = await context.newPage();
  await other.goto(url ?? "");
  await expect(other.getByRole("button", { name: /Sorriso sk-2/ })).toBeVisible();
  expect(await exportedStyle(other)).toBe(before);
});

test("pick the start point by clicking the outline", async ({ page }) => {
  await page.goto("/editor");
  await loadExample(page, "Anel");
  await page.getByRole("button", { name: /sk-0/ }).click();
  await page.getByRole("button", { name: "Escolher no preview" }).click();
  await expect(page.getByText("Clique no contorno da camada (Esc cancela)").first()).toBeVisible();
  await expect(page.getByTestId("start-marker")).toHaveCount(1);

  // Bottom of the outer ring: a quarter of the way around (SVG circles start at 3 o'clock).
  const bottom = await page.evaluate(() => {
    const root = document.querySelector('[data-testid="preview"]')?.shadowRoot;
    const circle = root?.querySelector('[data-sk-id="sk-0"]') as SVGCircleElement;
    const matrix = circle.getScreenCTM() as DOMMatrix;
    const point = new DOMPoint(60, 104).matrixTransform(matrix);
    return { x: point.x, y: point.y };
  });
  await page.mouse.click(bottom.x, bottom.y);

  await expect
    .poll(async () => {
      const offset = /stroke-dashoffset: (-[\d.]+);/.exec(await previewStyle(page))?.[1];
      return offset === undefined ? null : Number(offset);
    })
    .toBeCloseTo(-0.25, 2);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "Escolher no preview" })).toHaveAttribute(
    "aria-pressed",
    "false",
  );
  // The marker stays where the animation starts.
  await expect(page.getByTestId("start-marker")).toHaveCount(1);
  const spinbutton = page.getByRole("spinbutton", { name: "Ponto de partida" });
  expect(Number(await spinbutton.inputValue())).toBeCloseTo(25, 0);
});

test("start point and direction: video frames match the CSS preview", async ({ page }) => {
  await page.goto("/editor");
  await loadExample(page, "Anel");
  await page.getByRole("button", { name: "Todas" }).click();
  await page.getByRole("spinbutton", { name: "Ponto de partida" }).fill("30");
  await page.getByRole("switch", { name: "Inverter sentido" }).click();
  await expect
    .poll(async () => (await readDraft(page))?.spec)
    .toMatchObject({
      layers: { "sk-0": { start: 0.3, reverse: true } },
    });
  const draft = await readDraft(page);
  if (!draft) throw new Error("no draft");
  const compiled = compile(importSvg(draft.svg, { parser }).document, parseSpec(draft.spec));

  for (const time of [0, 300, 750, 1200, 1600]) {
    const browser = await page.evaluate((t) => {
      const root = document.querySelector('[data-testid="preview"]')?.shadowRoot;
      for (const animation of root?.getAnimations() ?? []) {
        animation.pause();
        animation.currentTime = t;
      }
      const element = root?.querySelector('[data-sk-id="sk-0"]') as Element;
      const style = getComputedStyle(element);
      return {
        dasharray: style.strokeDasharray.split(/[\s,]+/).map((value) => Number.parseFloat(value)),
        dashoffset: Number.parseFloat(style.strokeDashoffset),
      };
    }, time);
    const core = sampleAnimation(compiled, time).get("sk-0") ?? {};
    const dasharray = (core["stroke-dasharray"] ?? "").split(" ").map(Number);
    expect(browser.dasharray[0], `dash @${time}ms`).toBeCloseTo(dasharray[0] ?? Number.NaN, 2);
    expect(browser.dasharray[1], `gap @${time}ms`).toBeCloseTo(dasharray[1] ?? Number.NaN, 2);
    expect(browser.dashoffset, `offset @${time}ms`).toBeCloseTo(
      Number(core["stroke-dashoffset"]),
      2,
    );
  }
});

test("edit the SVG markup: the change shows up and the preset is kept", async ({ page }) => {
  await page.goto("/editor");
  await loadExample(page, "Anel");
  await page.getByRole("button", { name: /^Cometa [A-Z]/ }).click();
  await page.getByRole("button", { name: "Editar SVG" }).click();
  const markup = page.getByRole("textbox", { name: "Markup do SVG" });
  await expect(markup).toHaveValue(/<circle cx="60" cy="60" r="44"/);
  await expect(markup).not.toHaveValue(/data-sk-id/);
  await markup.fill((await markup.inputValue()).replaceAll("#111111", "#0ea5e9"));
  await page.getByRole("button", { name: "Aplicar" }).click();

  await expect(page.getByText("SVG atualizado")).toBeVisible();
  await expect(page.getByTestId("export-code")).toContainText("var(--sk-stroke, #0ea5e9)");
  await expect(page.getByRole("button", { name: /sk-0, Cometa/ })).toBeVisible();

  // Anything unsafe is still sanitized away.
  await page.getByRole("button", { name: "Editar SVG" }).click();
  await markup.fill(
    (await markup.inputValue()).replace("</svg>", "<script>alert(1)</script></svg>"),
  );
  await page.getByRole("button", { name: "Aplicar" }).click();
  await expect(page.getByTestId("export-code")).not.toContainText("script");
});
