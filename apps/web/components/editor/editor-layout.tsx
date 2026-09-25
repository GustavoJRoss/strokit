"use client";

import { PanelLeftOpenIcon, PanelRightOpenIcon } from "lucide-react";
import { createContext, type ReactNode, useCallback, useContext, useMemo, useState } from "react";
import type { Layout } from "react-resizable-panels";
import { useGroupRef, usePanelRef } from "react-resizable-panels";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { useMediaQuery } from "@/lib/use-media-query";
import { readPref, resetPrefs, writePref } from "@/lib/use-persistent-state";
import { cn } from "@/lib/utils";
import { EXPORT_HEADER_HEIGHT, ExportPanel } from "./export-panel";
import { LayersPanel } from "./layers-panel";
import { ParamsPanel } from "./params-panel";

export type PanelKey = "layers" | "params" | "export";

type LayoutControls = {
  collapsed: Record<PanelKey, boolean>;
  toggle: (panel: PanelKey) => void;
  reset: () => void;
};

const LayoutContext = createContext<LayoutControls | null>(null);

/** Null outside the resizable (desktop) layout. */
export function useLayoutControls(): LayoutControls | null {
  return useContext(LayoutContext);
}

/** Width of a collapsed side panel (px). */
const RAIL = 36;

const DEFAULT_H: Layout = { "panel-layers": 20, "panel-preview": 55, "panel-params": 25 };
const DEFAULT_V: Layout = { "panel-workspace": 70, "panel-export": 30 };

/** A saved layout is only used when it has exactly the panels we render now. */
function savedLayout(key: string, ids: string[]): Layout | undefined {
  const value = readPref<unknown>(key, null);
  if (!value || typeof value !== "object") return undefined;
  const entries = Object.entries(value as Record<string, unknown>);
  const valid =
    entries.length === ids.length &&
    entries.every(([id, size]) => ids.includes(id) && typeof size === "number" && size >= 0);
  return valid ? (value as Layout) : undefined;
}

function Rail({
  side,
  label,
  onExpand,
}: {
  side: "left" | "right";
  label: string;
  onExpand: () => void;
}) {
  const Icon = side === "left" ? PanelLeftOpenIcon : PanelRightOpenIcon;
  return (
    <button
      type="button"
      onClick={onExpand}
      aria-label={`Mostrar ${label.toLowerCase()}`}
      title={`Mostrar ${label.toLowerCase()}`}
      className="flex h-full w-full flex-col items-center gap-3 bg-muted/40 py-3 text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
    >
      <Icon className="size-4" />
      <span className="rotate-180 font-medium text-xs [writing-mode:vertical-rl]">{label}</span>
    </button>
  );
}

/**
 * Desktop: toolbar + a vertical group (workspace over export) whose workspace is a horizontal
 * group (layers | preview | params). Side panels and export collapse; sizes are remembered.
 * Below `md` the stacked layout is kept (the mobile mode belongs to phase 6).
 */
export function EditorLayout({ toolbar, preview }: { toolbar: ReactNode; preview: ReactNode }) {
  const wide = useMediaQuery("(min-width: 768px)");
  return wide ? (
    <ResizableLayout toolbar={toolbar} preview={preview} />
  ) : (
    <StackedLayout toolbar={toolbar} preview={preview} />
  );
}

