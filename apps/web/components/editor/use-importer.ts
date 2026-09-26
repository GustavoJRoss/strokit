"use client";

import { parseProject, type SharedAnimation } from "@strokit/core";
import { useMemo } from "react";
import { toast } from "sonner";
import { type Example, ExampleLoadError, fetchExample } from "@/lib/examples";
import type { Dictionary } from "@/lib/i18n/dictionaries/pt";
import { useI18n } from "@/lib/i18n/provider";
import { importErrorMessage, importWarningMessage } from "@/lib/messages";
import { isProjectFile } from "@/lib/project";
import { baseName, readSvgFile } from "@/lib/svg-file";
import { useEditorStore } from "@/store/editor-store";

function reportWarnings(t: Dictionary): void {
  const warnings = useEditorStore.getState().importWarnings;
  if (warnings.length > 0) {
    toast.warning(t.importing.adjusted, {
      description: warnings.map((warning) => importWarningMessage(warning, t)).join("\n"),
    });
  }
}

/** Every import path (file, drop, paste, example, link, project) goes through here. Errors become toasts. */
export function useImporter() {
  const loadSvg = useEditorStore((state) => state.loadSvg);
  const loadShared = useEditorStore((state) => state.loadShared);
  const { t } = useI18n();

  return useMemo(() => {
    const importMarkup = (markup: string, name: string): boolean => {
      try {
        loadSvg(markup, name);
      } catch (error) {
        toast.error(importErrorMessage(error, t));
        return false;
      }
      reportWarnings(t);
      return true;
    };

    const importShared = (shared: SharedAnimation): boolean => {
      try {
        loadShared(shared);
      } catch (error) {
        toast.error(importErrorMessage(error, t));
        return false;
      }
      reportWarnings(t);
      return true;
    };

    const importFile = async (file: File): Promise<boolean> => {
      try {
        // Projects are recognized by extension or by content (downloads can lose the extension).
        if (isProjectFile(file) || (await file.slice(0, 64).text()).trimStart().startsWith("{")) {
          return importShared(parseProject(await file.text()));
        }
        return importMarkup(await readSvgFile(file), baseName(file.name));
      } catch (error) {
        toast.error(importErrorMessage(error, t));
        return false;
      }
    };

    const importExample = async (example: Example): Promise<boolean> => {
      const name = t.examples[example.id].name;
      try {
        return importMarkup(await fetchExample(example), name);
      } catch (error) {
        toast.error(
          error instanceof ExampleLoadError
            ? t.importing.exampleFailed(name)
            : importErrorMessage(error, t),
        );
        return false;
      }
    };

    return { importMarkup, importShared, importFile, importExample };
  }, [loadSvg, loadShared, t]);
}
