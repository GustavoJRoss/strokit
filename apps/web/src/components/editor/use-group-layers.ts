"use client";

import { useCallback } from "react";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n/provider";
import { useEditorStore } from "@/store/editor-store";

/** Group / ungroup the selection; what cannot be done is explained in a toast. */
export function useGroupLayers(): { group: () => void; ungroup: () => void } {
  const { t } = useI18n();
  const errors = t.layers.groupErrors;
  const group = useCallback(() => {
    const code = useEditorStore.getState().groupSelection();
    if (code) toast.error(errors[code]);
  }, [errors]);
  const ungroup = useCallback(() => {
    const code = useEditorStore.getState().ungroupSelection();
    if (code) toast.error(errors[code]);
  }, [errors]);
  return { group, ungroup };
}
