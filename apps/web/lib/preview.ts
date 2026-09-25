/**
 * Shared by the editor preview and the home playground: both inject the exact output of
 * `exporters.css()` into a shadow root (preview = export) and steer it without new code.
 */

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

/** Chrome inside the shadow root: sizing only, never animation. */
export const HOST_CSS =
  ":host{display:block;width:100%;height:100%}:host>svg{display:block;width:100%;height:100%;overflow:visible}";

export function injectMarkup(root: ShadowRoot, markup: string | null): void {
  root.innerHTML = markup ? `<style>${HOST_CSS}</style>${markup}` : "";
}

/**
 * Simulated reduced motion flips the media query of the exported stylesheet through CSSOM
 * (`all` forces the block on). The CSS text stays byte-for-byte the exported one.
 */
export function applyReducedMotion(root: ShadowRoot, forced: boolean): void {
  const style = root.querySelector("svg > style");
  const sheet = style instanceof SVGStyleElement ? style.sheet : null;
  if (!sheet) return;
  for (const rule of Array.from(sheet.cssRules)) {
    if (!(rule instanceof CSSMediaRule)) continue;
    const text = rule.media.mediaText;
    if (text === REDUCED_MOTION_QUERY || text === "all") {
      rule.media.mediaText = forced ? "all" : REDUCED_MOTION_QUERY;
    }
  }
}

/** Play/pause/speed act on the CSS animations already applied (Web Animations API). */
export function applyPlayback(
  root: ShadowRoot,
  playback: { playing: boolean; rate: number },
): void {
  for (const animation of root.getAnimations()) {
    if (animation.playbackRate !== playback.rate) animation.updatePlaybackRate(playback.rate);
    if (!playback.playing) animation.pause();
    else if (animation.playState === "paused") animation.play();
  }
}
