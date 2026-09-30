"use client";

import {
  BLANK_VIEWBOX,
  type DrawPoint,
  freehandPath,
  type PenAnchor,
  penPath,
  shapePath,
  visualUnit,
} from "@strokit/core";
import { useCallback, useEffect, useRef, useState } from "react";
import { isEditableTarget } from "@/lib/dom";
import { useI18n } from "@/lib/i18n/provider";
import { type DrawTool, useEditorStore } from "@/store/editor-store";

/** A drag shorter than this (screen px) is a click and draws nothing. */
const MIN_DRAG_PX = 4;

/** How far (screen px) the simplified pencil stroke may stray from what was drawn. */
const PENCIL_TOLERANCE_PX = 1.5;

/** Clicking this close (screen px) to the first pen anchor closes the path. */
const CLOSE_RADIUS_PX = 10;

const SHORTCUT_TOOLS: Record<string, DrawTool> = {
  p: "pencil",
  b: "pen",
  l: "line",
  r: "rect",
  e: "ellipse",
};

/** A shape or pencil stroke being dragged. */
type Drag = {
  from: DrawPoint;
  to: DrawPoint;
  /** Every sample of a pencil stroke, in viewBox units. */
  points: DrawPoint[];
  startClient: { x: number; y: number };
  constrain: boolean;
  fromCenter: boolean;
};

/** A pen path in progress. `shaping`: the button is down on the last anchor, pulling its handle. */
type PenDraft = { anchors: PenAnchor[]; cursor: DrawPoint | null; shaping: boolean };

function distance(a: DrawPoint, b: DrawPoint): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/**
 * Transparent SVG over the preview while drawing. It has the viewBox of the document (or the
 * blank canvas), so a pointer position converts to viewBox units through its own screen matrix.
 */
