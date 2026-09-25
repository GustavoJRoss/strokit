import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { site } from "@/lib/site";
import { Wordmark } from "./brand";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-4 sm:px-6">
        <Link href="/" aria-label="strokit, início">
          <Wordmark />
        </Link>
        <nav aria-label="Seções" className="ml-4 hidden gap-5 md:flex">
          {site.nav.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="font-mono text-muted-foreground text-xs uppercase tracking-widest hover:text-foreground"
            >
              {item.label}
            </a>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />
          <Button asChild size="sm" className="hidden sm:inline-flex">
            <Link href="/editor">Abrir editor</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
