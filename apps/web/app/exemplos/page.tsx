import type { Metadata } from "next";
import Link from "next/link";
import { OndaLogo } from "./generated/OndaLogo";
import { OrbitaLogo } from "./generated/OrbitaLogo";
import { OrbitaMotionLogo } from "./generated/OrbitaMotionLogo";
import { PicoLoader } from "./generated/PicoLoader";

export const metadata: Metadata = {
  title: "Componentes exportados · strokit",
  description: "Componentes React e Motion gerados pelo strokit, rodando neste site.",
};

const CARDS = [
  {
    id: "orbita-react",
    title: "OrbitaLogo",
    detail: "React · Desenhar em sequência, em loop",
    node: <OrbitaLogo size={140} />,
  },
  {
    id: "onda-react",
    title: "OndaLogo",
    detail: "React · Cometa, speed={2}",
    node: <OndaLogo size={160} speed={2} />,
  },
  {
    id: "pico-motion",
    title: "PicoLoader",
    detail: 'Motion · Vai e vem, role="status"',
    node: <PicoLoader size={160} />,
  },
  {
    id: "orbita-motion",
    title: "OrbitaMotionLogo",
    detail: "Motion · Desenhar e preencher, loop",
    node: <OrbitaMotionLogo size={140} loop />,
  },
];

export default function ExamplesPage() {
  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-8 px-4 py-12">
      <header className="flex flex-col gap-2">
        <h1 className="font-semibold text-3xl tracking-tight">Componentes exportados</h1>
        <p className="text-muted-foreground">
          Estes componentes saíram direto dos exportadores do strokit e são compilados pelo próprio
          Next.js deste site. Nenhuma linha foi editada à mão.
        </p>
        <Link className="w-fit underline underline-offset-4" href="/editor">
          Criar o seu no editor
        </Link>
      </header>
      <ul className="grid gap-4 sm:grid-cols-2">
        {CARDS.map((card) => (
          <li
            key={card.id}
            data-testid={card.id}
            className="flex flex-col items-center gap-4 rounded-xl border p-6"
          >
            <div className="flex h-44 items-center justify-center">{card.node}</div>
            <div className="text-center">
              <p className="font-medium font-mono text-sm">{`<${card.title} />`}</p>
              <p className="text-muted-foreground text-xs">{card.detail}</p>
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
