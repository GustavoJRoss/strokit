"use client";

import { useEffect, useState } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { isEditableTarget } from "@/lib/dom";
import { DocumentTitle, useI18n } from "@/lib/i18n/provider";
import { useEditorStore } from "@/store/editor-store";
import { EditorLayout } from "./editor-layout";
import { EmptyState } from "./empty-state";
import { PreviewCanvas } from "./preview-canvas";
import { Toolbar } from "./toolbar";
import { useDeleteLayers } from "./use-delete-layers";
import { useDraft } from "./use-draft";
import { useGroupLayers } from "./use-group-layers";
import { useImporter } from "./use-importer";

export function Editor() {
  const hasDoc = useEditorStore((state) => state.doc !== null);
  const drawing = useEditorStore((state) => state.draw.active);
  const { importFile, importMarkup } = useImporter();
  const [dragging, setDragging] = useState(false);
  const { t } = useI18n();
  useDraft();
  const deleteSelected = useDeleteLayers();
  const { group, ungroup } = useGroupLayers();

  // Delete/Backspace remove the selected layers. Draw mode has its own keys (see DrawLayer).
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Delete" && event.key !== "Backspace") return;
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return;
      if (isEditableTarget(event.target)) return;
      // Menus and dialogs own their keys.
      if (
        event.target instanceof Element &&
        event.target.closest("[role=dialog],[role=menu],[role=listbox]")
      )
        return;
      const { selection, draw } = useEditorStore.getState();
      if (draw.active || selection.length === 0) return;
      event.preventDefault();
      deleteSelected();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [deleteSelected]);

  // Ctrl/Cmd+Z undoes, Shift+Ctrl/Cmd+Z (or Ctrl+Y) redoes. Text fields keep their own undo.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.altKey || !(event.metaKey || event.ctrlKey)) return;
      const key = event.key.toLowerCase();
      if (key !== "z" && key !== "y") return;
      if (isEditableTarget(event.target)) return;
      if (
        event.target instanceof Element &&
        event.target.closest("[role=dialog],[role=menu],[role=listbox]")
      )
        return;
      event.preventDefault();
      const { undo, redo } = useEditorStore.getState();
      if (key === "y" || event.shiftKey) redo();
      else undo();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Ctrl/Cmd+G groups the selection, with Shift it dissolves the group. The browser would
  // otherwise use Ctrl+G to find the next match.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.altKey || !(event.metaKey || event.ctrlKey)) return;
      if (event.key.toLowerCase() !== "g") return;
      if (isEditableTarget(event.target)) return;
      if (
        event.target instanceof Element &&
        event.target.closest("[role=dialog],[role=menu],[role=listbox]")
      )
        return;
      const { draw, selection } = useEditorStore.getState();
      if (draw.active || selection.length === 0) return;
      event.preventDefault();
      if (event.shiftKey) ungroup();
      else group();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [group, ungroup]);

  useEffect(() => {
    const onPaste = (event: ClipboardEvent) => {
      if (isEditableTarget(event.target)) return;
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
              {!hasDoc && !drawing && (
                <div className="pointer-events-none absolute inset-0 overflow-auto">
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
