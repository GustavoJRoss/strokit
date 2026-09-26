"use client";

import { pickPathFraction, pointAtFraction } from "@strokit/core";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n/provider";
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

type Marker = { id: string; x: number; y: number };

function layerAt(event: Event): Element | null {
  for (const target of event.composedPath()) {
    if (target instanceof Element && target.hasAttribute("data-sk-id")) return target;
  }
  return null;
}

function elementIdAt(event: Event): string | null {
  return layerAt(event)?.getAttribute("data-sk-id") ?? null;
}

export function PreviewCanvas() {
  const markup = useEditorStore(selectPreviewMarkup);
  const playback = useEditorStore((state) => state.playback);
  const selection = useEditorStore((state) => state.selection);
  const hovered = useEditorStore((state) => state.hovered);
  const select = useEditorStore((state) => state.select);
  const clearSelection = useEditorStore((state) => state.clearSelection);
  const setHovered = useEditorStore((state) => state.setHovered);
  const tool = useEditorStore((state) => state.tool);
  const setTool = useEditorStore((state) => state.setTool);
  const setLayerStart = useEditorStore((state) => state.setLayerStart);
  const layers = useEditorStore((state) => state.spec.layers);
  const { t } = useI18n();

  const wrapperRef = useRef<HTMLDivElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const [root, setRoot] = useState<ShadowRoot | null>(null);
  const [renderCount, setRenderCount] = useState(0);
  const [boxes, setBoxes] = useState<Box[]>([]);
  const [markers, setMarkers] = useState<Marker[]>([]);

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

    // Start point of the selected layers: always while picking, otherwise only when moved.
    const points: Marker[] = [];
    for (const id of selection) {
      const start = layers?.[id]?.start;
      if (tool !== "start" && start === undefined) continue;
      const element = root.querySelector(`[data-sk-id="${CSS.escape(id)}"]`);
      if (!(element instanceof SVGGeometryElement)) continue;
      const point = pointAtFraction(element, start ?? 0);
      points.push({ id, x: point.x - origin.left, y: point.y - origin.top });
    }
    setMarkers(points);
  }, [root, selection, hovered, layers, tool]);

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
      const mouse = event as MouseEvent;
      if (useEditorStore.getState().tool === "start") {
        const layer = layerAt(event);
        const id = layer?.getAttribute("data-sk-id");
        if (id && layer instanceof SVGGeometryElement) {
          setLayerStart(id, pickPathFraction(layer, { x: mouse.clientX, y: mouse.clientY }));
        }
        return;
      }
      const id = elementIdAt(event);
      if (id) select(id, modeFor(mouse));
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
  }, [root, select, clearSelection, setHovered, setLayerStart]);

  useEffect(() => {
    if (tool !== "start") return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setTool("select");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [tool, setTool]);

  return (
    <div
      className={cn(
        "relative size-full",
        playback.background === "light" && "bg-white",
        playback.background === "dark" && "bg-neutral-950",
        playback.background === "checker" && "sk-checker",
      )}
    >
      {tool === "start" && (
        <p className="pointer-events-none absolute inset-x-0 top-2 z-10 mx-auto w-fit rounded-md bg-foreground px-2 py-1 text-background text-xs">
          {t.params.layer.picking}
        </p>
      )}
      <div
        ref={wrapperRef}
        className={cn(
          "absolute inset-[clamp(0.5rem,4%,2rem)]",
          tool === "start" && "cursor-crosshair",
        )}
      >
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
        {markers.map((marker) => (
          <span
            key={`start-${marker.id}`}
            data-testid="start-marker"
            title={t.params.layer.startMarker}
            aria-hidden
            className="pointer-events-none absolute size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-sky-600 bg-white shadow"
            style={{ left: marker.x, top: marker.y }}
          />
        ))}
      </div>
    </div>
  );
}
