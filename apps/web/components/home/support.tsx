import { HeartIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { site } from "@/lib/site";
import { SupportHeart } from "./generated/SupportHeart";
import { Reveal } from "./reveal";

export function Support() {
  return (
    <section id="apoie" className="scroll-mt-20 border-t bg-foreground text-background">
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-24 sm:px-6 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <Reveal from="left" className="flex flex-col gap-6">
          <p className="font-mono text-background/60 text-xs uppercase tracking-[0.2em]">
            07 — Apoie
          </p>
          <h2 className="text-balance font-display text-[clamp(2rem,8vw,3.75rem)] uppercase leading-[0.92]">
            Gostou? Ajude o strokit a crescer.
          </h2>
          <p className="max-w-xl text-background/70 text-lg">
            O strokit é um projeto independente, gratuito e sem anúncios. Uma contribuição ajuda a
            manter o site no ar e a tirar do papel novos presets, o registry do shadcn e mais
            formatos de export.
          </p>
          <div className="flex flex-col items-start gap-2">
            {site.donationUrl ? (
              <Button asChild size="lg" variant="secondary">
                <a href={site.donationUrl} target="_blank" rel="noreferrer">
                  <HeartIcon data-icon="inline-start" />
                  Apoiar o projeto
                </a>
              </Button>
            ) : (
              <Button type="button" size="lg" variant="secondary" data-testid="donate-button">
                <HeartIcon data-icon="inline-start" />
                Apoiar o projeto
              </Button>
            )}
            {site.donationUrl ? null : (
              <span className="text-background/60 text-sm">Formas de apoio em breve.</span>
            )}
          </div>
        </Reveal>
        <Reveal from="right" delay={150} className="flex justify-center">
          <div
            className="aspect-square w-56 sm:w-72"
            style={{ ["--sk-stroke" as string]: "currentColor" }}
          >
            <SupportHeart size="100%" label="Coração se desenhando" />
          </div>
        </Reveal>
      </div>
    </section>
  );
}
