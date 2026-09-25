"use client";

import { animationLength } from "@strokit/core";
import { FilmIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { slug } from "@/lib/project";
import { downloadBlob } from "@/lib/svg-file";
import {
  canExportTransparentVideo,
  exportTransparentVideo,
  MAX_VIDEO_SIZE,
  videoSize,
} from "@/lib/video-export";
import { useEditorStore } from "@/store/editor-store";
import { selectCompiled } from "@/store/selectors";
import { NumberField } from "./number-field";

const STROKES = [
  { value: "original", label: "Cores originais", color: undefined },
  { value: "white", label: "Branco", color: "#ffffff" },
  { value: "black", label: "Preto", color: "#000000" },
] as const;

type Support = "checking" | "yes" | "no";

export function VideoExportButton() {
  const compiled = useEditorStore(selectCompiled);
  const doc = useEditorStore((state) => state.doc);
  const name = useEditorStore((state) => state.spec.name);
  const [open, setOpen] = useState(false);
  const [support, setSupport] = useState<Support>("checking");
  const [width, setWidth] = useState(1080);
  const [fps, setFps] = useState<30 | 60>(60);
  const [seconds, setSeconds] = useState(2);
  const [stroke, setStroke] = useState<(typeof STROKES)[number]["value"]>("original");
  const [progress, setProgress] = useState<number | null>(null);
  const abort = useRef<AbortController | null>(null);

  const size = doc ? videoSize(doc.viewBox, width) : null;

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setSupport("checking");
    canExportTransparentVideo().then((ok) => {
      if (!cancelled) setSupport(ok ? "yes" : "no");
    });
    if (compiled) setSeconds(Math.min(20, Math.round(animationLength(compiled) / 100) / 10));
    return () => {
      cancelled = true;
    };
  }, [open, compiled]);

  const run = async () => {
    if (!compiled || !size) return;
    const controller = new AbortController();
    abort.current = controller;
    setProgress(0);
    try {
      const color = STROKES.find((item) => item.value === stroke)?.color;
      const blob = await exportTransparentVideo(
        compiled,
        { ...size, fps, durationMs: seconds * 1000, ...(color ? { strokeColor: color } : {}) },
        { onProgress: setProgress, signal: controller.signal },
      );
      downloadBlob(blob, `${slug(name)}.webm`);
      toast.success("Vídeo exportado", {
        description: `${size.width}×${size.height}, ${fps} fps, fundo transparente.`,
      });
      setOpen(false);
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError")) {
        toast.error("Não foi possível gerar o vídeo.");
      }
    } finally {
      abort.current = null;
      setProgress(null);
    }
  };

  const busy = progress !== null;

  return (
    <>
      <Button variant="outline" size="sm" disabled={!compiled} onClick={() => setOpen(true)}>
        <FilmIcon data-icon="inline-start" />
        Vídeo
      </Button>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (!next) abort.current?.abort();
          setOpen(next);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Exportar vídeo transparente</DialogTitle>
            <DialogDescription>
              Um .webm (VP9) com fundo transparente, gerado quadro a quadro no seu navegador. O SVG
              não sai do seu computador.
            </DialogDescription>
          </DialogHeader>

          {support === "checking" ? (
            <p className="text-muted-foreground text-sm">Verificando o suporte do navegador…</p>
          ) : support === "no" ? (
            <p role="alert" className="border p-3 text-sm">
              Este navegador não consegue gravar vídeo com transparência (VP9 com canal alfa). Use
              uma versão recente do <strong>Chrome</strong>, do <strong>Edge</strong> ou do{" "}
              <strong>Firefox</strong>.
            </p>
          ) : (
            <div className="flex flex-col gap-5">
              <NumberField
                label="Largura"
                unit="px"
                value={width}
                min={256}
                max={MAX_VIDEO_SIZE}
                step={2}
                disabled={busy}
                onChange={setWidth}
              />
              {size ? (
                <p className="-mt-3 text-muted-foreground text-xs">
                  Saída: {size.width} × {size.height} px (mantém a proporção do SVG).
                </p>
              ) : null}
              <NumberField
                label="Duração"
                unit="s"
                value={seconds}
                min={0.5}
                max={20}
                step={0.1}
                disabled={busy}
                onChange={setSeconds}
              />
              <div className="flex items-center justify-between gap-2">
                <span id="video-fps" className="font-medium text-sm">
                  Quadros por segundo
                </span>
                <ToggleGroup
                  type="single"
                  size="sm"
                  variant="outline"
                  value={String(fps)}
                  onValueChange={(value) => value && setFps(Number(value) as 30 | 60)}
                  aria-labelledby="video-fps"
                  disabled={busy}
                >
                  <ToggleGroupItem value="30" className="px-3">
                    30
                  </ToggleGroupItem>
                  <ToggleGroupItem value="60" className="px-3">
                    60
                  </ToggleGroupItem>
                </ToggleGroup>
              </div>
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="video-stroke" className="text-sm">
                  Cor do traço
                </Label>
                <Select
                  value={stroke}
                  onValueChange={(value) => setStroke(value as typeof stroke)}
                  disabled={busy}
                >
                  <SelectTrigger id="video-stroke" size="sm" className="w-44">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STROKES.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {busy ? (
                <div className="flex flex-col gap-2">
                  <div
                    role="progressbar"
                    aria-label="Progresso da exportação"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={Math.round((progress ?? 0) * 100)}
                    className="h-1.5 w-full bg-muted"
                  >
                    <div
                      className="h-full bg-foreground"
                      style={{ width: `${(progress ?? 0) * 100}%` }}
                    />
                  </div>
                  <p className="text-muted-foreground text-xs">
                    Gerando quadros… {Math.round((progress ?? 0) * 100)}%
                  </p>
                </div>
              ) : null}
            </div>
          )}

          <DialogFooter>
            {busy ? (
              <Button variant="outline" onClick={() => abort.current?.abort()}>
                Cancelar
              </Button>
            ) : null}
            <Button onClick={run} disabled={support !== "yes" || busy || !compiled}>
              <FilmIcon data-icon="inline-start" />
              Exportar .webm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
