import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { loadExample } from "./helpers";

const hasFfmpeg = spawnSync("ffmpeg", ["-version"]).status === 0;

/** WebM track with alpha: Matroska `AlphaMode` element (ID 0x53C0) set to 1. */
function hasAlphaMode(buffer: Buffer): boolean {
  return buffer.includes(Buffer.from([0x53, 0xc0, 0x81, 0x01]));
}

test("exports a transparent .webm", async ({ page }) => {
  await page.goto("/editor");
  await loadExample(page, "Anel");
  await page.getByRole("button", { name: "Vídeo", exact: true }).click();
  await page.getByRole("spinbutton", { name: "Largura" }).fill("320");
  await page.getByRole("spinbutton", { name: "Duração" }).fill("1");
  await page.getByRole("radio", { name: "30" }).click();

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Exportar .webm" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("anel.webm");
  const path = await download.path();
  const buffer = readFileSync(path);

  expect(buffer.subarray(0, 4)).toEqual(Buffer.from([0x1a, 0x45, 0xdf, 0xa3])); // EBML
  expect(buffer.includes(Buffer.from("webm"))).toBe(true);
  expect(buffer.includes(Buffer.from("V_VP9"))).toBe(true);
  expect(hasAlphaMode(buffer)).toBe(true);
  await expect(page.getByText("Vídeo exportado")).toBeVisible();

  if (!hasFfmpeg) return;
  const probe = spawnSync(
    "ffprobe",
    [
      "-v",
      "error",
      "-count_frames",
      "-select_streams",
      "v:0",
      "-show_entries",
      "stream=width,height,nb_read_frames",
      "-of",
      "csv=p=0",
      path,
    ],
    { encoding: "utf8" },
  );
  expect(probe.stdout.trim()).toBe("320,320,30");
  // Decode frame 15 (mid-animation) with libvpx, which reads the alpha side data, into raw RGBA.
  const frame = spawnSync("ffmpeg", [
    "-v",
    "error",
    "-c:v",
    "libvpx-vp9",
    "-i",
    path,
    "-vf",
    "select=eq(n\\,15)",
    "-frames:v",
    "1",
    "-f",
    "rawvideo",
    "-pix_fmt",
    "rgba",
    "-",
  ]);
  expect(frame.status).toBe(0);
  const rgba = frame.stdout;
  expect(rgba.length).toBe(320 * 320 * 4);
  const alphaAt = (x: number, y: number) => rgba[(y * 320 + x) * 4 + 3] ?? -1;
  // Corner: transparent background (VP9 compresses alpha lossily, so allow a few levels).
  expect(alphaAt(2, 2)).toBeLessThanOrEqual(8);
  let opaque = 0;
  for (let i = 3; i < rgba.length; i += 4) if ((rgba[i] ?? 0) > 200) opaque++;
  expect(opaque).toBeGreaterThan(200); // the stroke is solid
});

test("browsers that cannot encode transparent VP9 get a clear notice", async ({ page }) => {
  // Simulates a browser without WebCodecs.
  await page.addInitScript(() => {
    Reflect.deleteProperty(window, "VideoEncoder");
  });
  await page.goto("/editor");
  await loadExample(page, "Anel");
  await page.getByRole("button", { name: "Vídeo", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText(
    "não consegue gravar vídeo com transparência",
  );
  await expect(page.getByRole("button", { name: "Exportar .webm" })).toBeDisabled();
});
