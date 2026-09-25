"use client";

import dynamic from "next/dynamic";
import { LazyMount } from "./lazy-mount";

const Playground = dynamic(() => import("./playground").then((module) => module.Playground), {
  ssr: false,
  loading: () => <PlaygroundFallback />,
});

function PlaygroundFallback() {
  return (
    <div className="flex h-96 items-center justify-center border text-muted-foreground text-sm">
      Carregando o playground…
    </div>
  );
}

/** The core + Shiki load only when the playground gets close to the viewport. */
export function PlaygroundIsland() {
  return (
    <LazyMount fallback={<PlaygroundFallback />}>
      <Playground />
    </LazyMount>
  );
}