function ResizableLayout({ toolbar, preview }: { toolbar: ReactNode; preview: ReactNode }) {
  const horizontal = useGroupRef();
  const vertical = useGroupRef();
  const layers = usePanelRef();
  const params = usePanelRef();
  const exportPanel = usePanelRef();
  const refs = useMemo(
    () => ({ layers, params, export: exportPanel }),
    [layers, params, exportPanel],
  );
  const [initial] = useState(() => ({
    h: savedLayout("layout:h", Object.keys(DEFAULT_H)),
    v: savedLayout("layout:v", Object.keys(DEFAULT_V)),
  }));
  const [collapsed, setCollapsed] = useState<Record<PanelKey, boolean>>({
    layers: false,
    params: false,
    export: false,
  });

  const sync = useCallback(() => {
    setCollapsed((current) => {
      const next = {
        layers: refs.layers.current?.isCollapsed() ?? false,
        params: refs.params.current?.isCollapsed() ?? false,
        export: refs.export.current?.isCollapsed() ?? false,
      };
      return next.layers === current.layers &&
        next.params === current.params &&
        next.export === current.export
        ? current
        : next;
    });
  }, [refs]);

  const controls = useMemo<LayoutControls>(
    () => ({
      collapsed,
      toggle: (panel) => {
        const handle = refs[panel].current;
        if (!handle) return;
        if (handle.isCollapsed()) handle.expand();
        else handle.collapse();
        sync();
      },
      reset: () => {
        resetPrefs();
        horizontal.current?.setLayout(DEFAULT_H);
        vertical.current?.setLayout(DEFAULT_V);
        sync();
      },
    }),
    [collapsed, refs, horizontal, vertical, sync],
  );

  return (
    <LayoutContext.Provider value={controls}>
      {toolbar}
      <ResizablePanelGroup
        orientation="vertical"
        id="strokit-editor-v"
        groupRef={vertical}
        defaultLayout={initial.v}
        onLayoutChanged={(layout) => writePref("layout:v", layout)}
        className="min-h-0 flex-1 border-t"
      >
        <ResizablePanel id="panel-workspace" minSize="25">
          <ResizablePanelGroup
            orientation="horizontal"
            id="strokit-editor-h"
            groupRef={horizontal}
            defaultLayout={initial.h}
            onLayoutChanged={(layout) => writePref("layout:h", layout)}
          >
            <ResizablePanel
              id="panel-layers"
              panelRef={layers}
              defaultSize="20"
              minSize={180}
              maxSize="40"
              collapsible
              collapsedSize={RAIL}
              onResize={sync}
            >
              {collapsed.layers ? (
                <Rail side="left" label="Camadas" onExpand={() => controls.toggle("layers")} />
              ) : (
                <LayersPanel onCollapse={() => controls.toggle("layers")} />
              )}
            </ResizablePanel>
            <ResizableHandle withHandle aria-label="Redimensionar camadas" />
            <ResizablePanel id="panel-preview" minSize="25">
              {preview}
            </ResizablePanel>
            <ResizableHandle withHandle aria-label="Redimensionar parâmetros" />
            <ResizablePanel
              id="panel-params"
              panelRef={params}
              defaultSize="25"
              minSize={260}
              maxSize="45"
              collapsible
              collapsedSize={RAIL}
              onResize={sync}
            >
              {collapsed.params ? (
                <Rail side="right" label="Parâmetros" onExpand={() => controls.toggle("params")} />
              ) : (
                <ParamsPanel onCollapse={() => controls.toggle("params")} />
              )}
            </ResizablePanel>
          </ResizablePanelGroup>
        </ResizablePanel>
        <ResizableHandle withHandle aria-label="Redimensionar código" />
        <ResizablePanel
          id="panel-export"
          panelRef={exportPanel}
          defaultSize="30"
          minSize={140}
          maxSize="75"
          collapsible
          collapsedSize={EXPORT_HEADER_HEIGHT}
          onResize={sync}
        >
          <ExportPanel
            fill
            collapsed={collapsed.export}
            onToggleCollapsed={() => controls.toggle("export")}
          />
        </ResizablePanel>
      </ResizablePanelGroup>
    </LayoutContext.Provider>
  );
}

function StackedLayout({ toolbar, preview }: { toolbar: ReactNode; preview: ReactNode }) {
  const [exportCollapsed, setExportCollapsed] = useState(false);
  return (
    <>
      {toolbar}
      <div className="flex min-h-0 flex-1 flex-col overflow-auto border-t">
        <div className="max-h-72 shrink-0 border-b">
          <LayersPanel />
        </div>
        <div className={cn("relative h-80 shrink-0 border-b")}>{preview}</div>
        <div className="shrink-0">
          <ParamsPanel />
        </div>
      </div>
      <ExportPanel
        collapsed={exportCollapsed}
        onToggleCollapsed={() => setExportCollapsed((value) => !value)}
      />
    </>
  );
}
