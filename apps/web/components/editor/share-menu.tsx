"use client";

import { PROJECT_EXTENSION } from "@strokekit/core";
import { ChevronDownIcon, DownloadIcon, FolderOpenIcon, LinkIcon, Share2Icon } from "lucide-react";
import { useRef } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { downloadProject, shareHash } from "@/lib/project";
import { useEditorStore } from "@/store/editor-store";
import { useImporter } from "./use-importer";

export function ShareMenu() {
  const doc = useEditorStore((state) => state.doc);
  const spec = useEditorStore((state) => state.spec);
  const inputRef = useRef<HTMLInputElement>(null);
  const { importFile } = useImporter();

  const save = () => {
    if (doc) downloadProject({ svg: doc.raw, spec });
  };

  const copyLink = async () => {
    if (!doc) return;
    const hash = shareHash({ svg: doc.raw, spec });
    if (!hash) {
      toast.warning("Esta animação é grande demais para um link", {
        description: `Baixe o projeto (${PROJECT_EXTENSION}) e compartilhe o arquivo.`,
        action: { label: "Baixar projeto", onClick: save },
      });
      return;
    }
    const url = `${window.location.origin}${window.location.pathname}${hash}`;
    window.history.replaceState(window.history.state, "", url);
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copiado", { description: "A animação e o SVG vão no próprio link." });
    } catch {
      toast.error("Não foi possível copiar. Copie o endereço da barra do navegador.");
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm">
            <Share2Icon data-icon="inline-start" />
            Compartilhar
            <ChevronDownIcon data-icon="inline-end" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem disabled={!doc} onSelect={() => void copyLink()}>
            <LinkIcon />
            Copiar link
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem disabled={!doc} onSelect={save}>
            <DownloadIcon />
            Baixar projeto ({PROJECT_EXTENSION})
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => inputRef.current?.click()}>
            <FolderOpenIcon />
            Abrir projeto…
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <input
        ref={inputRef}
        type="file"
        accept=".json,application/json"
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        data-testid="project-input"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void importFile(file);
          event.target.value = "";
        }}
      />
    </>
  );
}
