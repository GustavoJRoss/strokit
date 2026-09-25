import { readFileSync } from "node:fs";
import { expect, type Page, test } from "@playwright/test";
import { decodeShare } from "@strokekit/core";

async function loadExample(page: Page, name: string) {
  await page.getByRole("button", { name: "Exemplos" }).first().click();
  await page.getByRole("menuitem", { name: new RegExp(name) }).click();
  await expect(page.getByRole("button", { name: /sk-0/ })).toBeVisible();
}

async function exportedCss(page: Page) {
  await page.getByRole("tab", { name: "CSS" }).click();
  return page.getByTestId("export-code").textContent();
}

test("share link: create → copy link → open in a new tab → identical state (acceptance)", async ({
  page,
  context,
}) => {
  await page.goto("/editor");
  await loadExample(page, "Onda");
  await page.getByRole("button", { name: /Vai e vem/ }).click();
  await page.getByRole("spinbutton", { name: "Duração" }).fill("2400");
  await expect(page.getByTestId("export-code")).toContainText("2400ms");
  // The hash follows edits with a 300ms debounce: wait until it carries the last one.
  await expect
    .poll(() => {
      const { hash } = new URL(page.url());
      return hash ? decodeShare(hash).spec.tracks[0]?.timing.duration : null;
    })
    .toBe(2400);
  const before = await exportedCss(page);

  const url = page.url();
  const other = await context.newPage();
  await other.goto(url);
  await expect(other.getByRole("button", { name: /sk-0/ })).toBeVisible();
  expect(await exportedCss(other)).toBe(before);
  await expect(other.getByRole("button", { name: /sk-0, Vai e vem/ })).toBeVisible();
});

test("a broken link shows a friendly error and an empty editor", async ({ page }) => {
  await page.goto("/editor#s=isto-nao-e-um-link");
  await expect(page.getByText("O link está incompleto ou corrompido.")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Arraste a sua logo SVG para cá" })).toBeVisible();
});

test("project file: download .strokekit.json and open it again", async ({ page, browser }) => {
  await page.goto("/editor");
  await loadExample(page, "Pico");
  await page.getByRole("button", { name: /Desenhar e preencher/ }).click();
  const before = await exportedCss(page);

  await page.getByRole("button", { name: "Compartilhar" }).click();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("menuitem", { name: /Baixar projeto/ }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("pico.strokekit.json");
  const buffer = readFileSync(await download.path());

  const fresh = await (await browser.newContext()).newPage();
  await fresh.goto("/editor");
  await fresh
    .getByTestId("project-input")
    .setInputFiles({ name: download.suggestedFilename(), mimeType: "application/json", buffer });
  await expect(fresh.getByRole("button", { name: /sk-0, Desenhar e preencher/ })).toBeVisible();
  expect(await exportedCss(fresh)).toBe(before);
});

test("React and Motion tabs export components named after the animation", async ({ page }) => {
  await page.goto("/editor");
  await loadExample(page, "Órbita");
  const code = page.getByTestId("export-code");
  await page.getByRole("tab", { name: "React" }).click();
  await expect(code).toContainText("export function OrbitaLogo(");
  await expect(code).toContainText("var(--sk-speed, 1)");
  await expect(page.getByRole("button", { name: "Baixar .tsx" })).toBeVisible();
  await page.getByRole("tab", { name: "Motion" }).click();
  await expect(code).toContainText('from "motion/react"');
  await expect(code).toContainText("useAnimate");
});

test("exported components run in this Next app (acceptance)", async ({ page }) => {
  await page.goto("/exemplos");
  for (const id of ["orbita-react", "onda-react"]) {
    const running = await page
      .getByTestId(id)
      .evaluate(
        (card) =>
          card.getAnimations({ subtree: true }).filter((a) => a.playState === "running").length,
      );
    expect(running, `${id} has running CSS animations`).toBeGreaterThan(0);
  }
  for (const id of ["pico-motion", "orbita-motion"]) {
    const read = () =>
      page.getByTestId(id).evaluate((card) => {
        const element = card.querySelector('svg [class$="-1"]');
        return element ? getComputedStyle(element).strokeDashoffset : null;
      });
    const first = await read();
    await expect.poll(read, { message: `${id} is animated by Motion` }).not.toBe(first);
  }
  await expect(page.getByTestId("pico-motion").getByRole("status")).toContainText("Carregando");
});

test("a project file without extension is still recognized by its content", async ({ page }) => {
  await page.goto("/editor");
  await loadExample(page, "Onda");
  await expect.poll(() => new URL(page.url()).hash).toMatch(/^#s=/);
  const project = new URL(page.url()).hash;
  const { svg, spec } = decodeShare(project);
  const buffer = Buffer.from(JSON.stringify({ format: "strokekit", version: 1, svg, spec }));
  await page.goto("/editor");
  await page
    .getByTestId("file-input")
    .first()
    .setInputFiles({ name: "download", mimeType: "", buffer });
  await expect(page.getByRole("button", { name: /sk-0, Desenhar/ })).toBeVisible();
});
