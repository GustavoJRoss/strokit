"use client";

import {
  applyPreset,
  compile,
  createEmptySpec,
  exporters,
  getPreset,
  importSvg,
  type PresetId,
  presetIds,
} from "@strokit/core";
import { CheckIcon, CopyIcon, ExternalLinkIcon } from "lucide-react";
import Link from "next/link";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { CodeBlock } from "@/components/editor/code-block";
import { NumberField } from "@/components/editor/number-field";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { EXAMPLES, fetchExample } from "@/lib/examples";
import { useI18n } from "@/lib/i18n/provider";
import { injectMarkup } from "@/lib/preview";
import { shareHash } from "@/lib/project";

/**
 * The editor in miniature: the real core compiles the animation in the browser and the
 * preview renders the exact CSS shown next to it (preview = export).
 */
export function Playground() {
  const [exampleId, setExampleId] = useState("orbita");
  const [preset, setPreset] = useState<PresetId>("draw-fill");
  const [duration, setDuration] = useState(getPreset("draw-fill").defaults.timing.duration);
  const [themed, setThemed] = useState(true);
  const [repeat, setRepeat] = useState(true);
  const [markups, setMarkups] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState(false);
  const hostRef = useRef<HTMLDivElement>(null);
  const { t } = useI18n();
  const text = t.home.playground;
  const [root, setRoot] = useState<ShadowRoot | null>(null);

  const example = EXAMPLES.find((item) => item.id === exampleId) ?? EXAMPLES[0];
  const markup = example ? markups[example.id] : undefined;

  useEffect(() => {
    if (!example || markups[example.id]) return;
    let cancelled = false;
    fetchExample(example)
      .then((text) => {
        if (!cancelled) setMarkups((current) => ({ ...current, [example.id]: text }));
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [example, markups]);

  const result = useMemo(() => {
    if (!markup || !example) return null;
    const { document } = importSvg(markup, { parser: new DOMParser() });
    const spec = applyPreset(
      createEmptySpec(t.examples[example.id].name),
      document.elements.map((element) => element.id),
      preset,
    );
    spec.global.a11y.label = t.examples[example.id].name;
    spec.global.autoStroke.enabled = document.elements.some((element) => !element.hasStroke);
    for (const track of spec.tracks) {
      track.timing.duration = duration;
      if (repeat) track.timing.iterations = "infinite";
    }
    const css = exporters.css(compile(document, spec));
    return { css, hash: shareHash({ svg: document.raw, spec }) };
  }, [markup, example, preset, duration, repeat, t]);

  useLayoutEffect(() => {
    const host = hostRef.current;
    if (host) setRoot(host.shadowRoot ?? host.attachShadow({ mode: "open" }));
  }, []);

  useLayoutEffect(() => {
    if (root) injectMarkup(root, result?.css ?? null);
  }, [root, result]);

  const choosePreset = (next: PresetId) => {
    setPreset(next);
    setDuration(getPreset(next).defaults.timing.duration);
  };

  const copy = async () => {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result.css);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
      <div className="flex flex-col gap-6 border p-5">
        <div className="flex flex-col gap-2">
          <Label htmlFor="playground-example" className="text-sm">
            {text.logo}
          </Label>
          <Select value={exampleId} onValueChange={setExampleId}>
            <SelectTrigger id="playground-example" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {EXAMPLES.map((item) => (
                <SelectItem key={item.id} value={item.id}>
                  {t.examples[item.id].name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-2">
          <span id="playground-preset" className="font-medium text-sm">
            {text.preset}
          </span>
          <ToggleGroup
            type="single"
            variant="outline"
            size="sm"
            value={preset}
            onValueChange={(value) => value && choosePreset(value as PresetId)}
            aria-labelledby="playground-preset"
            className="flex flex-wrap justify-start"
          >
            {presetIds.map((id) => (
              <ToggleGroupItem key={id} value={id} className="flex-none px-2.5">
                {t.presets[id].label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
        <NumberField
          label={text.duration}
          unit="ms"
          value={duration}
          min={200}
          max={6000}
          step={100}
          onChange={setDuration}
        />
        <div className="flex items-center justify-between gap-2">
          <Label htmlFor="playground-repeat" className="text-sm">
            {text.repeat}
          </Label>
          <Switch id="playground-repeat" checked={repeat} onCheckedChange={setRepeat} />
        </div>
        <div className="flex items-center justify-between gap-2">
          <Label htmlFor="playground-themed" className="text-sm">
            {text.themeColor} (<code className="font-mono text-xs">--sk-stroke</code>)
          </Label>
          <Switch id="playground-themed" checked={themed} onCheckedChange={setThemed} />
        </div>
      </div>

      <div className="grid min-w-0 gap-6 xl:grid-cols-2">
        <div
          className="relative aspect-[4/3] max-h-[440px] w-full border p-8 xl:aspect-square xl:max-h-none"
          style={themed ? { ["--sk-stroke" as string]: "currentColor" } : undefined}
        >
          <div ref={hostRef} data-testid="playground-preview" className="size-full" />
        </div>
        <div className="flex min-w-0 flex-col border">
          <div className="flex items-center gap-2 border-b px-3 py-2">
            <span className="font-mono text-muted-foreground text-xs uppercase tracking-widest">
              {text.exported}
            </span>
            <div className="ml-auto flex gap-2">
              <Button variant="outline" size="sm" onClick={copy} disabled={!result}>
                {copied ? (
                  <CheckIcon data-icon="inline-start" />
                ) : (
                  <CopyIcon data-icon="inline-start" />
                )}
                {copied ? t.common.copied : t.common.copy}
              </Button>
              {result?.hash ? (
                <Button asChild size="sm">
                  <Link href={`/editor${result.hash}`}>
                    <ExternalLinkIcon data-icon="inline-start" />
                    {text.openInEditor}
                  </Link>
                </Button>
              ) : null}
            </div>
          </div>
          <div className="h-80 overflow-auto bg-muted/40 xl:h-auto xl:max-h-[520px] xl:flex-1">
            {result ? (
              <CodeBlock code={result.css} lang="html" />
            ) : (
              <p className="p-4 text-muted-foreground text-sm">{t.common.loading}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
