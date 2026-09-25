"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { applyPlayback, applyReducedMotion, injectMarkup } from "@/lib/preview";
import { cn } from "@/lib/utils";
import { useEditorStore } from "@/store/editor-store";
import { selectPreviewMarkup } from "@/store/selectors";

type Box = {
  id: string;
  kind: "hover" | "selected";
  x: number;
  y: number;
  width: number;
  height: number;
};

function modeFor(event: MouseEvent): "replace" | "toggle" | "range" {
  if (event.shiftKey) return "range";
  if (event.metaKey || event.ctrlKey) return "toggle";
  return "replace";
}

function elementIdAt(event: Event): string | null {
  for (const target of event.composedPath()) {
    if (target instanceof Element && target.hasAttribute("data-sk-id")) {
      return target.getAttribute("data-sk-id");
    }
  }
  return null;
}

export function PreviewCanvas() {
  const markup = useEditorStore(selectPreviewMarkup);
  const playback = useEditorStore((state) => state.playback);
  const selection = useEditorStore((state) => state.selection);
  const hovered = useEditorStore((state) => state.hovered);
  const select = useEditorStore((state) => state.select);
  const clearSelection = useEditorStore((state) => state.clearSelection);
  const setHovered = useEditorStore((state) => state.setHovered);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const [root, setRoot] = useState<ShadowRoot | null>(null);
  const [renderCount, setRenderCount] = useState(0);
  const [boxes, setBoxes] = useState<Box[]>([]);

  useLayoutEffect(() => {
    const host = hostRef.current;
    if (host) setRoot(host.shadowRoot ?? host.attachShadow({ mode: "open" }));
  }, []);

  // Preview = export: the markup comes from exporters.css(), already sanitized upstream.
  // biome-ignore lint/correctness/useExhaustiveDependencies: restartToken re-injects to restart from t=0
  useLayoutEffect(() => {
    if (!root) return;
    injectMarkup(root, markup);
    setRenderCount((count) => count + 1);
  }, [root, markup, playback.restartToken]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: re-apply after every injection
  useLayoutEffect(() => {
    if (!root) return;
    applyReducedMotion(root, playback.reducedMotion);
    applyPlayback(root, playback);
  }, [root, playback, renderCount]);

  const measure = useCallback(() => {
    const wrapper = wrapperRef.current;
    if (!root || !wrapper) return;
    const origin = wrapper.getBoundingClientRect();
    const ids = [...new Set([...selection, ...(hovered ? [hovered] : [])])];
    const next: Box[] = [];
    for (const id of ids) {
      const element = root.querySelector(`[data-sk-id="${CSS.escape(id)}"]`);
      if (!element) continue;
      const rect = element.getBoundingClientRect();
      next.push({
        id,
        kind: id === hovered ? "hover" : "selected",
        x: rect.left - origin.left,
        y: rect.top - origin.top,
        width: rect.width,
        height: rect.height,
      });
    }
    setBoxes(next);
  }, [root, selection, hovered]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: geometry changes on every injection
  useLayoutEffect(() => {
    measure();
  }, [measure, renderCount]);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    const observer = new ResizeObserver(measure);
    observer.observe(wrapper);
    return () => observer.disconnect();
  }, [measure]);

  useEffect(() => {
    if (!root) return;
    const onClick = (event: Event) => {
      const id = elementIdAt(event);
      if (id) select(id, modeFor(event as MouseEvent));
      else clearSelection();
    };
    const onMove = (event: Event) => {
      const id = elementIdAt(event);
      if (id !== useEditorStore.getState().hovered) setHovered(id);
    };
    const onLeave = () => setHovered(null);
    root.addEventListener("click", onClick);
    root.addEventListener("pointermove", onMove);
    hostRef.current?.addEventListener("pointerleave", onLeave);
    const host = hostRef.current;
    return () => {
      root.removeEventListener("click", onClick);
      root.removeEventListener("pointermove", onMove);
      host?.removeEventListener("pointerleave", onLeave);
    };
  }, [root, select, clearSelection, setHovered]);

  return (
    <div
      className={cn(
        "relative size-full",
        playback.background === "light" && "bg-white",
        playback.background === "dark" && "bg-neutral-950",
        playback.background === "checker" && "sk-checker",
      )}
    >
      <div ref={wrapperRef} className="absolute inset-8">
        <div
          ref={hostRef}
          className="size-full"
          data-testid="preview"
          role="presentation"
          aria-hidden={markup ? undefined : true}
        />
        {boxes.map((box) => (
          <div
            key={`${box.kind}-${box.id}`}
            aria-hidden
            className={cn(
              "pointer-events-none absolute rounded-sm outline-offset-2",
              box.kind === "hover"
                ? "outline-2 outline-sky-500 outline-dashed"
                : "outline-2 outline-sky-600",
            )}
            style={{ left: box.x, top: box.y, width: box.width, height: box.height }}
          />
        ))}
      </div>
    </div>
  );
}
