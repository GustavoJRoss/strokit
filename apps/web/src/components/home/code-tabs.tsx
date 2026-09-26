"use client";

import { CheckIcon, CopyIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useI18n } from "@/lib/i18n/provider";

type Format = "css" | "react" | "motion";

const LABELS: Record<Format, string> = { css: "CSS", react: "React", motion: "Motion" };

/** Code highlighted at build time (server); the client only switches tabs and copies. */
export function CodeTabs({
  html,
  raw,
}: {
  html: Record<Format, string>;
  raw: Record<Format, string>;
}) {
  const [format, setFormat] = useState<Format>("css");
  const [copied, setCopied] = useState(false);
  const { t } = useI18n();

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(raw[format]);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  return (
    <Tabs
      value={format}
      onValueChange={(value) => setFormat(value as Format)}
      className="flex min-w-0 flex-col gap-0 border"
    >
      <div className="flex items-center gap-2 border-b px-3 py-2">
        <TabsList>
          {(Object.keys(LABELS) as Format[]).map((key) => (
            <TabsTrigger key={key} value={key}>
              {LABELS[key]}
            </TabsTrigger>
          ))}
        </TabsList>
        <Button variant="outline" size="sm" className="ml-auto" onClick={copy}>
          {copied ? <CheckIcon data-icon="inline-start" /> : <CopyIcon data-icon="inline-start" />}
          {copied ? t.common.copied : t.common.copy}
        </Button>
      </div>
      {(Object.keys(LABELS) as Format[]).map((key) => (
        <TabsContent key={key} value={key}>
          <div
            data-testid="home-code"
            className="h-[420px] overflow-auto bg-muted/40 text-xs [&_pre]:p-4"
            // biome-ignore lint/security/noDangerouslySetInnerHtml: Shiki output built from our own exporter, escaped
            dangerouslySetInnerHTML={{ __html: html[key] }}
          />
        </TabsContent>
      ))}
    </Tabs>
  );
}
