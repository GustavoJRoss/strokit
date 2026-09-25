import type { Metadata } from "next";
import { CodeSection } from "@/components/home/code-section";
import { Comparison } from "@/components/home/comparison";
import { Gallery } from "@/components/home/gallery";
import { Hero } from "@/components/home/hero";
import { HowItWorks } from "@/components/home/how-it-works";
import { PlaygroundIsland } from "@/components/home/playground-section";
import { Problem } from "@/components/home/problem";
import { SectionHeading } from "@/components/home/section-heading";
import { SiteFooter } from "@/components/home/site-footer";
import { SiteHeader } from "@/components/home/site-header";
import { Support } from "@/components/home/support";

export const metadata: Metadata = {
  title: "strokit — anime sua logo SVG e exporte código",
  description:
    "Ferramenta code-first para animar logos e loaders em SVG. Exporte CSS puro, componente React tipado ou Motion, sem runtime e respeitando prefers-reduced-motion.",
};

export default function Home() {
  return (
    <div id="topo" className="flex min-h-dvh flex-col">
      <SiteHeader />
      <main className="flex-1 overflow-x-clip">
        <Hero />
        <div className="border-t">
          <Problem />
        </div>
        <HowItWorks />
        <section id="playground" className="scroll-mt-20 border-t">
          <div className="mx-auto flex max-w-6xl flex-col gap-12 px-4 py-24 sm:px-6">
            <SectionHeading
              index="03"
              eyebrow="Playground"
              title="Mexa. O código muda junto."
              lead="Este preview roda o próprio strokit no seu navegador e mostra exatamente o CSS que ele gera."
              from="right"
            />
            <PlaygroundIsland />
          </div>
        </section>
        <section id="exemplos" className="scroll-mt-20 border-t">
          <div className="mx-auto flex max-w-6xl flex-col gap-12 px-4 py-24 sm:px-6">
            <SectionHeading
              index="04"
              eyebrow="Exemplos"
              title="Só SVG. Só CSS."
              lead="Cada card é um componente exportado pelo strokit: nenhuma biblioteca de animação, nenhum JS rodando o movimento. Baixe o .svg ou abra no editor."
            />
            <Gallery />
          </div>
        </section>
        <CodeSection />
        <Comparison />
        <Support />
      </main>
      <SiteFooter />
    </div>
  );
}
