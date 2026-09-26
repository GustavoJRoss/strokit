"use client";

import { useEffect, useState } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { DocumentTitle, useI18n } from "@/lib/i18n/provider";
import { useEditorStore } from "@/store/editor-store";
import { EditorLayout } from "./editor-layout";
import { EmptyState } from "./empty-state";
import { PreviewCanvas } from "./preview-canvas";
import { Toolbar } from "./toolbar";
import { useDraft } from "./use-draft";
import { useImporter } from "./use-importer";

function isEditable(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))
  );
}

export function Editor() {
  const hasDoc = useEditorStore((state) => state.doc !== null);
  const { importFile, importMarkup } = useImporter();
  const [dragging, setDragging] = useState(false);
  const { t } = useI18n();
  useDraft();

  useEffect(() => {
    const onPaste = (event: ClipboardEvent) => {
      if (isEditable(event.target)) return;
      const file = event.clipboardData?.files[0];
      if (file) {
        event.preventDefault();
        void importFile(file);
        return;
      }
      const text = event.clipboardData?.getData("text/plain") ?? "";
      if (/<svg[\s>]/i.test(text)) {
        event.preventDefault();
        importMarkup(text, "logo");
      }
    };
    document.addEventListener("paste", onPaste);
    return () => document.removeEventListener("paste", onPaste);
  }, [importFile, importMarkup]);

  return (
    <TooltipProvider>
      <DocumentTitle page="editor" />
      {/* biome-ignore lint/a11y/noStaticElementInteractions: file drop target; the file picker and paste dialog are the keyboard paths */}
      <div
        className="relative flex h-dvh flex-col bg-background"
        onDragOver={(event) => {
          if (!event.dataTransfer.types.includes("Files")) return;
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={(event) => {
          if (event.currentTarget === event.target) setDragging(false);
        }}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          const file = event.dataTransfer.files[0];
          if (file) void importFile(file);
        }}
      >
        <EditorLayout
          toolbar={<Toolbar />}
          preview={
            <main className="relative size-full" aria-label="Preview">
              <PreviewCanvas />
              {!hasDoc && (
                <div className="absolute inset-0 overflow-auto">
                  <EmptyState />
                </div>
              )}
            </main>
          }
        />
        {dragging && (
          <div className="pointer-events-none absolute inset-2 z-50 flex items-center justify-center rounded-xl border-2 border-primary border-dashed bg-background/80 font-medium">
            {t.editor.dropHere}
          </div>
        )}
        <Toaster richColors position="bottom-right" />
      </div>
    </TooltipProvider>
  );
}
