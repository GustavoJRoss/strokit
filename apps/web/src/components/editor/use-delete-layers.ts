"use client";

import { useCallback } from "react";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n/provider";
import { useEditorStore } from "@/store/editor-store";

/**
 * Deletes layers (the selection by default) and offers to undo it. While drawing, deleting
 * joins the drawing history instead (Ctrl/Cmd+Z), so no toast.
 */
export function useDeleteLayers(): (ids?: string[]) => void {
  const { t } = useI18n();
  const copy = t.params.layer;
  return useCallback(
    (ids?: string[]) => {
      const store = useEditorStore.getState();
      const count = ids?.length ?? store.selection.length;
      const snapshot = store.deleteLayers(ids);
      if (!snapshot || useEditorStore.getState().draw.active) return;
      toast(copy.deleted(count), {
        action: {
          label: copy.undoDelete,
          onClick: () => useEditorStore.getState().restoreSnapshot(snapshot),
        },
      });
    },
    [copy],
  );
}
