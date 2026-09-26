"use client";

import { PauseIcon, PlayIcon, RotateCcwIcon } from "lucide-react";
import Link from "next/link";
import { Wordmark } from "@/components/home/brand";
import { LanguageSwitcher } from "@/components/language-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useI18n } from "@/lib/i18n/provider";
import { type Background, useEditorStore } from "@/store/editor-store";
import { ExamplesMenu, FilePickerButton, PasteDialogButton } from "./import-controls";
import { LayoutMenu } from "./layout-menu";
import { ShareMenu } from "./share-menu";

const RATES = [0.25, 0.5, 1, 1.5, 2];

const BACKGROUNDS: Background[] = ["light", "dark", "checker"];

export function Toolbar() {
  const hasDoc = useEditorStore((state) => state.doc !== null);
  const fileName = useEditorStore((state) => state.fileName);
  const playback = useEditorStore((state) => state.playback);
  const togglePlaying = useEditorStore((state) => state.togglePlaying);
  const restart = useEditorStore((state) => state.restart);
  const setRate = useEditorStore((state) => state.setRate);
  const setBackground = useEditorStore((state) => state.setBackground);
  const setReducedMotion = useEditorStore((state) => state.setReducedMotion);
  const { t } = useI18n();
  const playLabel = playback.playing ? t.toolbar.pause : t.toolbar.play;

  return (
    <header className="flex flex-wrap items-center gap-2 border-b px-3 py-2">
      <Link href="/" className="mr-2" aria-label={t.common.home}>
        <Wordmark />
      </Link>
      <FilePickerButton />
      <PasteDialogButton />
      <ExamplesMenu />
      <ShareMenu />
      {fileName && (
        <span className="ml-1 truncate text-muted-foreground text-sm" title={fileName}>
          {fileName}
        </span>
      )}

      <div className="ml-auto flex flex-wrap items-center gap-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="icon-sm"
              disabled={!hasDoc}
              onClick={togglePlaying}
              aria-label={playLabel}
            >
              {playback.playing ? <PauseIcon /> : <PlayIcon />}
            </Button>
          </TooltipTrigger>
          <TooltipContent>{playLabel}</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="icon-sm"
              disabled={!hasDoc}
              onClick={restart}
              aria-label={t.toolbar.restart}
            >
              <RotateCcwIcon />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{t.toolbar.restart}</TooltipContent>
        </Tooltip>
        <Select
          value={String(playback.rate)}
          onValueChange={(value) => setRate(Number(value))}
          disabled={!hasDoc}
        >
          <SelectTrigger size="sm" aria-label={t.toolbar.speed} className="w-20">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {RATES.map((rate) => (
              <SelectItem key={rate} value={String(rate)}>
                {rate}x
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Separator orientation="vertical" className="h-6" />

        <ToggleGroup
          type="single"
          variant="outline"
          size="sm"
          value={playback.background}
          onValueChange={(value) => value && setBackground(value as Background)}
          aria-label={t.toolbar.background}
        >
          {BACKGROUNDS.map((background) => (
            <ToggleGroupItem key={background} value={background}>
              {t.toolbar.backgrounds[background]}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>

        <Separator orientation="vertical" className="h-6" />

        <div className="flex items-center gap-2">
          <Switch
            id="reduced-motion"
            checked={playback.reducedMotion}
            onCheckedChange={setReducedMotion}
            disabled={!hasDoc}
          />
          <Label htmlFor="reduced-motion" className="text-sm">
            {t.toolbar.reducedMotion}
          </Label>
        </div>

        <Separator orientation="vertical" className="h-6" />
        <LayoutMenu />
        <LanguageSwitcher />
        <ThemeToggle />
      </div>
    </header>
  );
}
