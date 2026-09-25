"use client";

import { ChevronDownIcon, ChevronUpIcon, CopyIcon, DownloadIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { slug } from "@/lib/project";
import { downloadText } from "@/lib/svg-file";
import { type ExportTab, useEditorStore } from "@/store/editor-store";
import { selectComponentName, selectExportCode } from "@/store/selectors";
import { CodeBlock } from "./code-block";

const HINTS: Record<ExportTab, string> = {
  css: "SVG com <style> embutido. Zero runtime.",
  react: "Componente React tipado, sem dependências. speed, loop e paused não re-renderizam.",
  motion:
    "Requer motion. Reproduz a mesma animação via useAnimate; o preview ao lado mostra a versão CSS.",
};

export function ExportPanel() {
  const code = useEditorStore(selectExportCode);
  const componentName = useEditorStore(selectComponentName);
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

  const download = () => {
    if (!code) return;
    if (tab === "css") downloadText(code, `${slug(name)}.svg`, "image/svg+xml");
    else downloadText(code, `${componentName}.tsx`, "text/plain");
  };

  return (
    <section aria-label="Exportar" className="flex flex-col border-t">
      <div className="flex flex-wrap items-center gap-2 px-3 py-2">
        <h2 className="font-medium text-sm">Exportar</h2>
        <Tabs value={tab} onValueChange={(value) => setTab(value as ExportTab)}>
          <TabsList>
            <TabsTrigger value="css">CSS</TabsTrigger>
            <TabsTrigger value="react">React</TabsTrigger>
            <TabsTrigger value="motion">Motion</TabsTrigger>
          </TabsList>
        </Tabs>
        <p className="hidden text-muted-foreground text-xs lg:block">{HINTS[tab]}</p>
        <div className="ml-auto flex gap-2">
          <Button variant="outline" size="sm" disabled={!code} onClick={copy}>
            <CopyIcon data-icon="inline-start" />
            Copiar
          </Button>
          <Button variant="outline" size="sm" disabled={!code} onClick={download}>
            <DownloadIcon data-icon="inline-start" />
            {tab === "css" ? "Baixar .svg" : "Baixar .tsx"}
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
            <CodeBlock code={code} lang={tab === "css" ? "html" : "tsx"} />
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