export function DrawLayer() {
  const doc = useEditorStore((state) => state.doc);
  const draw = useEditorStore((state) => state.draw);
  const { t } = useI18n();
  const svgRef = useRef<SVGSVGElement>(null);
  const [drag, setDrag] = useState<Drag | null>(null);
  const dragRef = useRef<Drag | null>(null);
  dragRef.current = drag;
  const [pen, setPen] = useState<PenDraft | null>(null);
  const penRef = useRef<PenDraft | null>(null);
  const untitledRef = useRef(t.draw.untitled);
  untitledRef.current = t.draw.untitled;

  const viewBox = doc?.viewBox ?? BLANK_VIEWBOX;
  const preserveAspectRatio = doc?.root.attrs.preserveAspectRatio;
  const strokeWidth = draw.width * visualUnit(viewBox);

  const toViewBox = (event: { clientX: number; clientY: number }): DrawPoint | null => {
    const matrix = svgRef.current?.getScreenCTM();
    if (!matrix) return null;
    const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
    return { x: point.x, y: point.y };
  };

  /** viewBox units per screen pixel: fixed sizes on screen at any zoom or viewBox. */
  const perPixel = (): number => {
    const scale = svgRef.current?.getScreenCTM()?.a;
    return scale ? 1 / scale : visualUnit(viewBox) / 4;
  };

  const updatePen = useCallback((next: PenDraft | null) => {
    penRef.current = next;
    setPen(next);
  }, []);

  /** Turns the pen path into a shape (closed or not) and starts a new one. */
  const finishPen = useCallback(
    (closed: boolean) => {
      const current = penRef.current;
      updatePen(null);
      if (!current) return;
      const d = penPath(current.anchors, closed);
      if (d) useEditorStore.getState().addDrawnShapes([d], untitledRef.current);
    },
    [updatePen],
  );
  const finishPenRef = useRef(finishPen);
  finishPenRef.current = finishPen;

  // Leaving the pen (another tool, or drawing done) keeps what was placed instead of losing it.
  useEffect(() => {
    if (draw.tool !== "pen") return;
    return () => finishPenRef.current(false);
  }, [draw.tool]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (isEditableTarget(event.target)) return;
      const state = useEditorStore.getState();
      const key = event.key.toLowerCase();
      const mod = event.metaKey || event.ctrlKey;
      const placing = penRef.current;
      const undoAnchor = () => {
        event.preventDefault();
        if (!placing) return;
        const anchors = placing.anchors.slice(0, -1);
        updatePen(anchors.length > 0 ? { ...placing, anchors, shaping: false } : null);
      };
      if (event.key === "Escape") {
        // Escape drops what is being drawn; with nothing in progress it leaves draw mode.
        if (placing) updatePen(null);
        else if (dragRef.current) setDrag(null);
        else state.exitDraw();
      } else if (event.key === "Enter" && placing) {
        event.preventDefault();
        finishPenRef.current(false);
      } else if (event.key === "Backspace" || event.key === "Delete") {
        if (placing) undoAnchor();
        else if (state.selection.length > 0) {
          event.preventDefault();
          state.deleteLayers();
        }
      } else if (mod && key === "z") {
        if (placing && !event.shiftKey) undoAnchor();
        else {
          event.preventDefault();
          if (event.shiftKey) state.redoDraw();
          else state.undoDraw();
        }
      } else if (mod && key === "y") {
        event.preventDefault();
        state.redoDraw();
      } else if (!mod && !event.altKey && key === "v") {
        state.exitDraw();
      } else if (!mod && !event.altKey && SHORTCUT_TOOLS[key]) {
        state.setDrawTool(SHORTCUT_TOOLS[key]);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [updatePen]);

  const penDown = (event: React.PointerEvent<SVGSVGElement>) => {
    const point = toViewBox(event);
    if (!point) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    const current = penRef.current ?? { anchors: [], cursor: null, shaping: false };
    const first = current.anchors[0];
    if (
      current.anchors.length >= 3 &&
      first &&
      distance(point, first.point) <= CLOSE_RADIUS_PX * perPixel()
    ) {
      finishPen(true);
      return;
    }
    updatePen({ anchors: [...current.anchors, { point }], cursor: point, shaping: true });
  };

  const penMove = (event: React.PointerEvent<SVGSVGElement>) => {
    const current = penRef.current;
    const point = toViewBox(event);
    if (!current || !point) return;
    const last = current.anchors.at(-1);
    if (current.shaping && last) {
      // Dragging from a new anchor pulls out its handle; a plain click leaves it sharp.
      const pulled = distance(point, last.point) >= MIN_DRAG_PX * perPixel();
      const anchor: PenAnchor = pulled
        ? { point: last.point, handle: point }
        : { point: last.point };
      updatePen({ ...current, anchors: [...current.anchors.slice(0, -1), anchor], cursor: point });
    } else {
      updatePen({ ...current, cursor: point });
    }
  };

  const previewPath = (() => {
    if (draw.tool === "pen" && pen) {
      const ahead: PenAnchor[] = pen.cursor && !pen.shaping ? [{ point: pen.cursor }] : [];
      return penPath([...pen.anchors, ...ahead]);
    }
    if (!drag) return null;
    return draw.tool === "pencil"
      ? freehandPath(drag.points, PENCIL_TOLERANCE_PX * perPixel())
      : draw.tool === "pen"
        ? null
        : shapePath(draw.tool, drag.from, drag.to, {
            constrain: drag.constrain,
            fromCenter: drag.fromCenter,
          });
  })();

  const px = perPixel();
  const first = pen?.anchors[0];
  const closable =
    pen !== null &&
    pen.anchors.length >= 3 &&
    !pen.shaping &&
    pen.cursor !== null &&
    first !== undefined &&
    distance(pen.cursor, first.point) <= CLOSE_RADIUS_PX * px;

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
        if (draw.tool === "pen") {
          penDown(event);
          return;
        }
        const from = toViewBox(event);
        if (!from) return;
        event.currentTarget.setPointerCapture(event.pointerId);
        setDrag({
          from,
          to: from,
          points: [from],
          startClient: { x: event.clientX, y: event.clientY },
          constrain: event.shiftKey,
          fromCenter: event.altKey,
        });
      }}
      onPointerMove={(event) => {
        if (draw.tool === "pen") {
          penMove(event);
          return;
        }
        if (!dragRef.current) return;
        // Fast strokes arrive as several samples per event: keep them all for a smooth curve.
        const pencil = draw.tool === "pencil";
        const samples = pencil ? event.nativeEvent.getCoalescedEvents?.() : undefined;
        const points = (samples?.length ? samples : [event.nativeEvent])
          .map((sample) => toViewBox(sample))
          .filter((point): point is DrawPoint => point !== null);
        const to = points.at(-1);
        if (to) {
          setDrag(
            (current) =>
              current && {
                ...current,
                to,
                points: pencil ? [...current.points, ...points] : current.points,
                constrain: event.shiftKey,
                fromCenter: event.altKey,
              },
          );
        }
      }}
      onPointerUp={(event) => {
        if (draw.tool === "pen") {
          const current = penRef.current;
          if (current) updatePen({ ...current, shaping: false });
          return;
        }
        const current = dragRef.current;
        setDrag(null);
        if (!current) return;
        const to = toViewBox(event) ?? current.to;
        const moved = Math.hypot(
          event.clientX - current.startClient.x,
          event.clientY - current.startClient.y,
        );
        if (moved < MIN_DRAG_PX) return;
        const d =
          draw.tool === "pencil"
            ? freehandPath([...current.points, to], PENCIL_TOLERANCE_PX * perPixel())
            : shapePath(draw.tool, current.from, to, {
                constrain: event.shiftKey,
                fromCenter: event.altKey,
              });
        if (d) useEditorStore.getState().addDrawnShapes([d], t.draw.untitled);
      }}
      onPointerCancel={() => setDrag(null)}
      onDoubleClick={() => {
        if (draw.tool === "pen") finishPen(false);
      }}
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
      {draw.tool === "pen" && pen && (
        <g pointerEvents="none" className="text-sky-600">
          {pen.anchors.map(({ point, handle }, index) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: anchors have no identity besides their order
            <g key={index}>
              {handle &&
                [handle, { x: 2 * point.x - handle.x, y: 2 * point.y - handle.y }].map((end) => (
                  <g key={`${end.x}-${end.y}`}>
                    <line
                      x1={point.x}
                      y1={point.y}
                      x2={end.x}
                      y2={end.y}
                      stroke="currentColor"
                      strokeWidth={1}
                      vectorEffect="non-scaling-stroke"
                    />
                    <circle cx={end.x} cy={end.y} r={3 * px} fill="currentColor" />
                  </g>
                ))}
              <rect
                x={point.x - 4 * px}
                y={point.y - 4 * px}
                width={8 * px}
                height={8 * px}
                fill={index === 0 && closable ? "currentColor" : "white"}
                stroke="currentColor"
                strokeWidth={1.5}
                vectorEffect="non-scaling-stroke"
              />
            </g>
          ))}
        </g>
      )}
    </svg>
  );
}
