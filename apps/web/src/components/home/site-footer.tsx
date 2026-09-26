"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n/provider";
import { site } from "@/lib/site";
import { Wordmark } from "./brand";

export function SiteFooter() {
  const { t } = useI18n();
  const copy = t.home.footer;
  return (
    <footer className="border-t">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 sm:flex-row sm:items-center sm:px-6">
        <Wordmark />
        <nav
          aria-label={copy.label}
          className="flex flex-wrap gap-5 font-mono text-muted-foreground text-xs uppercase tracking-widest"
        >
          <Link href="/editor" className="hover:text-foreground">
            {copy.editor}
          </Link>
          <Link href="/exemplos" className="hover:text-foreground">
            {copy.exported}
          </Link>
          <a href="#topo" className="hover:text-foreground">
            {copy.top}
          </a>
        </nav>
        <p className="text-muted-foreground text-sm sm:ml-auto">{copy.madeBy(site.author)}</p>
      </div>
    </footer>
  );
}
