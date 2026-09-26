"use client";

import Link from "next/link";
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
        <nav aria-label={t.home.navLabel} className="ml-4 hidden gap-5 md:flex">
          {site.nav.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="font-mono text-muted-foreground text-xs uppercase tracking-widest hover:text-foreground"
            >
              {t.home.nav[item.key]}
            </a>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <LanguageSwitcher />
          <ThemeToggle />
          <Button asChild size="sm" className="hidden sm:inline-flex">
            <Link href="/editor">{t.home.openEditor}</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
