"use client";

import { useEffect, useState } from "react";
import { type CodeLanguage, highlight } from "@/lib/highlight";

/** Plain text first, highlighted HTML once Shiki has loaded. Shiki escapes the code. */
export function CodeBlock({ code, lang }: { code: string; lang: CodeLanguage }) {
  const [html, setHtml] = useState<{ code: string; html: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    highlight(code, lang)
      .then((result) => {
        if (!cancelled) setHtml({ code, html: result });
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [code, lang]);

  if (html?.code === code) {
    return (
      <div
        data-testid="export-code"
        className="text-xs [&_pre]:min-h-full [&_pre]:p-4"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: Shiki output, code is escaped
        dangerouslySetInnerHTML={{ __html: html.html }}
      />
    );
  }
  return (
    <pre data-testid="export-code" className="min-h-full p-4 text-xs">
      <code>{code}</code>
    </pre>
  );
}
