"use client";

import { DownloadIcon, ExternalLinkIcon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useI18n } from "@/lib/i18n/provider";
import { gallery } from "./generated/gallery";
import { Reveal } from "./reveal";
import { SectionHeading } from "./section-heading";

const SPEEDS = [0.5, 1, 2];

/**
 * Every card is an exported React component: pure CSS animation, no JS runtime. Theme colors
 * come from `--sk-stroke`; speed from the component's `speed` prop (a CSS variable).
 */
export function GallerySection() {
  const { t } = useI18n();
  const copy = t.home.gallery;
  return (
    <section id="exemplos" className="scroll-mt-20 border-t">
      <div className="mx-auto flex max-w-6xl flex-col gap-12 px-4 py-24 sm:px-6">
        <SectionHeading index="04" eyebrow={copy.eyebrow} title={copy.title} lead={copy.lead} />
        <Gallery />
      </div>
    </section>
  );
}

export function Gallery() {
  const [themed, setThemed] = useState(true);
  const [speed, setSpeed] = useState(1);
  const { t } = useI18n();
  const copy = t.home.gallery;

  return (
    <div className="flex flex-col gap-6">
      <Reveal from="right" className="flex flex-wrap items-center gap-x-8 gap-y-3">
        <div className="flex items-center gap-2">
          <Switch id="gallery-themed" checked={themed} onCheckedChange={setThemed} />
          <Label htmlFor="gallery-themed" className="text-sm">
            {copy.themeColor} (<code className="font-mono text-xs">--sk-stroke: currentColor</code>)
          </Label>
        </div>
        <div className="flex items-center gap-2">
          <span id="gallery-speed" className="font-medium text-sm">
            {copy.speed}
          </span>
          <ToggleGroup
            type="single"
            size="sm"
            variant="outline"
            value={String(speed)}
            onValueChange={(value) => value && setSpeed(Number(value))}
            aria-labelledby="gallery-speed"
          >
            {SPEEDS.map((value) => (
              <ToggleGroupItem key={value} value={String(value)} className="px-3 font-mono">
                {value}x
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
      </Reveal>
      <ul
        className="grid gap-px border bg-border sm:grid-cols-2 lg:grid-cols-3"
        style={themed ? { ["--sk-stroke" as string]: "currentColor" } : undefined}
      >
        {gallery.map((item, index) => {
          const label = t.presets[item.preset as keyof typeof t.presets]?.label ?? item.presetLabel;
          const name = t.examples[item.exampleId as keyof typeof t.examples]?.name ?? item.name;
          return (
            <li key={item.id} data-testid={`gallery-${item.id}`} className="bg-background">
              <Reveal
                from={index % 2 === 0 ? "left" : "right"}
                delay={(index % 3) * 80}
                className="flex h-full flex-col"
              >
                <div className="flex aspect-[4/3] items-center justify-center p-10">
                  <item.Component size="100%" speed={speed} />
                </div>
                <div className="mt-auto flex items-end justify-between gap-4 border-t px-5 py-4">
                  <div className="flex flex-col">
                    <span className="font-display text-base uppercase leading-tight">{label}</span>
                    <span className="font-mono text-muted-foreground text-xs">
                      {item.preset} · {name}
                    </span>
                  </div>
                  <div className="flex gap-3">
                    <a
                      href={item.download}
                      download
                      className="text-muted-foreground hover:text-foreground"
                      aria-label={copy.download(label, name)}
                      title={copy.downloadHint}
                    >
                      <DownloadIcon className="size-4" />
                    </a>
                    <Link
                      href={item.editorHref}
                      className="text-muted-foreground hover:text-foreground"
                      aria-label={copy.open(label, name)}
                      title={copy.openHint}
                    >
                      <ExternalLinkIcon className="size-4" />
                    </Link>
                  </div>
                </div>
              </Reveal>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
