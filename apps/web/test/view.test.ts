import { describe, expect, it } from "vitest";
import {
  CENTERED,
  clampScale,
  isCentered,
  MAX_SCALE,
  MIN_SCALE,
  panBy,
  wheelZoomFactor,
  zoomAt,
} from "@/lib/view";

describe("view", () => {
  it("starts centered and knows when it is not", () => {
    expect(isCentered(CENTERED)).toBe(true);
    expect(isCentered({ x: 1, y: 0, scale: 1 })).toBe(false);
    expect(isCentered({ x: 0, y: 0, scale: 1.25 })).toBe(false);
  });

  it("pans without touching the zoom", () => {
    expect(panBy({ x: 10, y: 5, scale: 2 }, -4, 3)).toEqual({ x: 6, y: 8, scale: 2 });
  });

  it("zooms around a point, which stays under the cursor", () => {
    const view = { x: 30, y: -20, scale: 1.5 };
    const next = zoomAt(view, 2, 200, 120);
    // A canvas point under (200, 120) before and after: (screen - offset) / scale.
    const before = [(200 - view.x) / view.scale, (120 - view.y) / view.scale];
    const after = [(200 - next.x) / next.scale, (120 - next.y) / next.scale];
    expect(next.scale).toBe(3);
    expect(after[0]).toBeCloseTo(before[0] as number);
    expect(after[1]).toBeCloseTo(before[1] as number);
  });

  it("zooming at the origin of a centered view only scales it", () => {
    expect(zoomAt(CENTERED, 2, 0, 0)).toEqual({ x: 0, y: 0, scale: 2 });
  });

  it("clamps the zoom and returns the same view at the limits", () => {
    expect(clampScale(100)).toBe(MAX_SCALE);
    expect(clampScale(0)).toBe(MIN_SCALE);
    expect(zoomAt({ x: 5, y: 5, scale: MAX_SCALE }, 2, 10, 10)).toEqual({
      x: 5,
      y: 5,
      scale: MAX_SCALE,
    });
    expect(zoomAt(CENTERED, 1000, 0, 0).scale).toBe(MAX_SCALE);
  });

  it("turns wheel deltas into zoom: up zooms in, down zooms out", () => {
    expect(wheelZoomFactor(-100, 0, false)).toBeGreaterThan(1);
    expect(wheelZoomFactor(100, 0, false)).toBeLessThan(1);
    expect(wheelZoomFactor(0, 0, false)).toBe(1);
    // Pinch deltas are small but weigh more; Firefox line deltas are scaled to pixels.
    expect(wheelZoomFactor(-5, 0, true)).toBeGreaterThan(wheelZoomFactor(-5, 0, false));
    expect(wheelZoomFactor(-3, 1, false)).toBeCloseTo(wheelZoomFactor(-99, 0, false));
  });
});
