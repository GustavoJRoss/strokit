"use client";

import Link from "next/link";
import { DocumentTitle, useI18n } from "@/lib/i18n/provider";
import { OndaLogo } from "./generated/OndaLogo";
import { OrbitaLogo } from "./generated/OrbitaLogo";
import { OrbitaMotionLogo } from "./generated/OrbitaMotionLogo";
import { PicoLoader } from "./generated/PicoLoader";

export function ExamplesView() {
  const { t } = useI18n();
  const copy = t.examplesPage;
  const cards = [
    {
      id: "orbita-react",
      title: "OrbitaLogo",
      detail: copy.cards.orbitaReact,
      node: <OrbitaLogo size={140} />,
    },
    {
      id: "onda-react",
      title: "OndaLogo",
      detail: copy.cards.ondaReact,
      node: <OndaLogo size={160} speed={2} />,
    },
    {
      id: "pico-motion",
      title: "PicoLoader",
      detail: copy.cards.picoMotion,
      node: <PicoLoader size={160} />,
    },
    {
      id: "orbita-motion",
      title: "OrbitaMotionLogo",
      detail: copy.cards.orbitaMotion,
      node: <OrbitaMotionLogo size={140} loop />,
    },
  ];

  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-8 px-4 py-12">
      <DocumentTitle page="examples" />
      <header className="flex flex-col gap-2">
        <h1 className="font-semibold text-3xl tracking-tight">{copy.title}</h1>
        <p className="text-muted-foreground">{copy.body}</p>
        <Link className="w-fit underline underline-offset-4" href="/editor">
          {copy.create}
        </Link>
      </header>
      <ul className="grid gap-4 sm:grid-cols-2">
        {cards.map((card) => (
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
