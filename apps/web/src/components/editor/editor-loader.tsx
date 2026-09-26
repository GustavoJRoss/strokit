"use client";

import dynamic from "next/dynamic";
import { useI18n } from "@/lib/i18n/provider";

/** The editor is client-only (DOMParser, Shadow DOM, Web Animations). */
export const EditorLoader = dynamic(() => import("./editor").then((module) => module.Editor), {
  ssr: false,
  loading: () => <EditorLoading />,
});

function EditorLoading() {
  const { t } = useI18n();
  return (
    <div className="flex h-dvh items-center justify-center text-muted-foreground text-sm">
      {t.editor.loading}
    </div>
  );
}
