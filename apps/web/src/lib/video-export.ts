import { type CompiledAnimation, renderFrame } from "@strokit/core";

export type VideoOptions = {
  /** Output size in pixels (even numbers, as VP9 requires). */
  width: number;
  height: number;
  fps: 30 | 60;
  durationMs: number;
  /** Overrides `--sk-stroke`; undefined keeps the original colors. */
  strokeColor?: string;
};

export type VideoProgress = (fraction: number) => void;

export const MAX_VIDEO_SIZE = 2048;

export function even(value: number): number {
  return Math.max(2, Math.round(value / 2) * 2);
}

/** Output size for a given width, keeping the SVG's aspect ratio. */
export function videoSize(
  viewBox: readonly number[],
  width: number,
): { width: number; height: number } {
  const w = even(Math.min(MAX_VIDEO_SIZE, Math.max(64, width)));
  const [, , vw = 1, vh = 1] = viewBox;
  return { width: w, height: even(Math.min(MAX_VIDEO_SIZE, (w * vh) / vw)) };
}

/**
 * True when this browser can encode VP9 with an alpha channel (verified in Chromium, Firefox and
 * WebKit test builds; depends on WebCodecs).
 * The check runs WebCodecs' own capability test through Mediabunny.
 */
export async function canExportTransparentVideo(width = 1080, height = 1080): Promise<boolean> {
  if (typeof window === "undefined" || typeof window.VideoEncoder === "undefined") return false;
  try {
    const { canEncodeVideo, QUALITY_HIGH } = await import("mediabunny");
    return await canEncodeVideo("vp9", { width, height, quality: QUALITY_HIGH, alpha: "keep" });
  } catch {
    return false;
  }
}

async function drawSvg(
  context: CanvasRenderingContext2D,
  svg: string,
  width: number,
  height: number,
) {
  const image = new Image(width, height);
  image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  await image.decode();
  context.clearRect(0, 0, width, height);
  context.drawImage(image, 0, 0, width, height);
}

/**
 * Renders every frame deterministically with `renderFrame()` (no screen recording), draws it on a
 * transparent canvas and encodes a VP9 + alpha WebM entirely in the browser.
 */
export async function exportTransparentVideo(
  compiled: CompiledAnimation,
  options: VideoOptions,
  { onProgress, signal }: { onProgress?: VideoProgress; signal?: AbortSignal } = {},
): Promise<Blob> {
  const { BufferTarget, CanvasSource, Output, QUALITY_HIGH, WebMOutputFormat } = await import(
    "mediabunny"
  );
  const { width, height, fps, durationMs, strokeColor } = options;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { alpha: true });
  if (!context) throw new Error("Canvas 2D indisponível.");

  const output = new Output({ format: new WebMOutputFormat(), target: new BufferTarget() });
  const source = new CanvasSource(canvas, { codec: "vp9", quality: QUALITY_HIGH, alpha: "keep" });
  output.addVideoTrack(source, { frameRate: fps });
  await output.start();

  const frames = Math.max(1, Math.round((durationMs / 1000) * fps));
  for (let index = 0; index < frames; index++) {
    if (signal?.aborted) {
      await output.cancel();
      throw new DOMException("Exportação cancelada.", "AbortError");
    }
    const time = (index * 1000) / fps;
    const svg = renderFrame(compiled, time, {
      width,
      height,
      ...(strokeColor ? { strokeColor } : {}),
    });
    await drawSvg(context, svg, width, height);
    await source.add(index / fps, 1 / fps);
    onProgress?.((index + 1) / frames);
  }

  await output.finalize();
  const buffer = output.target.buffer;
  if (!buffer) throw new Error("O vídeo não foi gerado.");
  return new Blob([buffer], { type: "video/webm" });
}
