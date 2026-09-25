import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { AnelComet } from "./generated/AnelComet";
import { AssinaturaDraw } from "./generated/AssinaturaDraw";
import { OndaYoyo } from "./generated/OndaYoyo";
import { Reveal } from "./reveal";
import { SectionHeading } from "./section-heading";

const STEPS: { number: string; title: string; text: string; visual: ReactNode }[] = [
  {
    number: "01",
    title: "Arraste o SVG",
    text: "Solte a logo, escolha um arquivo ou cole o markup. Tudo é sanitizado e nada sai do seu navegador.",
    visual: <AssinaturaDraw size="100%" label="Assinatura se desenhando" />,
  },
  {
    number: "02",
    title: "Escolha e ajuste",
    text: "Sete presets de traço, com duração, atraso, easing e curva personalizada. O preview é exatamente o código exportado.",
    visual: <OndaYoyo size="100%" label="Ondas com riscos indo e voltando" />,
  },
  {
    number: "03",
    title: "Copie o código",
    text: "CSS puro, componente React tipado ou Motion. Ou um link que guarda a animação inteira.",
    visual: <AnelComet size="100%" label="Anel com um cometa girando" />,
  },
];

export function HowItWorks() {
  return (
    <section id="como-funciona" className="scroll-mt-20 border-t">
      <div className="mx-auto flex max-w-6xl flex-col gap-16 px-4 py-24 sm:px-6">
        <SectionHeading index="02" eyebrow="Como funciona" title="Três passos. Nenhuma timeline." />
        <ol className="flex flex-col gap-16">
          {STEPS.map((step, index) => {
            const flip = index % 2 === 1;
            return (
              <li key={step.number} className="grid items-center gap-8 md:grid-cols-2">
                <Reveal
                  from={flip ? "right" : "left"}
                  className={cn("flex flex-col gap-3", flip && "md:order-2")}
                >
                  <span className="font-display text-6xl text-muted-foreground/40">
                    {step.number}
                  </span>
                  <h3 className="font-display text-3xl uppercase">{step.title}</h3>
                  <p className="max-w-md text-lg text-muted-foreground">{step.text}</p>
                </Reveal>
                <Reveal
                  from={flip ? "left" : "right"}
                  delay={120}
                  className="flex aspect-[5/3] items-center justify-center border p-8"
                >
                  <div className="size-full" style={{ ["--sk-stroke" as string]: "currentColor" }}>
                    {step.visual}
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
