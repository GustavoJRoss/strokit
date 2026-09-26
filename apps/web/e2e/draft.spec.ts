import { expect, test } from "@playwright/test";
import { encodeShare } from "@strokit/core";
import { loadExample, openSection, readDraft } from "./helpers";

test("editing keeps the URL clean; reloading restores the draft", async ({ page }) => {
  await page.goto("/editor");
  await loadExample(page, "Pico");
  await openSection(page, "Animação");
  await page.getByRole("spinbutton", { name: "Duração" }).fill("3100");
  await expect
    .poll(async () => (await readDraft(page))?.spec.tracks[0]?.timing.duration)
    .toBe(3100);
  expect(page.url()).toMatch(/\/editor$/);

  await page.reload();
  await expect(page.getByText("Trabalho anterior restaurado")).toBeVisible();
  await expect(page.getByRole("button", { name: /sk-0/ })).toBeVisible();
  await expect(page.getByTestId("export-code")).toContainText("3100ms");
  expect(page.url()).toMatch(/\/editor$/);
});

test("'Começar do zero' clears the draft", async ({ page }) => {
  await page.goto("/editor");
  await loadExample(page, "Anel");
  await expect.poll(() => readDraft(page)).not.toBeNull();
  await page.reload();
  await page.getByRole("button", { name: "Começar do zero" }).click();
  await expect(page.getByRole("heading", { name: "Arraste a sua logo SVG para cá" })).toBeVisible();
  await expect.poll(() => readDraft(page)).toBeNull();
  await page.reload();
  await expect(page.getByRole("heading", { name: "Arraste a sua logo SVG para cá" })).toBeVisible();
});

test("a #s= link wins over the draft and the hash is removed", async ({ page }) => {
  await page.goto("/editor");
  await loadExample(page, "Anel");
  await expect.poll(() => readDraft(page)).not.toBeNull();

  const draft = await readDraft(page);
  const spec = JSON.parse(JSON.stringify(draft?.spec));
  spec.name = "Vindo do link";
  spec.tracks[0].timing.duration = 777;
  const hash = `#s=${encodeShare({ svg: draft?.svg ?? "", spec })}`;
  // Arrive from elsewhere, as someone opening a shared link does (a hash-only change doesn't reload).
  await page.goto("about:blank");
  await page.goto(`/editor${hash}`);
  await expect(page.getByTestId("export-code")).toContainText("777ms");
  await expect.poll(() => new URL(page.url()).hash).toBe("");
  await expect(page.getByText("Trabalho anterior restaurado")).toHaveCount(0);
});

test("a corrupted draft is ignored", async ({ page }) => {
  await page.goto("/editor");
  await page.evaluate(() =>
    window.localStorage.setItem(
      "strokit:draft",
      '{"version":1,"svg":"<svg/>","spec":{"version":9}}',
    ),
  );
  await page.reload();
  await expect(page.getByRole("heading", { name: "Arraste a sua logo SVG para cá" })).toBeVisible();
});
