"use client";

import { PROJECT_EXTENSION } from "@strokit/core";
import { DownloadIcon, FolderOpenIcon, LinkIcon, Share2Icon } from "lucide-react";
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
import { useI18n } from "@/lib/i18n/provider";
import { downloadProject, shareHash } from "@/lib/project";
import { useEditorStore } from "@/store/editor-store";
import { useImporter } from "./use-importer";

export function ShareMenu() {
  const doc = useEditorStore((state) => state.doc);
  const spec = useEditorStore((state) => state.spec);
  const inputRef = useRef<HTMLInputElement>(null);
  const { importFile } = useImporter();
  const { t } = useI18n();

  const save = () => {
    if (doc) downloadProject({ svg: doc.raw, spec });
  };

  const copyLink = async () => {
    if (!doc) return;
    const hash = shareHash({ svg: doc.raw, spec });
    if (!hash) {
      toast.warning(t.share.tooLarge, {
        description: t.share.tooLargeBody(PROJECT_EXTENSION),
        action: { label: t.share.downloadAction, onClick: save },
      });
      return;
    }
    // Built on demand: the address bar stays clean.
    const url = `${window.location.origin}${window.location.pathname}${hash}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success(t.share.linkCopied, { description: t.share.linkCopiedBody });
    } catch {
      window.prompt(t.share.copyFallback, url);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="icon-sm" aria-label={t.share.menu} title={t.share.menu}>
            <Share2Icon />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem disabled={!doc} onSelect={() => void copyLink()}>
            <LinkIcon />
            {t.share.copyLink}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem disabled={!doc} onSelect={save}>
            <DownloadIcon />
            {t.share.downloadProject(PROJECT_EXTENSION)}
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => inputRef.current?.click()}>
            <FolderOpenIcon />
            {t.share.openProject}
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
