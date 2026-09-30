"use client";

import {
  CheckIcon,
  CircleIcon,
  PencilIcon,
  PencilLineIcon,
  PenToolIcon,
  Redo2Icon,
  SlashIcon,
  SquareIcon,
  Undo2Icon,
} from "lucide-react";
import type { ComponentType } from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { toHexColor } from "@/lib/color";
import { useI18n } from "@/lib/i18n/provider";
import { DEFAULT_DRAW_COLOR, type DrawTool, useEditorStore } from "@/store/editor-store";

/** Single-key shortcuts of the tools (handled by the draw layer). */
export const DRAW_SHORTCUTS: Record<DrawTool, string> = {
  pencil: "P",
  pen: "B",
  line: "L",
  rect: "R",
  ellipse: "E",
};

const TOOL_ICONS: Record<DrawTool, ComponentType> = {
  pencil: PencilIcon,
  pen: PenToolIcon,
  line: SlashIcon,
  rect: SquareIcon,
  ellipse: CircleIcon,
};

const TOOLS: DrawTool[] = ["pencil", "pen", "line", "rect", "ellipse"];

/** Toolbar button that turns draw mode on and off. */
export function DrawButton() {
  const active = useEditorStore((state) => state.draw.active);
  const enterDraw = useEditorStore((state) => state.enterDraw);
  const exitDraw = useEditorStore((state) => state.exitDraw);
  const { t } = useI18n();
  return (
    <Button
      variant={active ? "default" : "outline"}
      size="sm"
      aria-pressed={active}
      onClick={active ? exitDraw : enterDraw}
    >
      <PencilLineIcon data-icon="inline-start" />
      {t.draw.start}
    </Button>
  );
}

function IconAction({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
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

/** Floating bar over the canvas, only while drawing: tool, color, width, undo/redo, done. */
export function DrawToolbar() {
  const draw = useEditorStore((state) => state.draw);
  const setDrawTool = useEditorStore((state) => state.setDrawTool);
  const setDrawStyle = useEditorStore((state) => state.setDrawStyle);
  const undoDraw = useEditorStore((state) => state.undoDraw);
  const redoDraw = useEditorStore((state) => state.redoDraw);
  const exitDraw = useEditorStore((state) => state.exitDraw);
  const { t } = useI18n();
  const copy = t.draw;

  return (
    <div className="pointer-events-none absolute inset-x-2 top-2 z-10 flex flex-col items-center gap-1">
      <div
        role="toolbar"
        aria-label={copy.toolbar}
        className="pointer-events-auto flex max-w-full flex-wrap items-center gap-1.5 rounded-lg border bg-background/95 p-1.5 shadow-sm backdrop-blur"
      >
        <ToggleGroup
          type="single"
          variant="outline"
          size="sm"
          value={draw.tool}
          onValueChange={(value) => value && setDrawTool(value as DrawTool)}
          aria-label={copy.toolbar}
        >
          {TOOLS.map((tool) => {
            const Icon = TOOL_ICONS[tool];
            const label = `${copy.tools[tool]} (${DRAW_SHORTCUTS[tool]})`;
            return (
              <Tooltip key={tool}>
                <TooltipTrigger asChild>
                  <ToggleGroupItem value={tool} aria-label={label}>
                    <Icon />
                  </ToggleGroupItem>
                </TooltipTrigger>
                <TooltipContent>{label}</TooltipContent>
              </Tooltip>
            );
          })}
        </ToggleGroup>

        <Separator orientation="vertical" className="h-6" />

        <div className="flex items-center gap-1">
          <input
            type="color"
            aria-label={copy.color}
            title={copy.color}
            value={toHexColor(draw.color) ?? DEFAULT_DRAW_COLOR}
            onChange={(event) => setDrawStyle({ color: event.target.value })}
            className="size-7 cursor-pointer rounded border bg-transparent p-0.5"
          />
        </div>

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

        <IconAction label={copy.undo} disabled={draw.past.length === 0} onClick={undoDraw}>
          <Undo2Icon />
        </IconAction>
        <IconAction label={copy.redo} disabled={draw.future.length === 0} onClick={redoDraw}>
          <Redo2Icon />
        </IconAction>

        <Button size="sm" onClick={exitDraw}>
          <CheckIcon data-icon="inline-start" />
          {copy.done}
        </Button>
      </div>
      <p className="hidden rounded-md bg-foreground/85 px-2 py-1 text-background text-xs sm:block">
        {draw.tool === "pen" ? copy.penHint : copy.hint}
      </p>
    </div>
  );
}
