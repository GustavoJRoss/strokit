"use client";

import { ChevronDownIcon, ChevronUpIcon, CopyIcon, DownloadIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { downloadText } from "@/lib/svg-file";
import { type ExportTab, useEditorStore } from "@/store/editor-store";
import { selectCssExport } from "@/store/selectors";
import { CodeBlock } from "./code-block";

function slug(value: string): string {
  return (
    value
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "logo"
  );
}

export function ExportPanel() {
  const code = useEditorStore(selectCssExport);
  const name = useEditorStore((state) => state.spec.name);
  const tab = useEditorStore((state) => state.exportTab);
  const open = useEditorStore((state) => state.exportOpen);
  const setTab = useEditorStore((state) => state.setExportTab);
  const setOpen = useEditorStore((state) => state.setExportOpen);

  const copy = async () => {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      toast.success("Código copiado");
    } catch {
      toast.error("Não foi possível copiar. Selecione o código e copie manualmente.");
    }
  };

  return (
    <section aria-label="Exportar" className="flex flex-col border-t">
      <div className="flex flex-wrap items-center gap-2 px-3 py-2">
        <h2 className="font-medium text-sm">Exportar</h2>
        <Tabs value={tab} onValueChange={(value) => setTab(value as ExportTab)}>
          <TabsList>
            <TabsTrigger value="css">CSS</TabsTrigger>
            <TabsTrigger value="react" disabled>
              React
            </TabsTrigger>
            <TabsTrigger value="motion" disabled>
              Motion
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="ml-auto flex gap-2">
          <Button variant="outline" size="sm" disabled={!code} onClick={copy}>
            <CopyIcon data-icon="inline-start" />
            Copiar
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={!code}
            onClick={() => code && downloadText(code, `${slug(name)}.svg`, "image/svg+xml")}
          >
            <DownloadIcon data-icon="inline-start" />
            Baixar .svg
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-expanded={open}
            aria-controls="export-code-region"
            aria-label={open ? "Recolher código" : "Mostrar código"}
            onClick={() => setOpen(!open)}
          >
            {open ? <ChevronDownIcon /> : <ChevronUpIcon />}
          </Button>
        </div>
      </div>
      {open && (
        <div id="export-code-region" className="h-64 overflow-auto border-t bg-muted/30">
          {code ? (
            <CodeBlock code={code} lang="html" />
          ) : (
            <p className="p-4 text-muted-foreground text-sm">
              O código aparece aqui assim que você importar um SVG.
            </p>
          )}
        </div>
      )}
    </section>
  );
}
