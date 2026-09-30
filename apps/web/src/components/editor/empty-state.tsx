"use client";

import { PencilLineIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n/provider";
import { useEditorStore } from "@/store/editor-store";
import { ExamplesMenu, FilePickerButton, PasteDialogButton } from "./import-controls";

export function EmptyState() {
  const { t } = useI18n();
  const enterDraw = useEditorStore((state) => state.enterDraw);
  return (
    <div className="flex size-full items-center justify-center p-8">
      <div className="flex max-w-md flex-col items-center gap-4 rounded-xl border border-dashed bg-background/80 p-8 text-center backdrop-blur">
        <h1 className="font-semibold text-lg">{t.empty.title}</h1>
        <p className="text-muted-foreground text-sm">{t.empty.body}</p>
        <div className="flex flex-wrap justify-center gap-2">
          <FilePickerButton variant="default" />
          <PasteDialogButton />
          <ExamplesMenu />
          <Button variant="outline" size="sm" onClick={enterDraw}>
            <PencilLineIcon data-icon="inline-start" />
            {t.draw.createFromScratch}
          </Button>
        </div>
      </div>
    </div>
  );
}
