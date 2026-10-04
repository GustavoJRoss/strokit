"use client";

import { pickNearestOutline, pointAtFraction, visualUnit } from "@strokit/core";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { isEditableTarget } from "@/lib/dom";
import { useI18n } from "@/lib/i18n/provider";
import { applyPlayback, applyReducedMotion, injectMarkup } from "@/lib/preview";
import { cn } from "@/lib/utils";
import { CENTERED, panBy, type View, wheelZoomFactor, ZOOM_STEP, zoomAt } from "@/lib/view";
import { useEditorStore } from "@/store/editor-store";
import { selectAnimationKey, selectPreviewMarkup } from "@/store/selectors";
import { DrawLayer } from "./draw-layer";
import { ToolDock } from "./tool-dock";
import { ViewControls } from "./view-controls";

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

/** A press that moves less than this (px) is a click, not the start of a pan. */
const PAN_THRESHOLD_PX = 4;

/** Arrow keys move a layer by this many visual units (1% of the SVG's larger side); Shift ×10. */
const NUDGE_UNITS = 1;
const NUDGE_SHIFT_FACTOR = 10;

/** One layer being dragged: its element, and screen px → its parent's user space. */
type Dragged = { id: string; element: SVGElement; toParent: DOMMatrix };

/** A press on the canvas: becomes a pan (background) or a layer move (on a layer) once it moves. */
type Gesture = {
  pointerId: number;
  startX: number;
  startY: number;
  origin: View;
  active: boolean;
  /** Layer under the press, when it can start a move. */
  layerId: string | null;
  move: { ids: string[]; dragged: Dragged[]; toRoot: DOMMatrix; dx: number; dy: number } | null;
};

/** Screen vector → vector in the space `matrix` maps from (translation does not apply). */
function carry(matrix: DOMMatrix, dx: number, dy: number): [number, number] {
  return [matrix.a * dx + matrix.c * dy, matrix.b * dx + matrix.d * dy];
}

