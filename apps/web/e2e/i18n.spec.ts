import { expect, test } from "@playwright/test";

test.describe("browser language", () => {
  test.describe("English browser", () => {
    test.use({ locale: "en-US" });

    test("opens the home and the editor in English", async ({ page }) => {
      await page.goto("/");
      await expect(
        page.getByRole("heading", { level: 1, name: "Your logo in motion. In code." }),
      ).toBeVisible();
      await expect(page.locator("html")).toHaveAttribute("lang", "en");
      await expect(page).toHaveTitle("strokit — animate your SVG logo and export code");
      await page.goto("/editor");
      await expect(page.getByRole("heading", { name: "Drop your SVG logo here" })).toBeVisible();
      await expect(page.getByRole("button", { name: "Import SVG" }).first()).toBeVisible();
    });

    test("errors come in English too", async ({ page }) => {
      await page.goto("/editor#s=not-a-link");
      await expect(page.getByText("The link is incomplete or corrupted.")).toBeVisible();
    });
  });

  test.describe("Spanish browser", () => {
    test.use({ locale: "es-ES" });

    test("opens in Spanish, including preset names and examples", async ({ page }) => {
      await page.goto("/editor");
      await expect(page.getByRole("heading", { name: "Arrastra tu logo SVG aquí" })).toBeVisible();
      await page.getByRole("button", { name: "Ejemplos" }).first().click();
      await page.getByRole("menuitem", { name: /Anillo/ }).click();
      await expect(page.getByRole("button", { name: /sk-0, Dibujar/ })).toBeVisible();
      await expect(page.getByRole("button", { name: /^Dibujar y rellenar/ })).toBeVisible();
      await expect(page.locator("html")).toHaveAttribute("lang", "es");
    });
  });

  test.describe("unsupported browser language", () => {
    test.use({ locale: "de-DE" });

    test("falls back to English", async ({ page }) => {
      await page.goto("/");
      await expect(
        page.getByRole("heading", { level: 1, name: "Your logo in motion. In code." }),
      ).toBeVisible();
    });
  });
});

test("the switcher changes the language instantly and remembers it", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("lang", "pt-BR");
  await page.getByRole("button", { name: "Idioma" }).click();
  await page.getByRole("menuitemradio", { name: "Español" }).click();
  await expect(
    page.getByRole("heading", { level: 1, name: "Tu logo en movimiento. En código." }),
  ).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang", "es");

  await page.reload();
  await expect(
    page.getByRole("heading", { level: 1, name: "Tu logo en movimiento. En código." }),
  ).toBeVisible();

  await page.goto("/editor");
  // Still in Spanish here.
  await page.getByRole("button", { name: "Ejemplos" }).first().click();
  await page.getByRole("menuitem", { name: /Onda/ }).click();
  await expect(page.getByRole("button", { name: /sk-0, Dibujar/ })).toBeVisible();
  await page.getByRole("button", { name: "Idioma" }).click();
  await page.getByRole("menuitemradio", { name: "English" }).click();
  await expect(page.getByRole("button", { name: /^Back and forth/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /sk-0, Draw/ })).toBeVisible();
  await expect(page.getByRole("tab", { name: "CSS" })).toBeVisible();
  await expect(
    page
      .getByRole("button", { name: "Show code" })
      .or(page.getByRole("button", { name: "Collapse code" })),
  ).toBeVisible();
});
