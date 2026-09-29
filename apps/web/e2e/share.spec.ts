import { readFileSync } from "node:fs";
import { expect, type Page, test } from "@playwright/test";
import { captureClipboard, copiedText, loadExample, openSection, readDraft } from "./helpers";

async function exportedCss(page: Page) {
  await page.getByRole("tab", { name: "CSS" }).click();
  return page.getByTestId("export-code").textContent();
}

test("share link: create → copy link → open in a new tab → identical state (acceptance)", async ({
  page,
  context,
}) => {
  await captureClipboard(page);
  await page.goto("/editor");
  await loadExample(page, "Onda");
  await page.getByRole("button", { name: /Vai e vem/ }).click();
  await openSection(page, "Animação");
  await page.getByRole("spinbutton", { name: "Duração" }).fill("2400");
  await expect(page.getByTestId("export-code")).toContainText("2400ms");
  // Edits are saved as a local draft (debounced); the address bar stays clean.
  await expect
    .poll(async () => (await readDraft(page))?.spec.tracks[0]?.timing.duration)
    .toBe(2400);
  expect(new URL(page.url()).hash).toBe("");
  const before = await exportedCss(page);

  await page.getByRole("button", { name: "Compartilhar" }).click();
  await page.getByRole("menuitem", { name: "Copiar link" }).click();
  await expect(page.getByText("Link copiado")).toBeVisible();
  const url = await copiedText(page);
  expect(url).toMatch(/\/editor#s=/);
  expect(new URL(page.url()).hash).toBe("");

  const other = await context.newPage();
  await other.goto(url ?? "");
  await expect(other.getByRole("button", { name: /sk-0, Vai e vem/ })).toBeVisible();
  expect(await exportedCss(other)).toBe(before);
  // Opening a link loads it and cleans the address bar.
  await expect.poll(() => new URL(other.url()).hash).toBe("");
});

test("a broken link shows a friendly error and an empty editor", async ({ page }) => {
  await page.goto("/editor#s=isto-nao-e-um-link");
  await expect(page.getByText("O link está incompleto ou corrompido.")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Arraste a sua logo SVG para cá" })).toBeVisible();
});

test("project file: download .strokit.json and open it again", async ({ page, browser }) => {
  await page.goto("/editor");
  await loadExample(page, "Pico");
  await page.getByRole("button", { name: /Cometa/ }).click();
  const before = await exportedCss(page);

  await page.getByRole("button", { name: "Compartilhar" }).click();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("menuitem", { name: /Baixar projeto/ }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("pico.strokit.json");
  const buffer = readFileSync(await download.path());

  const fresh = await (await browser.newContext()).newPage();
  await fresh.goto("/editor");
  await fresh
    .getByTestId("project-input")
    .setInputFiles({ name: download.suggestedFilename(), mimeType: "application/json", buffer });
  await expect(fresh.getByRole("button", { name: /sk-0, Cometa/ })).toBeVisible();
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
  await expect.poll(() => readDraft(page)).not.toBeNull();
  const draft = await readDraft(page);
  const buffer = Buffer.from(
    JSON.stringify({ format: "strokit", version: 1, svg: draft?.svg, spec: draft?.spec }),
  );
  // Start from an empty editor so the import below is what brings the animation back.
  await page.evaluate(() => window.localStorage.clear());
  await page.goto("/editor");
  await expect(page.getByRole("heading", { name: "Arraste a sua logo SVG para cá" })).toBeVisible();
  await page
    .getByTestId("file-input")
    .first()
    .setInputFiles({ name: "download", mimeType: "", buffer });
  await expect(page.getByRole("button", { name: /sk-0, Desenhar/ })).toBeVisible();
});
