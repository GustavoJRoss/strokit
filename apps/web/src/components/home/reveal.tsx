"use client";

import { type CSSProperties, type ReactNode, useEffect, useRef } from "react";

type RevealProps = {
  from?: "left" | "right";
  /** ms, for staggering siblings. */
  delay?: number;
  /**
   * Fade in as well as slide (default). Above-the-fold text should pass false: it slides in
   * already visible, so the browser counts it as painted immediately (LCP).
   */
  fade?: boolean;
  className?: string;
  children: ReactNode;
};

/**
 * Slides its content in from the side the first time it enters the viewport. The hidden
 * state only exists under `html.js` (see globals.css), so without JS everything is visible;
 * with reduced motion the CSS drops the movement.
 */
export function Reveal({
  from = "left",
  delay = 0,
  fade = true,
  className,
  children,
}: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const show = () => element.setAttribute("data-revealed", "");
    if (typeof IntersectionObserver === "undefined") return show();
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          show();
          observer.disconnect();
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -8% 0px" },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      data-reveal={from}
      data-reveal-fade={fade ? undefined : "false"}
      className={className}
      style={{ "--reveal-delay": `${delay}ms` } as CSSProperties}
    >
      {children}
    </div>
  );
}
