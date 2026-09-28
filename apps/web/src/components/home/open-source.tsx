"use client";

import { BugIcon, GitPullRequestArrowIcon, StarIcon } from "lucide-react";
import { GithubIcon } from "@/components/github-icon";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n/provider";
import { site } from "@/lib/site";
import { Reveal } from "./reveal";
import { SectionHeading } from "./section-heading";

const CARD_ICONS = [StarIcon, BugIcon, GitPullRequestArrowIcon] as const;
const CARD_LINKS = [site.repo.url, site.repo.issuesUrl, site.repo.contributingUrl] as const;

export function OpenSource() {
  const { t } = useI18n();
  const copy = t.home.openSource;
  return (
    <section id="open-source" className="scroll-mt-20 border-t">
      <div className="mx-auto flex max-w-6xl flex-col gap-12 px-4 py-24 sm:px-6">
        <SectionHeading index="07" eyebrow={copy.eyebrow} title={copy.title} lead={copy.body} />
        <Reveal from="right" className="flex flex-wrap items-center gap-3">
          <Button asChild size="lg">
            <a href={site.repo.url} target="_blank" rel="noreferrer">
              <GithubIcon data-icon="inline-start" />
              {copy.repoButton}
            </a>
          </Button>
          <Button asChild size="lg" variant="outline">
            <a href={site.repo.issuesUrl} target="_blank" rel="noreferrer">
              {copy.issuesButton}
            </a>
          </Button>
          <a
            href={site.repo.licenseUrl}
            target="_blank"
            rel="noreferrer"
            className="ml-1 font-mono text-muted-foreground text-xs uppercase tracking-widest hover:text-foreground"
          >
            {copy.license}
          </a>
        </Reveal>
        <ul className="grid gap-4 md:grid-cols-3">
          {copy.cards.map((card, index) => {
            const Icon = CARD_ICONS[index];
            return (
              <li key={card.title}>
                <Reveal from={index % 2 === 0 ? "left" : "right"} delay={index * 100}>
                  <a
                    href={CARD_LINKS[index]}
                    target="_blank"
                    rel="noreferrer"
                    className="flex h-full flex-col gap-3 border p-6 transition-colors hover:bg-foreground/[0.04]"
                  >
                    {Icon ? <Icon aria-hidden="true" className="size-5" /> : null}
                    <span className="font-display text-xl uppercase">{card.title}</span>
                    <span className="text-muted-foreground text-sm">{card.body}</span>
                  </a>
                </Reveal>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
