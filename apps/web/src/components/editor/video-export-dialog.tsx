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
import { useI18n } from "@/lib/i18n/provider";
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
  { value: "original", color: undefined },
  { value: "white", color: "#ffffff" },
  { value: "black", color: "#000000" },
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
  const { t } = useI18n();

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
      toast.success(t.video.done, { description: t.video.doneBody(size.width, size.height, fps) });
      setOpen(false);
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError")) {
        toast.error(t.video.failed);
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
        {t.video.button}
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
            <DialogTitle>{t.video.title}</DialogTitle>
            <DialogDescription>{t.video.description}</DialogDescription>
          </DialogHeader>

          {support === "checking" ? (
            <p className="text-muted-foreground text-sm">{t.video.checking}</p>
          ) : support === "no" ? (
            <p role="alert" className="border p-3 text-sm">
              {t.video.unsupported}
            </p>
          ) : (
            <div className="flex flex-col gap-5">
              <NumberField
                label={t.video.width}
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
                  {t.video.output(size.width, size.height)}
                </p>
              ) : null}
              <NumberField
                label={t.video.duration}
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
                  {t.video.fps}
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
                  {t.video.strokeColor}
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
                        {t.video.strokes[item.value]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {busy ? (
                <div className="flex flex-col gap-2">
                  <div
                    role="progressbar"
                    aria-label={t.video.progressLabel}
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
                    {t.video.progress(Math.round((progress ?? 0) * 100))}
                  </p>
                </div>
              ) : null}
            </div>
          )}

          <DialogFooter>
            {busy ? (
              <Button variant="outline" onClick={() => abort.current?.abort()}>
                {t.common.cancel}
              </Button>
            ) : null}
            <Button onClick={run} disabled={support !== "yes" || busy || !compiled}>
              <FilmIcon data-icon="inline-start" />
              {t.video.export}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
