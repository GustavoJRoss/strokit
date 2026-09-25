"use client";

import { useState } from "react";
import { LOGO_PATHS, LOGO_VIEWBOX } from "./brand";
import { BrandMark } from "./generated/BrandMark";

/**
 * The strokit logo presenting itself (draw-fill: the outline draws, then the fill comes in),
 * over a faint static copy. Clicking restarts the animation.
 */
export function HeroMark() {
  const [run, setRun] = useState(0);
  return (
    <button
      type="button"
      onClick={() => setRun((value) => value + 1)}
      aria-label="Reiniciar a animação da marca"
      title="Clique para reiniciar"
      className="relative block aspect-[883/504] w-full max-w-[520px] cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring"
      style={{ ["--sk-stroke" as string]: "currentColor" }}
    >
      <svg
        viewBox={LOGO_VIEWBOX}
        aria-hidden="true"
        className="absolute inset-0 size-full text-border"
      >
        {LOGO_PATHS.map((d) => (
          <path key={d.slice(0, 12)} d={d} fill="currentColor" />
        ))}
      </svg>
      <BrandMark key={run} size="100%" label="strokit" className="absolute inset-0" />
    </button>
  );
}
