"use client";

import { decodeShare, SHARE_HASH_PREFIX } from "@strokekit/core";
import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { importErrorMessage } from "@/lib/messages";
import { shareHash } from "@/lib/project";
import { useEditorStore } from "@/store/editor-store";
import { useImporter } from "./use-importer";

const DEBOUNCE_MS = 300;

/**
 * Opens `#s=` links on load and keeps the hash in sync with the animation (debounced).
 * The hash never reaches a server, so the SVG stays in the browser.
 */
export function useShareSync(): void {
  const { importShared } = useImporter();
  const doc = useEditorStore((state) => state.doc);
  const spec = useEditorStore((state) => state.spec);
  const opened = useRef(false);

  useEffect(() => {
    if (opened.current) return;
    opened.current = true;
    const { hash } = window.location;
    if (!hash.startsWith(SHARE_HASH_PREFIX)) return;
    try {
      importShared(decodeShare(hash));
    } catch (error) {
      toast.error(importErrorMessage(error));
    }
  }, [importShared]);

  useEffect(() => {
    if (!doc) return;
    const timer = window.setTimeout(() => {
      const hash = shareHash({ svg: doc.raw, spec });
      useEditorStore.setState({ shareTooLarge: hash === null });
      const url = `${window.location.pathname}${window.location.search}${hash ?? ""}`;
      window.history.replaceState(window.history.state, "", url);
    }, DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [doc, spec]);
}
