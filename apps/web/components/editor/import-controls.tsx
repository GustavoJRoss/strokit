"use client";

import { ChevronDownIcon, ClipboardPasteIcon, SparklesIcon, UploadIcon } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { EXAMPLES } from "@/lib/examples";
import { useImporter } from "./use-importer";

export function FilePickerButton({ variant = "outline" }: { variant?: "outline" | "default" }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { importFile } = useImporter();
  return (
    <>
      <Button variant={variant} size="sm" onClick={() => inputRef.current?.click()}>
        <UploadIcon data-icon="inline-start" />
        Importar SVG
      </Button>
      <input
        ref={inputRef}
        type="file"
        accept=".svg,image/svg+xml"
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        data-testid="file-input"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void importFile(file);
          event.target.value = "";
        }}
      />
    </>
  );
}

export function PasteDialogButton() {
  const [open, setOpen] = useState(false);
  const [markup, setMarkup] = useState("");
  const { importMarkup } = useImporter();
  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <ClipboardPasteIcon data-icon="inline-start" />
        Colar markup
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Colar SVG</DialogTitle>
            <DialogDescription>
              Cole o código do SVG. Ele é sanitizado antes de qualquer renderização e não sai do seu
              navegador.
            </DialogDescription>
          </DialogHeader>
          <Label htmlFor="paste-svg" className="sr-only">
            Markup do SVG
          </Label>
          <Textarea
            id="paste-svg"
            value={markup}
            onChange={(event) => setMarkup(event.target.value)}
            placeholder='<svg xmlns="http://www.w3.org/2000/svg" …'
            className="h-56 font-mono text-xs"
          />
          <DialogFooter>
            <Button
              disabled={markup.trim() === ""}
              onClick={() => {
                if (importMarkup(markup, "logo")) {
                  setOpen(false);
                  setMarkup("");
                }
              }}
            >
              Importar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function ExamplesMenu({ variant = "outline" }: { variant?: "outline" | "ghost" }) {
  const { importExample } = useImporter();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={variant} size="sm">
          <SparklesIcon data-icon="inline-start" />
          Exemplos
          <ChevronDownIcon data-icon="inline-end" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {EXAMPLES.map((example) => (
          <DropdownMenuItem key={example.id} onSelect={() => void importExample(example)}>
            <div className="flex flex-col">
              <span>{example.name}</span>
              <span className="text-muted-foreground text-xs">{example.description}</span>
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
