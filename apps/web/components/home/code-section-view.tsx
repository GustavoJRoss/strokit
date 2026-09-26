"use client";

import { useI18n } from "@/lib/i18n/provider";
import { CodeTabs } from "./code-tabs";
import { Reveal } from "./reveal";
import { SectionHeading } from "./section-heading";

type Format = "css" | "react" | "motion";

export function CodeSectionView({
  html,
  raw,
}: {
  html: Record<Format, string>;
  raw: Record<Format, string>;
}) {
  const { t } = useI18n();
  const copy = t.home.code;
  return (
    <section id="codigo" className="scroll-mt-20 border-t">
      <div className="mx-auto flex max-w-6xl flex-col gap-12 px-4 py-24 sm:px-6">
        <SectionHeading index="05" eyebrow={copy.eyebrow} title={copy.title} lead={copy.lead} />
        <div className="grid gap-8 lg:grid-cols-[1fr_1.4fr]">
          <ul className="flex flex-col">
            {copy.features.map((feature, index) => (
              <li key={feature.title} className="border-t py-5 first:border-t-0 first:pt-0">
                <Reveal from="left" delay={index * 80} className="flex flex-col gap-1">
                  <h3 className="font-display text-xl uppercase">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.text}</p>
                </Reveal>
              </li>
            ))}
          </ul>
          <Reveal from="right" className="min-w-0">
            <CodeTabs html={html} raw={raw} />
          </Reveal>
        </div>
      </div>
    </section>
  );
}