/** How far (px) from an outline a click still counts when picking a start point. */
const PICK_DISTANCE = 24;

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
  const animationKey = useEditorStore(selectAnimationKey);
  const playback = useEditorStore((state) => state.playback);
  const selection = useEditorStore((state) => state.selection);
  const hovered = useEditorStore((state) => state.hovered);
  const select = useEditorStore((state) => state.select);
  const clearSelection = useEditorStore((state) => state.clearSelection);
  const setHovered = useEditorStore((state) => state.setHovered);
  const tool = useEditorStore((state) => state.tool);
  const drawing = useEditorStore((state) => state.draw.active);
  const setTool = useEditorStore((state) => state.setTool);
  const setLayerStart = useEditorStore((state) => state.setLayerStart);
  const layers = useEditorStore((state) => state.spec.layers);
  const { t } = useI18n();

  const wrapperRef = useRef<HTMLDivElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const [root, setRoot] = useState<ShadowRoot | null>(null);
  const [renderCount, setRenderCount] = useState(0);
  /** What the current preview was injected for, to tell an edit from a restart. */
  const injected = useRef<{ key: string; token: number } | null>(null);
  const [boxes, setBoxes] = useState<Box[]>([]);
  const [markers, setMarkers] = useState<Marker[]>([]);

  const loadToken = useEditorStore((state) => state.loadToken);
  const viewportRef = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<View>(CENTERED);
  const viewRef = useRef(view);
  viewRef.current = view;
  const [spaceHeld, setSpaceHeld] = useState(false);
  const [panning, setPanning] = useState(false);
  const [moving, setMoving] = useState(false);
  const gesture = useRef<Gesture | null>(null);
  /** A drag ends in a click on the layer; it must not change the selection. */
  const justMoved = useRef(false);
  const moveLayers = useEditorStore((state) => state.moveLayers);

  // A newly loaded document starts centered.
  // biome-ignore lint/correctness/useExhaustiveDependencies: recenter whenever a document is loaded
  useEffect(() => setView(CENTERED), [loadToken]);

  const zoomBy = useCallback((factor: number) => {
    const rect = viewportRef.current?.getBoundingClientRect();
    setView((current) => zoomAt(current, factor, (rect?.width ?? 0) / 2, (rect?.height ?? 0) / 2));
  }, []);

  // Wheel: zoom around the cursor (pinch too); Shift or a sideways scroll moves the canvas.
  // Not a React prop: it must be non-passive to stop the page from scrolling or zooming.
  useEffect(() => {
    const element = viewportRef.current;
    if (!element) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const rect = element.getBoundingClientRect();
      if (event.shiftKey) {
        setView((current) => panBy(current, -(event.deltaX || event.deltaY), 0));
      } else if (!event.ctrlKey && Math.abs(event.deltaX) > Math.abs(event.deltaY)) {
        setView((current) => panBy(current, -event.deltaX, 0));
      } else {
        const factor = wheelZoomFactor(event.deltaY, event.deltaMode, event.ctrlKey);
        setView((current) =>
          zoomAt(current, factor, event.clientX - rect.left, event.clientY - rect.top),
        );
      }
    };
    element.addEventListener("wheel", onWheel, { passive: false });
    return () => element.removeEventListener("wheel", onWheel);
  }, []);

  // Keys: Space held = move with the pointer, + / - zoom, 0 centers.
  useEffect(() => {
    const ownsKeys = (event: KeyboardEvent) =>
      !isEditableTarget(event.target) &&
      !(
        event.target instanceof Element &&
        event.target.closest("[role=dialog],[role=menu],[role=listbox]")
      );
    const onDown = (event: KeyboardEvent) => {
      if (!ownsKeys(event) || event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.key === " ") {
        // Only when nothing else has focus: Space still presses focused buttons.
        const target = event.target;
        if (
          target === document.body ||
          (target instanceof Node && viewportRef.current?.contains(target))
        ) {
          event.preventDefault();
          setSpaceHeld(true);
        }
      } else if (event.key.startsWith("Arrow")) {
        // Only when nothing else has focus: sliders and lists use the arrows too.
        const target = event.target;
        const free =
          target === document.body ||
          (target instanceof Node && viewportRef.current?.contains(target));
        const { doc, selection, tool, draw } = useEditorStore.getState();
        if (!free || !doc || selection.length === 0 || tool !== "select" || draw.active) return;
        event.preventDefault();
        const step =
          visualUnit(doc.viewBox) * NUDGE_UNITS * (event.shiftKey ? NUDGE_SHIFT_FACTOR : 1);
        const dx = event.key === "ArrowLeft" ? -step : event.key === "ArrowRight" ? step : 0;
        const dy = event.key === "ArrowUp" ? -step : event.key === "ArrowDown" ? step : 0;
        moveLayers(selection, dx, dy, true);
      } else if (event.key === "+" || event.key === "=") zoomBy(ZOOM_STEP);
      else if (event.key === "-") zoomBy(1 / ZOOM_STEP);
      else if (event.key === "0") setView(CENTERED);
    };
    const onUp = (event: KeyboardEvent) => {
      if (event.key === " ") setSpaceHeld(false);
    };
    const onBlur = () => setSpaceHeld(false);
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
      window.removeEventListener("blur", onBlur);
    };
  }, [zoomBy, moveLayers]);

  const endGesture = () => {
    gesture.current = null;
    setPanning(false);
    setMoving(false);
  };

  /** Puts the layers being dragged back where they are (the preview was only moved visually). */
  const cancelMove = useCallback(() => {
    const move = gesture.current?.move;
    for (const item of move?.dragged ?? []) item.element.style.removeProperty("translate");
    gesture.current = null;
    setMoving(false);
  }, []);

  useEffect(() => {
    if (!moving) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") cancelMove();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [moving, cancelMove]);

  /** Takes the press over as a layer move: selects what is being dragged and measures the screen. */
  const startMove = (current: Gesture, pointerId: number, target: HTMLElement) => {
    const layerId = current.layerId;
    const svg = root?.querySelector("svg");
    const toRoot = svg?.getScreenCTM()?.inverse();
    if (!layerId || !svg || !root || !toRoot) return false;
    const state = useEditorStore.getState();
    // Dragging one of the selected layers moves them all; any other one is selected first.
    const ids = state.selection.includes(layerId) ? state.selection : [layerId];
    if (!state.selection.includes(layerId)) select(layerId, "replace");
    const dragged: Dragged[] = [];
    for (const id of ids) {
      const element = root.querySelector(`[data-sk-id="${CSS.escape(id)}"]`);
      const toParent = (element?.parentElement as SVGGraphicsElement | null)
        ?.getScreenCTM()
        ?.inverse();
      if (element instanceof SVGElement && toParent) dragged.push({ id, element, toParent });
    }
    if (dragged.length === 0) return false;
    current.move = { ids, dragged, toRoot, dx: 0, dy: 0 };
    justMoved.current = true;
    target.setPointerCapture(pointerId);
    setMoving(true);
    return true;
  };

  /**
   * While drawing, a press on an existing shape is for that shape, not for a new one: it becomes
   * a layer gesture (a click selects, a drag moves). Returns false when nothing is under the
   * pointer, or when the active tool was picked again to draw over shapes.
   */
  const pressShape = (event: React.PointerEvent<SVGSVGElement>): boolean => {
    if (!root || useEditorStore.getState().draw.overShapes) return false;
    const hit = root
      .elementsFromPoint(event.clientX, event.clientY)
      .find((element) => element.hasAttribute("data-sk-id"));
    const layerId = hit?.getAttribute("data-sk-id");
    if (!layerId) return false;
    justMoved.current = false;
    gesture.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      origin: viewRef.current,
      active: false,
      layerId,
      move: null,
    };
    return true;
  };

  /** Ends the press: a move is committed as one undo step, a pan just stops. */
  const finishGesture = (event: React.PointerEvent) => {
    const current = gesture.current;
    if (current?.move) {
      for (const item of current.move.dragged) item.element.style.removeProperty("translate");
      moveLayers(current.move.ids, current.move.dx, current.move.dy);
    } else if (current?.layerId && !current.active && drawing) {
      // The drawing layer covers the shapes, so their own click never arrives: select here.
      select(
        current.layerId,
        event.shiftKey || event.metaKey || event.ctrlKey ? "toggle" : "replace",
      );
    }
    endGesture();
  };

  useLayoutEffect(() => {
    const host = hostRef.current;
    if (host) setRoot(host.shadowRoot ?? host.attachShadow({ mode: "open" }));
  }, []);

  // Preview = export: the markup comes from exporters.css(), already sanitized upstream.
  // Injecting new markup creates its animations from t=0. When only the picture changed (a layer
  // moved, grouped, deleted, recolored) and not the animation itself, they are put back where the
  // old ones were, so the preview does not jump; only the restart button (token) or a change to
  // the animation settings starts over.
  useLayoutEffect(() => {
    if (!root) return;
    const last = injected.current;
    const keepsPlaying =
      last !== null && last.key === animationKey && last.token === playback.restartToken;
    const time = keepsPlaying ? root.getAnimations()[0]?.currentTime : undefined;
    injectMarkup(root, markup);
    if (typeof time === "number") {
      for (const animation of root.getAnimations()) animation.currentTime = time;
    }
    injected.current = { key: animationKey, token: playback.restartToken };
    setRenderCount((count) => count + 1);
  }, [root, markup, animationKey, playback.restartToken]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: re-apply after every injection
  useLayoutEffect(() => {
    if (!root) return;
    // While drawing the SVG shows its final state: outline animations start from nothing.
    applyReducedMotion(root, drawing);
    applyPlayback(root, playback);
  }, [root, playback, renderCount, drawing]);

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
  }, [measure, renderCount, view]);

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
      if (justMoved.current) {
        justMoved.current = false;
        return;
      }
      const mouse = event as MouseEvent;
      const state = useEditorStore.getState();
      if (state.tool === "start") {
        // Nearest outline instead of hit testing: invisible dashes and thin strokes miss clicks.
        const hit = layerAt(event)?.getAttribute("data-sk-id");
        const ids = hit
          ? [hit]
          : state.selection.length > 0
            ? state.selection
            : (state.doc?.elements.map((element) => element.id) ?? []);
        const candidates = ids.flatMap((id) => {
          const element = root.querySelector(`[data-sk-id="${CSS.escape(id)}"]`);
          return element instanceof SVGGeometryElement ? [{ id, geometry: element }] : [];
        });
        const picked = pickNearestOutline(
          candidates,
          { x: mouse.clientX, y: mouse.clientY },
          hit ? Number.POSITIVE_INFINITY : PICK_DISTANCE,
        );
        if (picked) setLayerStart(picked.id, picked.fraction);
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
      // The checkerboard moves with the canvas, so the whole surface feels draggable.
      style={
        playback.background === "checker"
          ? { backgroundPosition: `${view.x}px ${view.y}px` }
          : undefined
      }
    >
      <ToolDock
        extra={
          <ViewControls
            view={view}
            onZoomIn={() => zoomBy(ZOOM_STEP)}
            onZoomOut={() => zoomBy(1 / ZOOM_STEP)}
            onCenter={() => setView(CENTERED)}
          />
        }
      />
      {tool === "start" && (
        <p className="pointer-events-none absolute inset-x-0 top-2 z-10 mx-auto w-fit rounded-md bg-foreground px-2 py-1 text-background text-xs">
          {t.params.layer.picking}
        </p>
      )}
      <div
        ref={viewportRef}
        className={cn(
          "absolute inset-0 touch-none",
          spaceHeld && "cursor-grab",
          (panning || moving) && "cursor-grabbing",
        )}
        onPointerDownCapture={(event) => {
          justMoved.current = false;
          const drag = event.button === 1 || (event.button === 0 && spaceHeld);
          // A plain left press on the background may turn into a pan once it moves, and one on a
          // layer into a move (not with a modifier: that selects, and while picking a start point).
          if (!drag && (event.button !== 0 || drawing)) return;
          const canMove =
            !drag &&
            tool === "select" &&
            !(event.shiftKey || event.metaKey || event.ctrlKey || event.altKey);
          gesture.current = {
            pointerId: event.pointerId,
            startX: event.clientX,
            startY: event.clientY,
            origin: viewRef.current,
            active: drag,
            layerId: canMove
              ? (layerAt(event.nativeEvent)?.getAttribute("data-sk-id") ?? null)
              : null,
            move: null,
          };
          if (!drag) return;
          event.preventDefault();
          event.stopPropagation();
          event.currentTarget.setPointerCapture(event.pointerId);
          setPanning(true);
        }}
        onPointerMove={(event) => {
          const current = gesture.current;
          if (!current || current.pointerId !== event.pointerId) return;
          const dx = event.clientX - current.startX;
          const dy = event.clientY - current.startY;
          if (!current.active) {
            if (Math.hypot(dx, dy) < PAN_THRESHOLD_PX) return;
            current.active = true;
            if (current.layerId) {
              if (!startMove(current, event.pointerId, event.currentTarget)) {
                gesture.current = null;
                return;
              }
            } else {
              event.currentTarget.setPointerCapture(event.pointerId);
              setPanning(true);
            }
          }
          if (current.move) {
            // The preview follows the pointer right away (CSS `translate` composes with the layer's
            // own transform); the SVG is only edited when the pointer is released.
            for (const item of current.move.dragged) {
              const [x, y] = carry(item.toParent, dx, dy);
              item.element.style.translate = `${x}px ${y}px`;
            }
            [current.move.dx, current.move.dy] = carry(current.move.toRoot, dx, dy);
            measure();
            return;
          }
          setView({ ...current.origin, x: current.origin.x + dx, y: current.origin.y + dy });
        }}
        onPointerUp={finishGesture}
        onPointerCancel={cancelMove}
      >
        <div
          ref={wrapperRef}
          className={cn(
            "absolute inset-[clamp(0.5rem,4%,2rem)]",
            tool === "start" && "cursor-crosshair",
          )}
        >
          <div
            className="absolute inset-0"
            style={{
              transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})`,
              transformOrigin: "0 0",
            }}
          >
            <div
              ref={hostRef}
              className="size-full"
              data-testid="preview"
              role="presentation"
              aria-hidden={markup ? undefined : true}
            />
            {drawing && <DrawLayer disabled={spaceHeld || panning} onPressShape={pressShape} />}
          </div>
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
    </div>
  );
}
