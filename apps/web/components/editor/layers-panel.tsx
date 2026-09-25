"use client";

import { type DrawableElement, getPreset } from "@strokekit/core";
import { TriangleAlertIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useEditorStore } from "@/store/editor-store";
import { selectCompiled } from "@/store/selectors";

const TAG_LABELS: Record<DrawableElement["tag"], string> = {
  path: "Caminho",
  line: "Linha",
  polyline: "Polilinha",
  polygon: "Polígono",
  rect: "Retângulo",
  circle: "Círculo",
  ellipse: "Elipse",
};

function Swatch({ element }: { element: DrawableElement }) {
  const color = element.hasStroke ? element.stroke : element.fill;
  const paintable = color && !color.startsWith("url(");
  return (
    <span
      aria-hidden
      className={cn(
        "size-3 shrink-0 rounded-full border",
        element.hasStroke && !element.hasFill && "border-2 bg-transparent",
      )}
      style={
        paintable
          ? element.hasStroke && !element.hasFill
            ? { borderColor: color }
            : { backgroundColor: color }
          : undefined
      }
    />
  );
}

export function LayersPanel() {
  const doc = useEditorStore((state) => state.doc);
  const spec = useEditorStore((state) => state.spec);
  const selection = useEditorStore((state) => state.selection);
  const hovered = useEditorStore((state) => state.hovered);
  const select = useEditorStore((state) => state.select);
  const selectAll = useEditorStore((state) => state.selectAll);
  const clearSelection = useEditorStore((state) => state.clearSelection);
  const setHovered = useEditorStore((state) => state.setHovered);
  const compiled = useEditorStore(selectCompiled);

  const missingStroke = new Set(
    compiled?.warnings
      .filter((warning) => warning.code === "missing-stroke")
      .map((warning) => warning.elementId),
  );
  const presetFor = (id: string) => {
    const track = spec.tracks.find((item) => item.targets.includes(id));
    return track ? getPreset(track.preset).label : null;
  };

  return (
    <aside aria-label="Camadas" className="flex min-h-0 flex-col border-r">
      <div className="flex items-center justify-between gap-2 border-b px-3 py-2">
        <h2 className="font-medium text-sm">
          Camadas
          {doc ? <span className="text-muted-foreground"> ({doc.elements.length})</span> : null}
        </h2>
        <div className="flex gap-1">
          <Button variant="ghost" size="xs" disabled={!doc} onClick={selectAll}>
            Todas
          </Button>
          <Button
            variant="ghost"
            size="xs"
            disabled={selection.length === 0}
            onClick={clearSelection}
          >
            Nenhuma
          </Button>
        </div>
      </div>
      <ScrollArea className="min-h-0 flex-1">
        {!doc ? (
          <p className="p-3 text-muted-foreground text-sm">Importe um SVG para ver as camadas.</p>
        ) : (
          <ul className="flex flex-col gap-0.5 p-1.5">
            {doc.elements.map((element) => {
              const selected = selection.includes(element.id);
              const preset = presetFor(element.id);
              return (
                <li key={element.id}>
                  <button
                    type="button"
                    aria-pressed={selected}
                    aria-label={`${TAG_LABELS[element.tag]} ${element.id}${preset ? `, ${preset}` : ""}`}
                    onClick={(event) =>
                      select(
                        element.id,
                        event.shiftKey
                          ? "range"
                          : event.metaKey || event.ctrlKey
                            ? "toggle"
                            : "replace",
                      )
                    }
                    onMouseEnter={() => setHovered(element.id)}
                    onMouseLeave={() => setHovered(null)}
                    onFocus={() => setHovered(element.id)}
                    onBlur={() => setHovered(null)}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      selected ? "bg-primary/10 text-foreground" : "hover:bg-muted",
                      hovered === element.id && !selected && "bg-muted",
                    )}
                  >
                    <Swatch element={element} />
                    <span className="truncate">{TAG_LABELS[element.tag]}</span>
                    <span className="text-muted-foreground text-xs">{element.id}</span>
                    {missingStroke.has(element.id) && (
                      <TriangleAlertIcon
                        className="size-3.5 shrink-0 text-amber-600"
                        aria-label="Sem traço: ative o traço automático"
                      />
                    )}
                    {preset && (
                      <Badge variant="secondary" className="ml-auto">
                        {preset}
                      </Badge>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </ScrollArea>
      {doc && (
        <p className="border-t px-3 py-2 text-muted-foreground text-xs">
          Shift seleciona um intervalo; Ctrl/⌘ soma à seleção.
        </p>
      )}
    </aside>
  );
}
