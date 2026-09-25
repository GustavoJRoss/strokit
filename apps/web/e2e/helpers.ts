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
