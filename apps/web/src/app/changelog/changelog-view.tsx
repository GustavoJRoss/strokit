"use client";

import { Reveal } from "@/components/home/reveal";
import { SiteFooter } from "@/components/home/site-footer";
import { SiteHeader } from "@/components/home/site-header";
import { CHANGELOG } from "@/lib/changelog";
import { HTML_LANG } from "@/lib/i18n/locales";
import { DocumentTitle, useI18n } from "@/lib/i18n/provider";
import { site } from "@/lib/site";

function formatDate(iso: string, locale: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString(locale, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function ChangelogView() {
  const { t, locale } = useI18n();
  const copy = t.changelogPage;
  const entries = t.changelog;
  const htmlLocale = HTML_LANG[locale];

  return (
    <div className="flex min-h-dvh flex-col">
      <DocumentTitle page="changelog" />
      <SiteHeader />
      <main className="flex-1">
        <div className="mx-auto flex max-w-3xl flex-col gap-16 px-4 py-16 sm:px-6 sm:py-24">
          <Reveal from="left" fade={false} className="flex flex-col gap-4">
            <p className="font-mono text-muted-foreground text-xs uppercase tracking-[0.2em]">
              {copy.eyebrow}
            </p>
            <h1 className="text-balance font-display text-[clamp(2rem,8vw,3.75rem)] uppercase leading-[0.92]">
              {copy.title}
            </h1>
            <p className="max-w-2xl text-lg text-muted-foreground">{copy.lead}</p>
          </Reveal>

          <ol className="relative flex flex-col gap-12 border-l pl-8 sm:pl-10">
            {CHANGELOG.map((entry, index) => (
              <li key={entry.id} className="relative">
                <span
                  aria-hidden
                  className="-translate-x-1/2 absolute top-1.5 left-[-2.05rem] size-3 rounded-full border-2 border-background bg-foreground sm:left-[-2.55rem]"
                />
                <Reveal from="left" delay={index * 60} className="flex flex-col gap-2">
                  <time
                    dateTime={entry.date}
                    className="font-mono text-muted-foreground text-xs uppercase tracking-widest"
                  >
                    {formatDate(entry.date, htmlLocale)}
                  </time>
                  <h2 className="font-display text-2xl uppercase">{entries[entry.id].title}</h2>
                  <p className="max-w-xl text-muted-foreground">{entries[entry.id].body}</p>
                </Reveal>
              </li>
            ))}
          </ol>

          <Reveal from="left" className="border-t pt-8">
            <a
              href={`${site.repo.url}/commits/main`}
              target="_blank"
              rel="noreferrer"
              className="font-mono text-muted-foreground text-xs uppercase tracking-widest hover:text-foreground"
            >
              {copy.fullHistory}
            </a>
          </Reveal>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
