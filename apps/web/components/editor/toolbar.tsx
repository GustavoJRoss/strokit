"use client";

import { PauseIcon, PlayIcon, RotateCcwIcon } from "lucide-react";
import Link from "next/link";
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
import { type Background, useEditorStore } from "@/store/editor-store";
import { ExamplesMenu, FilePickerButton, PasteDialogButton } from "./import-controls";

const RATES = [0.25, 0.5, 1, 1.5, 2];

const BACKGROUNDS: { value: Background; label: string }[] = [
  { value: "light", label: "Claro" },
  { value: "dark", label: "Escuro" },
  { value: "checker", label: "Xadrez" },
];

export function Toolbar() {
  const hasDoc = useEditorStore((state) => state.doc !== null);
  const fileName = useEditorStore((state) => state.fileName);
  const playback = useEditorStore((state) => state.playback);
  const togglePlaying = useEditorStore((state) => state.togglePlaying);
  const restart = useEditorStore((state) => state.restart);
  const setRate = useEditorStore((state) => state.setRate);
  const setBackground = useEditorStore((state) => state.setBackground);
  const setReducedMotion = useEditorStore((state) => state.setReducedMotion);

  return (
    <header className="flex flex-wrap items-center gap-2 border-b px-3 py-2">
      <Link href="/" className="mr-2 font-semibold tracking-tight">
        strokekit
      </Link>
      <FilePickerButton />
      <PasteDialogButton />
      <ExamplesMenu />
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
              aria-label={playback.playing ? "Pausar" : "Reproduzir"}
            >
              {playback.playing ? <PauseIcon /> : <PlayIcon />}
            </Button>
          </TooltipTrigger>
          <TooltipContent>{playback.playing ? "Pausar" : "Reproduzir"}</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="icon-sm"
              disabled={!hasDoc}
              onClick={restart}
              aria-label="Reiniciar"
            >
              <RotateCcwIcon />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Reiniciar</TooltipContent>
        </Tooltip>
        <Select
          value={String(playback.rate)}
          onValueChange={(value) => setRate(Number(value))}
          disabled={!hasDoc}
        >
          <SelectTrigger size="sm" aria-label="Velocidade do preview" className="w-20">
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
          aria-label="Fundo do preview"
        >
          {BACKGROUNDS.map((background) => (
            <ToggleGroupItem key={background.value} value={background.value}>
              {background.label}
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
            Simular reduced motion
          </Label>
        </div>
      </div>
    </header>
  );
}
