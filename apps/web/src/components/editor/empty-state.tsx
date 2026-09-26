"use client";

import { useI18n } from "@/lib/i18n/provider";
import { ExamplesMenu, FilePickerButton, PasteDialogButton } from "./import-controls";

export function EmptyState() {
  const { t } = useI18n();
  return (
    <div className="flex size-full items-center justify-center p-8">
      <div className="flex max-w-md flex-col items-center gap-4 rounded-xl border border-dashed bg-background/80 p-8 text-center backdrop-blur">
        <h1 className="font-semibold text-lg">{t.empty.title}</h1>
        <p className="text-muted-foreground text-sm">{t.empty.body}</p>
        <div className="flex flex-wrap justify-center gap-2">
          <FilePickerButton variant="default" />
          <PasteDialogButton />
          <ExamplesMenu />
        </div>
      </div>
    </div>
  );
}
