"use client";

import { type SvgElementNode, serializeSvg } from "@strokit/core";
import { CodeIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useI18n } from "@/lib/i18n/provider";
import { importErrorMessage, importWarningMessage } from "@/lib/messages";
import { useEditorStore } from "@/store/editor-store";

/** Indented markup: one element per line, elements with only text stay on one line. */
function pretty(element: SvgElementNode, depth = 0): string {
  const pad = "  ".repeat(depth);
  const nested = element.children.filter((child) => child.type === "element");
  if (nested.length === 0) return `${pad}${serializeSvg(element)}`;
  // Serializing the element without children gives its open tag as `<name …/>`.
  const open = serializeSvg({ ...element, children: [] }).replace(/\/>$/, ">");
  const children = nested.map((child) => pretty(child as SvgElementNode, depth + 1));
  return [`${pad}${open}`, ...children, `${pad}</${element.name}>`].join("\n");
}

/** The normalized SVG, indented and without the editor's `data-sk-id` markers. */
function editableMarkup(node: SvgElementNode): string {
  const strip = (element: SvgElementNode): SvgElementNode => {
    const { "data-sk-id": _id, ...attrs } = element.attrs;
    return {
      ...element,
      attrs,
      children: element.children.map((child) => (child.type === "element" ? strip(child) : child)),
    };
  };
  return pretty(strip(node));
}

export function SvgEditorButton() {
  const doc = useEditorStore((state) => state.doc);
  const replaceSvg = useEditorStore((state) => state.replaceSvg);
  const [open, setOpen] = useState(false);
  const [markup, setMarkup] = useState("");
  const { t } = useI18n();
  const copy = t.svgEditor;

  const apply = () => {
    try {
      const result = replaceSvg(markup);
      const warnings = useEditorStore.getState().importWarnings;
      toast.success(copy.applied, {
        description: [
          copy.summary(result.kept.length, result.added.length, result.removed.length),
          ...warnings.map((warning) => importWarningMessage(warning, t)),
        ].join("\n"),
      });
      setOpen(false);
    } catch (error) {
      toast.error(importErrorMessage(error, t));
    }
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        disabled={!doc}
        onClick={() => {
          if (!doc) return;
          setMarkup(editableMarkup(doc.root));
          setOpen(true);
        }}
      >
        <CodeIcon data-icon="inline-start" />
        {copy.button}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{copy.title}</DialogTitle>
            <DialogDescription>{copy.description}</DialogDescription>
          </DialogHeader>
          <Label htmlFor="edit-svg" className="sr-only">
            {copy.label}
          </Label>
          <Textarea
            id="edit-svg"
            value={markup}
            spellCheck={false}
            onChange={(event) => setMarkup(event.target.value)}
            className="h-80 font-mono text-xs"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              {t.common.cancel}
            </Button>
            <Button disabled={markup.trim() === ""} onClick={apply}>
              {copy.apply}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
