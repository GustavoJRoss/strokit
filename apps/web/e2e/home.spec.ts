import { existsSync } from "node:fs";
import { join } from "node:path";
import { expect, type Page, test } from "@playwright/test";

const publicDir = join(import.meta.dirname, "..", "public");

const background = (page: Page) =>
  page.evaluate(() => getComputedStyle(document.body).backgroundColor);

/** Scrolls every reveal block into view, then reports the ones not fully shown. */
async function hiddenAfterScrolling(page: Page) {
  return page.evaluate(async () => {
    const blocks = [...document.querySelectorAll<HTMLElement>("[data-reveal]")];
    for (const block of blocks) {
      block.scrollIntoView({ block: "center" });
      await new Promise((resolve) => setTimeout(resolve, 30));
    }
    await new Promise((resolve) => setTimeout(resolve, 900));
    return blocks
      .filter((block) => {
        const style = getComputedStyle(block);
        return style.opacity !== "1" || style.transform !== "none";
      })
      .map((block) => block.textContent?.slice(0, 40));
  });
}

test.describe("theme", () => {
  test("follows the system: pure white in light, pure black in dark", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "light" });
    await page.goto("/");
    expect(await background(page)).toBe("rgb(255, 255, 255)");
    await page.emulateMedia({ colorScheme: "dark" });
    await expect.poll(() => background(page)).toBe("rgb(0, 0, 0)");
  });

  test("the toggle overrides the system and is remembered", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "light" });
    await page.goto("/");
    await page.getByRole("radio", { name: "Tema escuro" }).click();
    await expect.poll(() => background(page)).toBe("rgb(0, 0, 0)");
    await page.reload();
    await expect.poll(() => background(page)).toBe("rgb(0, 0, 0)");
    await page.goto("/editor");
    await expect.poll(() => background(page)).toBe("rgb(0, 0, 0)");
  });
});

test.describe("reveal from the sides", () => {
  test("every block ends fully visible after scrolling", async ({ page }) => {
    await page.goto("/");
    // Scroll everything into view once, then wait (instead of a fixed delay) for the transitions.
    await hiddenAfterScrolling(page);
    await expect
      .poll(
        () =>
          page.evaluate(
            () =>
              [...document.querySelectorAll<HTMLElement>("[data-reveal]")].filter((block) => {
                const style = getComputedStyle(block);
                return style.opacity !== "1" || style.transform !== "none";
              }).length,
          ),
        { timeout: 10_000 },
      )
      .toBe(0);
  });

  test("blocks start offset to their side before entering the viewport", async ({ page }) => {
    await page.goto("/");
    const offsets = await page.evaluate(() =>
      [...document.querySelectorAll<HTMLElement>("[data-reveal]:not([data-revealed])")]
        .slice(0, 6)
        .map((block) => [
          block.dataset.reveal,
          new DOMMatrix(getComputedStyle(block).transform).m41,
        ]),
    );
    expect(offsets.length).toBeGreaterThan(0);
    for (const [side, x] of offsets) expect(x).toBe(side === "left" ? -64 : 64);
  });

  test("with reduced motion nothing moves", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    const moved = await page.evaluate(
      () =>
        [...document.querySelectorAll<HTMLElement>("[data-reveal]")].filter((block) => {
          const style = getComputedStyle(block);
          return style.opacity !== "1" || style.transform !== "none";
        }).length,
    );
    expect(moved).toBe(0);
  });
});

test.describe("without JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("all content is visible", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: "Gostou? Ajude o strokit a crescer." }),
    ).toBeVisible();
    const hidden = await page
      .locator("[data-reveal]")
      .evaluateAll(
        (blocks) => blocks.filter((block) => getComputedStyle(block).opacity !== "1").length,
      );
    expect(hidden).toBe(0);
  });
});

test("the playground renders exactly the CSS it shows", async ({ page }) => {
  await page.goto("/");
  await page.locator("#playground").scrollIntoViewIfNeeded();
  const preview = page.getByTestId("playground-preview");
  const shownCss = async () => {
    const code = (await page.locator("#playground").getByTestId("export-code").textContent()) ?? "";
    return /<style>([\s\S]*?)<\/style>/.exec(code)?.[1] ?? null;
  };
  const previewCss = () =>
    preview.evaluate((host) => host.shadowRoot?.querySelector("svg > style")?.textContent ?? null);

  await expect.poll(shownCss).toContain("stagger-draw");
  await page.getByRole("radio", { name: "Vai e vem" }).click();
  await expect.poll(shownCss).toContain("-yoyo");
  expect(await previewCss()).toBe(await shownCss());
  await expect(
    page.locator("#playground").getByRole("link", { name: "Abrir no editor" }),
  ).toHaveAttribute("href", /^\/editor#s=/);
});

test.describe("gallery", () => {
  test("every card animates with CSS and links to a real .svg", async ({ page }) => {
    await page.goto("/");
    const cards = page.locator('[data-testid^="gallery-"]');
    await expect(cards).toHaveCount(7);
    for (const card of await cards.all()) {
      const running = await card.evaluate(
        (element) =>
          element.getAnimations({ subtree: true }).filter((a) => a.playState === "running").length,
      );
      expect(running).toBeGreaterThan(0);
      const href = await card.getByRole("link", { name: /Baixar/ }).getAttribute("href");
      expect(href && existsSync(join(publicDir, href))).toBe(true);
    }
  });

  test("speed changes the CSS variable, 'Abrir no editor' restores the animation", async ({
    page,
  }) => {
    await page.goto("/");
    await page.locator("#exemplos").scrollIntoViewIfNeeded();
    await page.getByRole("radio", { name: "2x" }).click();
    const speed = () =>
      page
        .getByTestId("gallery-onda-yoyo")
        .locator("svg")
        .first()
        .evaluate((svg) => (svg as SVGElement).style.getPropertyValue("--sk-speed"));
    await expect.poll(speed).toBe("2");

    await page.getByRole("link", { name: /Abrir Vai e vem \(Onda\) no editor/ }).click();
    await expect(page).toHaveURL(/\/editor/);
    await expect(page.getByRole("button", { name: /sk-0, Vai e vem/ })).toBeVisible();
  });
});

test("the donation button is present and does nothing yet", async ({ page }) => {
  await page.goto("/#apoie");
  const button = page.getByTestId("donate-button");
  await expect(button).toBeVisible();
  const url = page.url();
  await button.click();
  expect(page.url()).toBe(url);
  await expect(page.getByText("Formas de apoio em breve.")).toBeVisible();
});

test("nav anchors lead to their sections", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/");
  for (const [label, id] of [
    ["Como funciona", "como-funciona"],
    ["Exemplos", "exemplos"],
    ["Código", "codigo"],
    ["Apoiar", "apoie"],
  ] as const) {
    await page
      .getByRole("navigation", { name: "Seções" })
      .getByRole("link", { name: label })
      .click();
    await expect(page).toHaveURL(new RegExp(`#${id}$`));
    await expect
      .poll(() =>
        page.locator(`#${id}`).evaluate((el) => Math.round(el.getBoundingClientRect().top)),
      )
      .toBeLessThan(120);
  }
});
