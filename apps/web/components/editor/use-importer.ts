"use client";

import { useMemo } from "react";
import { toast } from "sonner";
import { type Example, fetchExample } from "@/lib/examples";
import { importErrorMessage, importWarningMessage } from "@/lib/messages";
import { baseName, readSvgFile } from "@/lib/svg-file";
import { useEditorStore } from "@/store/editor-store";

/** Every import path (file, drop, paste, example) goes through here. Errors become toasts. */
export function useImporter() {
  const loadSvg = useEditorStore((state) => state.loadSvg);

  return useMemo(() => {
    const importMarkup = (markup: string, name: string): boolean => {
      try {
        loadSvg(markup, name);
      } catch (error) {
        toast.error(importErrorMessage(error));
        return false;
      }
      const warnings = useEditorStore.getState().importWarnings;
      if (warnings.length > 0) {
        toast.warning("SVG importado com ajustes", {
          description: warnings.map(importWarningMessage).join("\n"),
        });
      }
      return true;
    };

    const importFile = async (file: File): Promise<boolean> => {
      try {
        return importMarkup(await readSvgFile(file), baseName(file.name));
      } catch (error) {
        toast.error(importErrorMessage(error));
        return false;
      }
    };

    const importExample = async (example: Example): Promise<boolean> => {
      try {
        return importMarkup(await fetchExample(example), example.name);
      } catch (error) {
        toast.error(importErrorMessage(error));
        return false;
      }
    };

    return { importMarkup, importFile, importExample };
  }, [loadSvg]);
}
