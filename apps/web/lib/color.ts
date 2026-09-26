/**
 * `#rrggbb` for `<input type="color">`, which accepts nothing else. Other syntaxes (names,
 * `rgb()`, `hsl()`…) are normalized by the browser through a canvas; `null` when impossible.
 */
export function toHexColor(color: string | undefined): string | null {
  if (!color) return null;
  const value = color.trim();
  if (/^#[0-9a-f]{6}$/i.test(value)) return value.toLowerCase();
  const short = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/i.exec(value);
  if (short)
    return `#${short
      .slice(1)
      .map((digit) => digit.repeat(2))
      .join("")}`.toLowerCase();
  if (typeof document === "undefined") return null;
  let context: CanvasRenderingContext2D | null = null;
  try {
    context = document.createElement("canvas").getContext("2d");
  } catch {
    return null;
  }
  if (!context) return null;
  context.fillStyle = "#000000";
  context.fillStyle = value;
  const normalized = String(context.fillStyle);
  return /^#[0-9a-f]{6}$/i.test(normalized) ? normalized.toLowerCase() : null;
}
