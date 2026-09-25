import Link from "next/link";
import { site } from "@/lib/site";
import { Wordmark } from "./brand";

export function SiteFooter() {
  return (
    <footer className="border-t">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 sm:flex-row sm:items-center sm:px-6">
        <Wordmark />
        <nav
          aria-label="Rodapé"
          className="flex flex-wrap gap-5 font-mono text-muted-foreground text-xs uppercase tracking-widest"
        >
          <Link href="/editor" className="hover:text-foreground">
            Editor
          </Link>
          <Link href="/exemplos" className="hover:text-foreground">
            Componentes exportados
          </Link>
          <a href="#topo" className="hover:text-foreground">
            Topo
          </a>
        </nav>
        <p className="text-muted-foreground text-sm sm:ml-auto">Feito por {site.author}.</p>
      </div>
    </footer>
  );
}
