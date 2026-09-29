"use client";

import Link from "next/link";
import { GithubIcon } from "@/components/github-icon";
import { LanguageSwitcher } from "@/components/language-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n/provider";
import { site } from "@/lib/site";
import { Wordmark } from "./brand";

export function SiteHeader() {
  const { t } = useI18n();
  return (
    <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-4 sm:px-6">
        <Link href="/" aria-label={t.common.home}>
          <Wordmark />
        </Link>
        <nav
          aria-label={t.home.navLabel}
          className="ml-2 hidden items-center gap-4 xl:gap-5 lg:flex"
        >
          {site.nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="whitespace-nowrap font-mono text-[0.6875rem] text-muted-foreground uppercase leading-none tracking-wider xl:tracking-widest hover:text-foreground"
            >
              {t.home.nav[item.key]}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <LanguageSwitcher />
          <ThemeToggle />
          <Button asChild size="icon-sm" variant="ghost">
            <a
              href={site.repo.url}
              target="_blank"
              rel="noreferrer"
              aria-label={t.home.openSource.repoLabel}
              title={t.home.openSource.repoLabel}
            >
              <GithubIcon className="size-4" />
            </a>
          </Button>
          <Button asChild size="sm" className="hidden sm:inline-flex">
            <Link href="/editor">{t.home.openEditor}</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
