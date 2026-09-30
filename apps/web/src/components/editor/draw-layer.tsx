"use client";

import { BLANK_VIEWBOX, type DrawPoint, shapePath, visualUnit } from "@strokit/core";
import { useEffect, useRef, useState } from "react";
import { isEditableTarget } from "@/lib/dom";
import { useI18n } from "@/lib/i18n/provider";
import { type DrawTool, useEditorStore } from "@/store/editor-store";

/** A drag shorter than this (screen px) is a click and draws nothing. */
const MIN_DRAG_PX = 4;

const SHORTCUT_TOOLS: Record<string, DrawTool> = { l: "line", r: "rect", e: "ellipse" };

type Drag = {
  from: DrawPoint;
  to: DrawPoint;
  startClient: { x: number; y: number };
  constrain: boolean;
  fromCenter: boolean;
};

/**
 * Transparent SVG over the preview while drawing. It has the viewBox of the document (or the
 * blank canvas), so a pointer position converts to viewBox units through its own screen matrix.
 */
export function DrawLayer() {
  const doc = useEditorStore((state) => state.doc);
  const draw = useEditorStore((state) => state.draw);
  const addDrawnShapes = useEditorStore((state) => state.addDrawnShapes);
  const { t } = useI18n();
  const svgRef = useRef<SVGSVGElement>(null);
  const [drag, setDrag] = useState<Drag | null>(null);
  const dragRef = useRef<Drag | null>(null);
  dragRef.current = drag;

  const viewBox = doc?.viewBox ?? BLANK_VIEWBOX;
  const preserveAspectRatio = doc?.root.attrs.preserveAspectRatio;
  const strokeWidth = draw.width * visualUnit(viewBox);

  const toViewBox = (event: { clientX: number; clientY: number }): DrawPoint | null => {
    const matrix = svgRef.current?.getScreenCTM();
    if (!matrix) return null;
    const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
    return { x: point.x, y: point.y };
  };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (isEditableTarget(event.target)) return;
      const state = useEditorStore.getState();
      const key = event.key.toLowerCase();
      const mod = event.metaKey || event.ctrlKey;
      if (event.key === "Escape") {
        // First Escape drops the shape being dragged, the next one leaves draw mode.
        if (dragRef.current) setDrag(null);
        else state.exitDraw();
      } else if (mod && key === "z") {
        event.preventDefault();
        if (event.shiftKey) state.redoDraw();
        else state.undoDraw();
      } else if (mod && key === "y") {
        event.preventDefault();
        state.redoDraw();
      } else if (!mod && !event.altKey && SHORTCUT_TOOLS[key]) {
        state.setDrawTool(SHORTCUT_TOOLS[key]);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const options = drag && { constrain: drag.constrain, fromCenter: drag.fromCenter };
  const previewPath = drag && options ? shapePath(draw.tool, drag.from, drag.to, options) : null;

  return (
    <svg
      ref={svgRef}
      role="application"
      aria-label={t.draw.canvas}
      viewBox={viewBox.join(" ")}
      preserveAspectRatio={preserveAspectRatio}
      className="absolute inset-0 size-full cursor-crosshair touch-none select-none text-foreground"
      onPointerDown={(event) => {
        if (event.button !== 0) return;
        const from = toViewBox(event);
        if (!from) return;
        event.currentTarget.setPointerCapture(event.pointerId);
        setDrag({
          from,
          to: from,
          startClient: { x: event.clientX, y: event.clientY },
          constrain: event.shiftKey,
          fromCenter: event.altKey,
        });
      }}
      onPointerMove={(event) => {
        if (!dragRef.current) return;
        const to = toViewBox(event);
        if (to) {
          setDrag(
            (current) =>
              current && { ...current, to, constrain: event.shiftKey, fromCenter: event.altKey },
          );
        }
      }}
      onPointerUp={(event) => {
        const current = dragRef.current;
        setDrag(null);
        if (!current) return;
        const to = toViewBox(event) ?? current.to;
        const moved = Math.hypot(
          event.clientX - current.startClient.x,
          event.clientY - current.startClient.y,
        );
        if (moved < MIN_DRAG_PX) return;
        const d = shapePath(draw.tool, current.from, to, {
          constrain: event.shiftKey,
          fromCenter: event.altKey,
        });
        if (d) addDrawnShapes([d], t.draw.untitled);
      }}
      onPointerCancel={() => setDrag(null)}
    >
      {/* The drawing area: visible on a blank canvas, a faint frame over an existing SVG. */}
      <rect
        x={viewBox[0]}
        y={viewBox[1]}
        width={viewBox[2]}
        height={viewBox[3]}
        fill="none"
        stroke="currentColor"
        strokeOpacity={0.3}
        strokeDasharray="6 4"
        vectorEffect="non-scaling-stroke"
        pointerEvents="none"
      />
      {previewPath && (
        <path
          d={previewPath}
          fill="none"
          stroke={draw.color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={0.7}
          pointerEvents="none"
        />
      )}
    </svg>
  );
}
