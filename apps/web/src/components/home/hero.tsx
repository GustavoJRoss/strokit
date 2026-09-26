"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n/provider";
import { HeroMark } from "./hero-mark";
import { Reveal } from "./reveal";

export function Hero() {
  const { t } = useI18n();
  const copy = t.home.hero;
  return (
    <section className="mx-auto grid max-w-6xl items-center gap-12 px-4 pt-16 pb-24 sm:px-6 md:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] md:pt-24">
      <Reveal from="left" fade={false} className="flex flex-col gap-8">
        <p className="font-mono text-muted-foreground text-xs uppercase tracking-[0.2em]">
          {copy.eyebrow}
        </p>
        <h1 className="text-balance font-display text-[clamp(2.25rem,10vw,3.5rem)] uppercase leading-[0.88] md:text-[clamp(2.5rem,5vw,4.75rem)]">
          {copy.title}
        </h1>
        <p className="max-w-xl text-lg text-muted-foreground">
          {copy.body} <code className="font-mono text-sm">prefers-reduced-motion</code>.
        </p>
        <div className="flex flex-wrap gap-3">
          <Button asChild size="lg">
            <Link href="/editor">{copy.openEditor}</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <a href="#exemplos">{copy.seeExamples}</a>
          </Button>
        </div>
      </Reveal>
      <Reveal from="right" delay={150} className="flex justify-center md:justify-end">
        <HeroMark />
      </Reveal>
    </section>
  );
}
