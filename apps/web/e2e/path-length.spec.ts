import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { expect, type Page, test } from "@playwright/test";
import { applyPreset, compile, createEmptySpec, exporters, importSvg } from "@strokekit/core";
import { DOMParser } from "linkedom";

/**
 * Spike (ROADMAP Fase 1, ARCHITECTURE §6): does `pathLength="1"` normalize dashes on every
 * basic shape? If a browser ignored it, `stroke-dasharray: 1 1` would be read in user units
 * and the shape would render dashed at t=0 and at the end, which these ink counts catch.
 */

const parser = new DOMParser() as unknown as Parameters<typeof importSvg>[1]["parser"];

const SHAPES: Record<string, string> = {
  rect: '<rect x="20" y="20" width="160" height="110" rx="12"/>',
  circle: '<circle cx="100" cy="75" r="55"/>',
  ellipse: '<ellipse cx="100" cy="75" rx="80" ry="50"/>',
  line: '<line x1="20" y1="130" x2="180" y2="20"/>',
  polyline: '<polyline points="20,130 70,20 120,130 180,20"/>',
  polygon: '<polygon points="100,15 185,135 15,135"/>',
  path: '<path d="M20 75 C 60 -10, 140 160, 180 75"/>',
};

const DURATION = 1000;

function source(shape: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 150" width="400" height="300"><g fill="none" stroke="#000" stroke-width="6">${shape}</g></svg>`;
}

function animated(shape: string, iterations: number | "infinite" = 1): string {
  const { document } = importSvg(source(shape), { parser });
  const spec = applyPreset(createEmptySpec(), ["sk-0"], "draw");
  const track = spec.tracks[0];
  if (track) track.timing = { ...track.timing, duration: DURATION, easing: "linear", iterations };
  return exporters.css(compile(document, spec));
}

function page(svg: string): string {
  return `<!doctype html><html><body style="margin:0;background:#fff">${svg}</body></html>`;
}

/** Dark pixels in the SVG, decoded in the browser itself (no image dependency). */
async function ink(page: Page): Promise<number> {
  const png = await page.locator("svg").screenshot();
  return page.evaluate(async (base64) => {
    const image = new Image();
    image.src = `data:image/png;base64,${base64}`;
    await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = image.width;
    canvas.height = image.height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("no 2d context");
    context.drawImage(image, 0, 0);
    const { data } = context.getImageData(0, 0, canvas.width, canvas.height);
    let count = 0;
    for (let i = 0; i < data.length; i += 4) {
      if ((data[i] ?? 255) + (data[i + 1] ?? 255) + (data[i + 2] ?? 255) < 384) count++;
    }
    return count;
  }, png.toString("base64"));
}

async function seek(page: Page, time: number): Promise<void> {
  await page.evaluate((currentTime) => {
    for (const animation of document.getAnimations()) {
      animation.pause();
      animation.currentTime = currentTime;
    }
  }, time);
}

test.describe("pathLength spike", () => {
  test.beforeAll(({ browserName }) => {
    if (browserName !== "chromium") return;
    // Looping gallery for a manual check in a real Safari: open e2e/.spike/index.html.
    const dir = join(import.meta.dirname, ".spike");
    mkdirSync(dir, { recursive: true });
    const cells = Object.entries(SHAPES)
      .map(
        ([name, shape]) =>
          `<figure style="margin:0"><figcaption>${name}</figcaption>${animated(shape, "infinite")}${source(shape)}</figure>`,
      )
      .join("");
    writeFileSync(
      join(dir, "index.html"),
      `<!doctype html><meta charset="utf-8"><title>pathLength spike</title><style>svg{width:200px;height:150px;border:1px solid #ddd}figure{display:inline-block;margin:8px!important}</style><p>Esquerda: animação exportada (loop). Direita: SVG original. No fim de cada ciclo a esquerda deve ficar idêntica à direita, sem tracejado.</p>${cells}`,
    );
  });

  for (const [name, shape] of Object.entries(SHAPES)) {
    test(`draw on <${name}> normalizes dashes`, async ({ page: browserPage }) => {
      await browserPage.setContent(page(source(shape)));
      const reference = await ink(browserPage);
      expect(reference).toBeGreaterThan(500);

      await browserPage.setContent(page(animated(shape)));
      await seek(browserPage, 0);
      expect(await ink(browserPage), "nothing is drawn at t=0").toBeLessThan(reference * 0.02);

      await seek(browserPage, DURATION / 2);
      const half = (await ink(browserPage)) / reference;
      expect(half, "about half is drawn at 50%").toBeGreaterThan(0.3);
      expect(half).toBeLessThan(0.7);

      await seek(browserPage, DURATION);
      const end = (await ink(browserPage)) / reference;
      expect(end, "the full shape is drawn at the end").toBeGreaterThan(0.97);
      expect(end).toBeLessThan(1.03);
    });
  }
});
