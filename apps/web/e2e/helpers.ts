import { expect, type Page } from "@playwright/test";

export async function loadExample(page: Page, name: string) {
  await page.getByRole("button", { name: "Exemplos" }).first().click();
  await page.getByRole("menuitem", { name: new RegExp(name) }).click();
  await expect(page.getByRole("button", { name: /sk-0/ })).toBeVisible();
}

/** Sidebar sections are collapsible: open one (idempotent) before using its fields. */
export async function openSection(page: Page, title: "Preset" | "Animação" | "Geral") {
  const trigger = page.getByRole("button", { name: new RegExp(`^${title}`) });
  if ((await trigger.getAttribute("aria-expanded")) !== "true") await trigger.click();
  await expect(trigger).toHaveAttribute("aria-expanded", "true");
}

/** The draft the editor keeps in localStorage (parsed), or null. */
export async function readDraft(page: Page): Promise<{
  svg: string;
  spec: { tracks: { preset: string; timing: { duration: number } }[] };
} | null> {
  return page.evaluate(() => {
    const raw = window.localStorage.getItem("strokit:draft");
    return raw ? JSON.parse(raw) : null;
  });
}

/** Replaces the clipboard with a recorder (works in every engine); read it back with `copiedText`. */
export async function captureClipboard(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const store = window as unknown as { __copied?: string };
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async (text: string) => {
          store.__copied = text;
        },
      },
    });
  });
}

export async function copiedText(page: Page): Promise<string | undefined> {
  return page.evaluate(() => (window as unknown as { __copied?: string }).__copied);
}
