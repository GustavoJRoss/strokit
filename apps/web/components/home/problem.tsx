"use client";

import { useI18n } from "@/lib/i18n/provider";
import { Reveal } from "./reveal";
import { SectionHeading } from "./section-heading";

export function Problem() {
  const { t } = useI18n();
  const copy = t.home.problem;
  return (
    <section className="mx-auto flex max-w-6xl flex-col gap-12 px-4 py-24 sm:px-6">
      <SectionHeading index="01" eyebrow={copy.eyebrow} title={copy.title} lead={copy.lead} />
      <div className="grid gap-6 md:grid-cols-2">
        <Reveal from="left" className="flex h-full flex-col gap-4 border p-6 sm:p-8">
          <h3 className="font-display text-2xl uppercase">{copy.visualTitle}</h3>
          <ul className="flex flex-col gap-2 text-muted-foreground">
            {copy.visual.map((item) => (
              <li key={item}>— {item}</li>
            ))}
          </ul>
        </Reveal>
        <Reveal from="right" delay={120} className="flex h-full flex-col gap-4 border p-6 sm:p-8">
          <h3 className="font-display text-2xl uppercase">{copy.handTitle}</h3>
          <pre className="overflow-x-auto bg-muted p-4 font-mono text-sm leading-relaxed">
            <code>{`stroke-dasharray: 347.21; /* ??? */
stroke-dashoffset: 347.21;
animation: draw 1.2s /* ok? */;`}</code>
          </pre>
          <p className="text-muted-foreground">{copy.hand}</p>
        </Reveal>
      </div>
      <Reveal from="left">
        <p className="max-w-3xl font-display text-2xl uppercase leading-tight sm:text-3xl">
          {copy.conclusion}
        </p>
      </Reveal>
    </section>
  );
}
