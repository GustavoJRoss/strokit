"use client";

import {
  CircleIcon,
  MousePointer2Icon,
  PencilIcon,
  PenToolIcon,
  Redo2Icon,
  SlashIcon,
  SquareIcon,
  Undo2Icon,
} from "lucide-react";
import type { ComponentType, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { toHexColor } from "@/lib/color";
import { useI18n } from "@/lib/i18n/provider";
import { DEFAULT_DRAW_COLOR, type DrawTool, useEditorStore } from "@/store/editor-store";

/** Single-key shortcuts while drawing (handled by the draw layer). */
const SHORTCUTS: Record<DrawTool | "select", string> = {
  select: "V",
  pencil: "P",
  pen: "B",
  line: "L",
  rect: "R",
  ellipse: "E",
};

const ICONS: Record<DrawTool | "select", ComponentType> = {
  select: MousePointer2Icon,
  pencil: PencilIcon,
  pen: PenToolIcon,
  line: SlashIcon,
  rect: SquareIcon,
  ellipse: CircleIcon,
};

const ITEMS: (DrawTool | "select")[] = ["select", "pencil", "pen", "line", "rect", "ellipse"];

function IconAction({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={label}
          disabled={disabled}
          onClick={onClick}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

/**
 * Tools floating at the bottom of the workspace, always in reach. Picking a drawing tool turns
 * draw mode on; the pointer goes back to editing layers. While drawing, the same bar also
 * carries color, width and undo/redo.
 */
export function ToolDock({ extra }: { extra?: ReactNode }) {
  const draw = useEditorStore((state) => state.draw);
  const enterDraw = useEditorStore((state) => state.enterDraw);
  const exitDraw = useEditorStore((state) => state.exitDraw);
  const setDrawTool = useEditorStore((state) => state.setDrawTool);
  const setDrawOver = useEditorStore((state) => state.setDrawOver);
  const setDrawStyle = useEditorStore((state) => state.setDrawStyle);
  const undo = useEditorStore((state) => state.undo);
  const redo = useEditorStore((state) => state.redo);
  const canUndo = useEditorStore((state) => state.history.past.length > 0);
  const canRedo = useEditorStore((state) => state.history.future.length > 0);
  const { t } = useI18n();
  const copy = t.draw;
  const names: Record<DrawTool | "select", string> = { select: copy.select, ...copy.tools };
  const value = draw.active ? draw.tool : "select";

  const choose = (next: string) => {
    if (!next) {
      // Picking the tool that is already active again: draw over what is under the pointer.
      if (draw.active) setDrawOver(!draw.overShapes);
      return;
    }
    if (next === "select") {
      if (draw.active) exitDraw();
      return;
    }
    if (!draw.active) enterDraw();
    setDrawTool(next as DrawTool);
  };

  return (
    <div className="pointer-events-none absolute inset-x-2 bottom-3 z-10 flex flex-wrap items-end justify-center gap-2">
      <div className="flex max-w-full flex-col items-center gap-2">
        {draw.active && (
          <p className="hidden rounded-md bg-foreground/85 px-2 py-1 text-background text-xs sm:block">
            {draw.overShapes ? copy.overHint : draw.tool === "pen" ? copy.penHint : copy.hint}
          </p>
        )}
        <div
          role="toolbar"
          aria-label={copy.toolbar}
          className="pointer-events-auto flex max-w-full flex-wrap items-center justify-center gap-1.5 rounded-xl border bg-background/95 p-1.5 shadow-lg backdrop-blur"
        >
          <ToggleGroup
            type="single"
            variant="outline"
            size="sm"
            value={value}
            onValueChange={choose}
            aria-label={copy.toolbar}
          >
            {ITEMS.map((item) => {
              const Icon = ICONS[item];
              const label = draw.active ? `${names[item]} (${SHORTCUTS[item]})` : names[item];
              return (
                <Tooltip key={item}>
                  <TooltipTrigger asChild>
                    {/* The tooltip trigger overwrites `data-state`, so the active tool is styled by `aria-checked`. */}
                    <ToggleGroupItem
                      value={item}
                      aria-label={label}
                      className="aria-checked:bg-primary aria-checked:text-primary-foreground aria-checked:hover:bg-primary/90"
                    >
                      <Icon />
                    </ToggleGroupItem>
                  </TooltipTrigger>
                  <TooltipContent>{label}</TooltipContent>
                </Tooltip>
              );
            })}
          </ToggleGroup>

          {draw.active && (
            <>
              <Separator orientation="vertical" className="h-6" />
              <input
                type="color"
                aria-label={copy.color}
                title={copy.color}
                value={toHexColor(draw.color) ?? DEFAULT_DRAW_COLOR}
                onChange={(event) => setDrawStyle({ color: event.target.value })}
                className="size-7 cursor-pointer rounded border bg-transparent p-0.5"
              />
              <div className="flex items-center gap-2 px-1">
                <Slider
                  aria-label={copy.width}
                  className="w-24"
                  min={0.5}
                  max={100}
                  step={0.5}
                  value={[draw.width]}
                  onValueChange={([width]) => width !== undefined && setDrawStyle({ width })}
                />
                <output className="w-10 text-right text-muted-foreground text-xs tabular-nums">
                  {draw.width}%
                </output>
              </div>
              <Separator orientation="vertical" className="h-6" />
              <IconAction label={copy.undo} disabled={!canUndo} onClick={undo}>
                <Undo2Icon />
              </IconAction>
              <IconAction label={copy.redo} disabled={!canRedo} onClick={redo}>
                <Redo2Icon />
              </IconAction>
            </>
          )}
        </div>
      </div>
      {extra}
    </div>
  );
}
