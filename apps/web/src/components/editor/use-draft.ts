"use client";

import { decodeShare, SHARE_HASH_PREFIX } from "@strokit/core";
import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { clearDraft, readDraft, writeDraft } from "@/lib/draft";
import { useI18n } from "@/lib/i18n/provider";
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
  const { t } = useI18n();
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
        toast.error(importErrorMessage(error, t));
      }
      window.history.replaceState(window.history.state, "", `${pathname}${search}`);
      return;
    }
    const draft = readDraft();
    if (!draft) return;
    if (importShared(draft)) {
      toast(t.draft.restored, {
        description: t.draft.restoredBody,
        action: {
          label: t.draft.startOver,
          onClick: () => {
            clearDraft();
            reset();
          },
        },
      });
    } else {
      clearDraft();
    }
    // Runs once (guarded by `opened`), even if the language changes later.
  }, [importShared, reset, t]);

  useEffect(() => {
    if (!doc) return;
    const timer = window.setTimeout(() => writeDraft({ svg: doc.raw, spec }), SAVE_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [doc, spec]);
}
