import { expect, test } from "@playwright/test";

test("home loads", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle("strokekit");
  await expect(page.getByRole("heading", { name: "strokekit" })).toBeVisible();
});

test("editor route loads", async ({ page }) => {
  await page.goto("/editor");
  await expect(page.getByRole("heading", { name: "Editor" })).toBeVisible();
});
