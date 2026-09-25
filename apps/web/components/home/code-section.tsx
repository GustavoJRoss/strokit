import { highlight } from "@/lib/highlight";
import { CodeTabs } from "./code-tabs";
import { codeSamples } from "./generated/code-samples";
import { Reveal } from "./reveal";
import { SectionHeading } from "./section-heading";

const FEATURES = [
  {
    title: "Zero runtime",
    text: "O CSS é o próprio SVG com <style>. O React não depende de nada além de React.",
  },
  {
    title: "Tema de verdade",
    text: "Cores saem como var(--sk-stroke, …). Troque por currentColor e a logo segue seu tema.",
  },
  {
    title: "Reduced motion",
    text: "Todo export tem @media (prefers-reduced-motion) mostrando o quadro final.",
  },
  {
    title: "Props sem re-render",
    text: "speed, loop e paused viram variáveis CSS no componente React.",
  },
];

export async function CodeSection() {
  const html = {
    css: await highlight(codeSamples.css, "html"),
    react: await highlight(codeSamples.react, "tsx"),
    motion: await highlight(codeSamples.motion, "tsx"),
  };
  return (
    <section id="codigo" className="scroll-mt-20 border-t">
      <div className="mx-auto flex max-w-6xl flex-col gap-12 px-4 py-24 sm:px-6">
        <SectionHeading
          index="05"
          eyebrow="O código"
          title="Código que você colaria no seu projeto"
          lead="A mesma animação nos três formatos. Tudo gerado, nada editado à mão."
        />
        <div className="grid gap-8 lg:grid-cols-[1fr_1.4fr]">
          <ul className="flex flex-col">
            {FEATURES.map((feature, index) => (
              <li key={feature.title} className="border-t py-5 first:border-t-0 first:pt-0">
                <Reveal from="left" delay={index * 80} className="flex flex-col gap-1">
                  <h3 className="font-display text-xl uppercase">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.text}</p>
                </Reveal>
              </li>
            ))}
          </ul>
          <Reveal from="right" className="min-w-0">
            <CodeTabs html={html} raw={codeSamples} />
          </Reveal>
        </div>
      </div>
    </section>
  );
}
