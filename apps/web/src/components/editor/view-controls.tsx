"use client";

import { FocusIcon, MinusIcon, PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useI18n } from "@/lib/i18n/provider";
import { isCentered, MAX_SCALE, MIN_SCALE, type View } from "@/lib/view";

type ViewControlsProps = {
  view: View;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onCenter: () => void;
};

/** Zoom buttons, the zoom level and the way back to the centered canvas. */
export function ViewControls({ view, onZoomIn, onZoomOut, onCenter }: ViewControlsProps) {
  const { t } = useI18n();
  const copy = t.view;
  const centered = isCentered(view);
  return (
    <div
      role="toolbar"
      aria-label={copy.zoom}
      className="pointer-events-auto flex items-center gap-0.5 rounded-xl border bg-background/95 p-1.5 shadow-lg backdrop-blur"
    >
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={copy.zoomOut}
            disabled={view.scale <= MIN_SCALE}
            onClick={onZoomOut}
          >
            <MinusIcon />
          </Button>
        </TooltipTrigger>
        <TooltipContent>{`${copy.zoomOut} (-)`}</TooltipContent>
      </Tooltip>
      <output
        aria-label={copy.zoom}
        className="w-11 text-center text-muted-foreground text-xs tabular-nums"
      >
        {Math.round(view.scale * 100)}%
      </output>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={copy.zoomIn}
            disabled={view.scale >= MAX_SCALE}
            onClick={onZoomIn}
          >
            <PlusIcon />
          </Button>
        </TooltipTrigger>
        <TooltipContent>{`${copy.zoomIn} (+)`}</TooltipContent>
      </Tooltip>
      <Button
        variant={centered ? "ghost" : "secondary"}
        size="sm"
        disabled={centered}
        onClick={onCenter}
        aria-label={`${copy.center} (0)`}
        title={`${copy.center} (0)`}
      >
        <FocusIcon data-icon="inline-start" />
        <span className="hidden sm:inline">{copy.center}</span>
      </Button>
    </div>
  );
}
