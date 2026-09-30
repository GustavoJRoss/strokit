/**
 * Pan and zoom of the editor canvas. Purely a view of the workspace: never part of the
 * AnimationSpec and never exported. `x`/`y` move the canvas (px, from its top-left corner)
 * and `scale` zooms it; the SVG starts fitted to the workspace, which is `CENTERED`.
 */
export type View = { x: number; y: number; scale: number };

export const CENTERED: View = { x: 0, y: 0, scale: 1 };

export const MIN_SCALE = 0.1;
export const MAX_SCALE = 10;

/** One press of the zoom buttons or keys. */
export const ZOOM_STEP = 1.25;

export function clampScale(scale: number): number {
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale));
}

export function isCentered(view: View): boolean {
  return view.x === 0 && view.y === 0 && view.scale === 1;
}

export function panBy(view: View, dx: number, dy: number): View {
  return { ...view, x: view.x + dx, y: view.y + dy };
}

/** Zooms by `factor` keeping the point (`cx`, `cy`), in workspace px, where it is on screen. */
export function zoomAt(view: View, factor: number, cx: number, cy: number): View {
  const scale = clampScale(view.scale * factor);
  if (scale === view.scale) return view;
  const ratio = scale / view.scale;
  return { x: cx - (cx - view.x) * ratio, y: cy - (cy - view.y) * ratio, scale };
}

/**
 * Zoom factor of a wheel event. Pinch gestures on a trackpad arrive as `ctrl` + small deltas;
 * a mouse wheel notch is about 100 (or 3 "lines" in Firefox).
 */
export function wheelZoomFactor(deltaY: number, deltaMode: number, pinch: boolean): number {
  const pixels = deltaMode === 1 ? deltaY * 33 : deltaY;
  return Math.exp(-pixels * (pinch ? 0.01 : 0.0015));
}
