"use client";

import { useState } from "react";
import { BRAND_PATH } from "./brand";
import { BrandMark } from "./generated/BrandMark";

/** The brand mark with a faint static trace underneath; clicking restarts the animation. */
export function HeroMark() {
  const [run, setRun] = useState(0);
  return (
    <button
      type="button"
      onClick={() => setRun((value) => value + 1)}
      aria-label="Reiniciar a animação da marca"
      title="Clique para reiniciar"
      className="relative block aspect-square w-full max-w-[420px] cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring"
      style={{ ["--sk-stroke" as string]: "currentColor" }}
    >
      <svg
        viewBox="0 0 64 64"
        aria-hidden="true"
        className="absolute inset-0 size-full text-border"
      >
        <path
          d={BRAND_PATH}
          fill="none"
          stroke="currentColor"
          strokeWidth="7"
          strokeLinecap="square"
        />
      </svg>
      <BrandMark key={run} size="100%" label="strokit" className="absolute inset-0" />
    </button>
  );
}
