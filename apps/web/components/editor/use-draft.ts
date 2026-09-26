"use client";

import { decodeShare, SHARE_HASH_PREFIX } from "@strokit/core";
import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { clearDraft, readDraft, writeDraft } from "@/lib/draft";
import { importErrorMessage } from "@/lib/messages";
import { useEditorStore } from "@/store/editor-store";
import { useImporter } from "./use-importer";

const SAVE_DEBOUNCE_MS = 500;

/**
 * Keeps the URL clean and the work safe:
 * - on load, opens a `#s=` link (then removes the hash) or restores the local draft;
 * - while editing, saves the draft to localStorage (debounced).
 */
export function useDraft(): void {
  const { importShared } = useImporter();
  const reset = useEditorStore((state) => state.reset);
  const doc = useEditorStore((state) => state.doc);
  const spec = useEditorStore((state) => state.spec);
  const opened = useRef(false);

  useEffect(() => {
    if (opened.current) return;
    opened.current = true;
    const { hash, pathname, search } = window.location;
    if (hash.startsWith(SHARE_HASH_PREFIX)) {
      try {
        importShared(decodeShare(hash));
      } catch (error) {
        toast.error(importErrorMessage(error));
      }
      window.history.replaceState(window.history.state, "", `${pathname}${search}`);
      return;
    }
    const draft = readDraft();
    if (!draft) return;
    if (importShared(draft)) {
      toast("Trabalho anterior restaurado", {
        description: "Seu último SVG e a animação estavam salvos neste navegador.",
        action: {
          label: "Começar do zero",
          onClick: () => {
            clearDraft();
            reset();
          },
        },
      });
    } else {
      clearDraft();
    }
  }, [importShared, reset]);

  useEffect(() => {
    if (!doc) return;
    const timer = window.setTimeout(() => writeDraft({ svg: doc.raw, spec }), SAVE_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [doc, spec]);
}
