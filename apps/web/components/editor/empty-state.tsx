"use client";

import { ExamplesMenu, FilePickerButton, PasteDialogButton } from "./import-controls";

export function EmptyState() {
  return (
    <div className="flex size-full items-center justify-center p-8">
      <div className="flex max-w-md flex-col items-center gap-4 rounded-xl border border-dashed bg-background/80 p-8 text-center backdrop-blur">
        <h1 className="font-semibold text-lg">Arraste a sua logo SVG para cá</h1>
        <p className="text-muted-foreground text-sm">
          Ou escolha um arquivo, cole o markup (Ctrl/⌘+V também funciona) ou comece com um exemplo.
          Nada sai do seu navegador.
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          <FilePickerButton variant="default" />
          <PasteDialogButton />
          <ExamplesMenu />
        </div>
      </div>
    </div>
  );
}
