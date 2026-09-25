"use client";

import { ChevronDownIcon, ChevronUpIcon, CopyIcon, DownloadIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { slug } from "@/lib/project";
import { downloadText } from "@/lib/svg-file";
import { cn } from "@/lib/utils";
import { type ExportTab, useEditorStore } from "@/store/editor-store";
import { selectComponentName, selectExportCode } from "@/store/selectors";
import { CodeBlock } from "./code-block";
import { VideoExportButton } from "./video-export-dialog";

const HINTS: Record<ExportTab, string> = {
  css: "SVG com <style> embutido. Zero runtime.",
  react: "Componente React tipado, sem dependências. speed, loop e paused não re-renderizam.",
  motion:
    "Requer motion. Reproduz a mesma animação via useAnimate; o preview ao lado mostra a versão CSS.",
};

type ExportPanelProps = {
  collapsed: boolean;
  onToggleCollapsed: () => void;
  /** Fill the height of a resizable panel instead of using a fixed height. */
  fill?: boolean;
};

/** Height of the header row: also the size of the panel when collapsed. */
export const EXPORT_HEADER_HEIGHT = 44;

export function ExportPanel({ collapsed, onToggleCollapsed, fill = false }: ExportPanelProps) {
  const code = useEditorStore(selectExportCode);
  const componentName = useEditorStore(selectComponentName);
  const name = useEditorStore((state) => state.spec.name);
  const tab = useEditorStore((state) => state.exportTab);
  const setTab = useEditorStore((state) => state.setExportTab);

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
    <section aria-label="Exportar" className={cn("flex flex-col", fill ? "h-full" : "border-t")}>
      <Tabs
        value={tab}
        onValueChange={(value) => setTab(value as ExportTab)}
        className="flex min-h-0 flex-1 flex-col gap-0"
      >
        <div
          className="flex shrink-0 items-center gap-2 overflow-hidden px-3"
          style={{ height: EXPORT_HEADER_HEIGHT }}
        >
          <h2 className="font-medium text-sm">Exportar</h2>
          <TabsList>
            <TabsTrigger value="css">CSS</TabsTrigger>
            <TabsTrigger value="react">React</TabsTrigger>
            <TabsTrigger value="motion">Motion</TabsTrigger>
          </TabsList>
          <p className="hidden text-muted-foreground text-xs lg:block">{HINTS[tab]}</p>
          <div className="ml-auto flex gap-2">
            <Button variant="outline" size="sm" disabled={!code} onClick={copy}>
              <CopyIcon data-icon="inline-start" />
              Copiar
            </Button>
            <VideoExportButton />
            <Button variant="outline" size="sm" disabled={!code} onClick={download}>
              <DownloadIcon data-icon="inline-start" />
              {tab === "css" ? "Baixar .svg" : "Baixar .tsx"}
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-expanded={!collapsed}
              aria-controls="export-code-region"
              aria-label={collapsed ? "Mostrar código" : "Recolher código"}
              onClick={onToggleCollapsed}
            >
              {collapsed ? <ChevronUpIcon /> : <ChevronDownIcon />}
            </Button>
          </div>
        </div>
        {(["css", "react", "motion"] as const).map((value) => (
          <TabsContent key={value} value={value} className="min-h-0 flex-1">
            {/* Kept in the DOM when collapsed so the toggle's aria-controls always resolves. */}
            <div
              id="export-code-region"
              hidden={collapsed}
              className={cn("overflow-auto border-t bg-muted/30", fill ? "h-full" : "h-64")}
            >
              {code ? (
                <CodeBlock code={code} lang={tab === "css" ? "html" : "tsx"} />
              ) : (
                <p className="p-4 text-muted-foreground text-sm">
                  O código aparece aqui assim que você importar um SVG.
                </p>
              )}
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </section>
  );
}
