"use client";

import type { ComponentType } from "react";
import { useI18n } from "@/lib/i18n/provider";
import { cn } from "@/lib/utils";
import { AnelComet } from "./generated/AnelComet";
import { OndaYoyo } from "./generated/OndaYoyo";
import { PicoDrawFill } from "./generated/PicoDrawFill";
import { Reveal } from "./reveal";
import { SectionHeading } from "./section-heading";

const VISUALS: ComponentType<{ size?: number | string; label?: string }>[] = [
  PicoDrawFill,
  OndaYoyo,
  AnelComet,
];

export function HowItWorks() {
  const { t } = useI18n();
  const copy = t.home.how;
  return (
    <section id="como-funciona" className="scroll-mt-20 border-t">
      <div className="mx-auto flex max-w-6xl flex-col gap-16 px-4 py-24 sm:px-6">
        <SectionHeading index="02" eyebrow={copy.eyebrow} title={copy.title} />
        <ol className="flex flex-col gap-16">
          {copy.steps.map((step, index) => {
            const flip = index % 2 === 1;
            const Visual = VISUALS[index] ?? AnelComet;
            const number = String(index + 1).padStart(2, "0");
            return (
              <li key={number} className="grid items-center gap-8 md:grid-cols-2">
                <Reveal
                  from={flip ? "right" : "left"}
                  className={cn("flex flex-col gap-3", flip && "md:order-2")}
                >
                  <span className="font-display text-6xl text-muted-foreground/40">{number}</span>
                  <h3 className="font-display text-3xl uppercase">{step.title}</h3>
                  <p className="max-w-md text-lg text-muted-foreground">{step.text}</p>
                </Reveal>
                <Reveal
                  from={flip ? "left" : "right"}
                  delay={120}
                  className="flex aspect-[5/3] items-center justify-center border p-8"
                >
                  <div className="size-full" style={{ ["--sk-stroke" as string]: "currentColor" }}>
                    <Visual size="100%" label={step.alt} />
                  </div>
                </Reveal>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
