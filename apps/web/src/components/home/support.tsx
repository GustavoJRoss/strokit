"use client";

import { HeartIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n/provider";
import { site } from "@/lib/site";
import { SupportHeart } from "./generated/SupportHeart";
import { Reveal } from "./reveal";

export function Support() {
  const { t } = useI18n();
  const copy = t.home.support;
  return (
    <section id="apoie" className="scroll-mt-20 border-t bg-foreground text-background">
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-24 sm:px-6 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <Reveal from="left" className="flex flex-col gap-6">
          <p className="font-mono text-background/60 text-xs uppercase tracking-[0.2em]">
            07 — {copy.eyebrow}
          </p>
          <h2 className="text-balance font-display text-[clamp(2rem,8vw,3.75rem)] uppercase leading-[0.92]">
            {copy.title}
          </h2>
          <p className="max-w-xl text-background/70 text-lg">{copy.body}</p>
          <div className="flex flex-col items-start gap-2">
            {site.donationUrl ? (
              <Button asChild size="lg" variant="secondary">
                <a href={site.donationUrl} target="_blank" rel="noreferrer">
                  <HeartIcon data-icon="inline-start" />
                  {copy.button}
                </a>
              </Button>
            ) : (
              <Button type="button" size="lg" variant="secondary" data-testid="donate-button">
                <HeartIcon data-icon="inline-start" />
                {copy.button}
              </Button>
            )}
            {site.donationUrl ? null : (
              <span className="text-background/60 text-sm">{copy.soon}</span>
            )}
          </div>
        </Reveal>
        <Reveal from="right" delay={150} className="flex justify-center">
          <div
            className="aspect-square w-56 sm:w-72"
            style={{ ["--sk-stroke" as string]: "currentColor" }}
          >
            <SupportHeart size="100%" label={copy.heart} />
          </div>
        </Reveal>
      </div>
    </section>
  );
}
