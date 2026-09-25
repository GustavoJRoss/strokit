import { expect, test } from "@playwright/test";

test("home loads", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle("strokit");
  await expect(page.getByRole("heading", { name: "strokit" })).toBeVisible();
});

test("editor route loads", async ({ page }) => {
  await page.goto("/editor");
  await expect(page.getByRole("heading", { name: "Arraste a sua logo SVG para cá" })).toBeVisible();
});
