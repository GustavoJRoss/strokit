"use client";

import dynamic from "next/dynamic";

/** The editor is client-only (DOMParser, Shadow DOM, Web Animations). */
export const EditorLoader = dynamic(() => import("./editor").then((module) => module.Editor), {
  ssr: false,
  loading: () => (
    <div className="flex h-dvh items-center justify-center text-muted-foreground text-sm">
      Carregando o editor…
    </div>
  ),
});
