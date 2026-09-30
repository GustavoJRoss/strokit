"use client";

import { type DrawableElement, getLayer, type LayerNode, type LayerOverride } from "@strokit/core";
import {
  ChevronRightIcon,
  EyeIcon,
  EyeOffIcon,
  PanelLeftCloseIcon,
  PencilIcon,
  Trash2Icon,
  TriangleAlertIcon,
} from "lucide-react";
import { type MouseEvent, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useI18n } from "@/lib/i18n/provider";
import { cn } from "@/lib/utils";
import { type SelectMode, useEditorStore } from "@/store/editor-store";
import { selectCompiled, selectLayerTree } from "@/store/selectors";
import { useDeleteLayers } from "./use-delete-layers";

function Swatch({ element, override }: { element: DrawableElement; override: LayerOverride }) {
  const stroke = override.stroke ?? (element.hasStroke ? element.stroke : undefined);
  const fill = override.fill ?? (element.hasFill ? element.fill : undefined);
  const hasStroke = stroke !== undefined && stroke !== "none";
  const hasFill = fill !== undefined && fill !== "none";
  const color = hasStroke ? stroke : fill;
  const paintable = color && !color.startsWith("url(");
  const outline = hasStroke && !hasFill;
  return (
    <span
      aria-hidden
      className={cn("size-3 shrink-0 rounded-full border", outline && "border-2 bg-transparent")}
      style={
        paintable ? (outline ? { borderColor: color } : { backgroundColor: color }) : undefined
      }
    />
  );
}

function modeFor(event: MouseEvent): SelectMode {
  if (event.shiftKey) return "range";
  if (event.metaKey || event.ctrlKey) return "toggle";
  return "replace";
}

/** Keys that change how the layer looks or moves (the name alone is not an edit). */
function isEdited(override: LayerOverride): boolean {
  return Object.keys(override).some((key) => key !== "name" && key !== "hidden");
}

function VisibilityButton({ ids, hidden }: { ids: string[]; hidden: boolean }) {
  const updateLayers = useEditorStore((state) => state.updateLayers);
  const { t } = useI18n();
  const label = hidden ? t.layers.showLayer : t.layers.hideLayer;
  return (
    <Button
      variant="ghost"
      size="icon-xs"
      aria-label={label}
      title={label}
      aria-pressed={hidden}
      onClick={() => updateLayers({ hidden: hidden ? undefined : true }, ids)}
      className="shrink-0 text-muted-foreground"
    >
      {hidden ? <EyeOffIcon /> : <EyeIcon />}
    </Button>
  );
}

/** Trash icon of a row: shown on hover, focus or when the row is selected (and on touch, selected). */
function DeleteButton({ ids, visible }: { ids: string[]; visible: boolean }) {
  const deleteLayers = useDeleteLayers();
  const { t } = useI18n();
  const label = t.params.layer.delete(ids.length);
  return (
    <Button
      variant="ghost"
      size="icon-xs"
      aria-label={label}
      title={label}
      onClick={() => deleteLayers(ids)}
      className={cn(
        "shrink-0 text-muted-foreground opacity-0 hover:text-destructive focus-visible:opacity-100 group-focus-within/row:opacity-100 group-hover/row:opacity-100",
        visible && "opacity-100",
      )}
    >
      <Trash2Icon />
    </Button>
  );
}

function LayerRow({ element, depth }: { element: DrawableElement; depth: number }) {
  const spec = useEditorStore((state) => state.spec);
  const selected = useEditorStore((state) => state.selection.includes(element.id));
  const hovered = useEditorStore((state) => state.hovered === element.id);
  const select = useEditorStore((state) => state.select);
  const setHovered = useEditorStore((state) => state.setHovered);
  const compiled = useEditorStore(selectCompiled);
  const { t } = useI18n();

  const override = getLayer(spec, element.id);
  const track = spec.tracks.find((item) => item.targets.includes(element.id));
  const preset = track ? t.presets[track.preset].label : null;
  const hidden = override.hidden === true;
  const missingStroke = compiled?.warnings.some(
    (warning) => warning.code === "missing-stroke" && warning.elementId === element.id,
  );
  const name = override.name ?? t.layers.tags[element.tag];

  return (
    <li className="group/row flex items-center gap-0.5" style={{ paddingLeft: depth * 12 }}>
      <button
        type="button"
        aria-pressed={selected}
        aria-label={`${name} ${element.id}${preset ? `, ${preset}` : ""}`}
        onClick={(event) => select(element.id, modeFor(event))}
        onMouseEnter={() => setHovered(element.id)}
        onMouseLeave={() => setHovered(null)}
        onFocus={() => setHovered(element.id)}
        onBlur={() => setHovered(null)}
        className={cn(
          "flex min-w-0 flex-1 items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring",
          selected ? "bg-primary/10 text-foreground" : "hover:bg-muted",
          hovered && !selected && "bg-muted",
          hidden && "opacity-50",
        )}
      >
        <Swatch element={element} override={override} />
        <span className="min-w-0 truncate">{name}</span>
        <span className="shrink-0 text-muted-foreground text-xs">{element.id}</span>
        {isEdited(override) && (
          <PencilIcon
            className="size-3 shrink-0 text-muted-foreground"
            aria-label={t.layers.edited}
          />
        )}
        {missingStroke && (
          <TriangleAlertIcon
            className="size-3.5 shrink-0 text-amber-600"
            aria-label={t.layers.noStroke}
          />
        )}
        {preset && !hidden && (
          <Badge
            variant="secondary"
            className="ml-auto block min-w-0 max-w-[50%] shrink truncate"
            title={preset}
          >
            {preset}
          </Badge>
        )}
      </button>
      <VisibilityButton ids={[element.id]} hidden={hidden} />
      <DeleteButton ids={[element.id]} visible={selected} />
    </li>
  );
}

function GroupRow({
  node,
  depth,
  elements,
}: {
  node: Extract<LayerNode, { kind: "group" }>;
  depth: number;
  elements: Map<string, DrawableElement>;
}) {
  const [open, setOpen] = useState(true);
  const spec = useEditorStore((state) => state.spec);
  const selection = useEditorStore((state) => state.selection);
  const selectMany = useEditorStore((state) => state.selectMany);
  const { t } = useI18n();

  const selected = node.ids.every((id) => selection.includes(id));
  const hidden = node.ids.every((id) => getLayer(spec, id).hidden === true);
  const label = node.label ?? t.layers.group;

  return (
    <li>
      <div className="group/row flex items-center gap-0.5" style={{ paddingLeft: depth * 12 }}>
        <Button
          variant="ghost"
          size="icon-xs"
          aria-expanded={open}
          aria-label={open ? t.layers.collapse : t.layers.expand}
          onClick={() => setOpen(!open)}
          className="shrink-0 text-muted-foreground"
        >
          <ChevronRightIcon
            className={cn(
              "transition-transform motion-reduce:transition-none",
              open && "rotate-90",
            )}
          />
        </Button>
        <button
          type="button"
          aria-pressed={selected}
          onClick={(event) =>
            selectMany(node.ids, event.metaKey || event.ctrlKey ? "toggle" : "replace")
          }
          className={cn(
            "flex min-w-0 flex-1 items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring",
            selected ? "bg-primary/10 text-foreground" : "hover:bg-muted",
            hidden && "opacity-50",
          )}
        >
          <span className="min-w-0 truncate font-medium">{label}</span>
          <span className="shrink-0 text-muted-foreground text-xs">
            {t.layers.groupCount(node.ids.length)}
          </span>
        </button>
        <VisibilityButton ids={node.ids} hidden={hidden} />
        <DeleteButton ids={node.ids} visible={selected} />
      </div>
      {open && <LayerList nodes={node.children} depth={depth + 1} elements={elements} />}
    </li>
  );
}

function LayerList({
  nodes,
  depth,
  elements,
}: {
  nodes: LayerNode[];
  depth: number;
  elements: Map<string, DrawableElement>;
}) {
  return (
    <ul className="flex flex-col gap-0.5">
      {nodes.map((node) => {
        if (node.kind === "group") {
          return <GroupRow key={node.key} node={node} depth={depth} elements={elements} />;
        }
        const element = elements.get(node.id);
        return element ? <LayerRow key={node.id} element={element} depth={depth} /> : null;
      })}
    </ul>
  );
}

export function LayersPanel({ onCollapse }: { onCollapse?: () => void }) {
  const doc = useEditorStore((state) => state.doc);
  const fileName = useEditorStore((state) => state.fileName);
  const selection = useEditorStore((state) => state.selection);
  const selectAll = useEditorStore((state) => state.selectAll);
  const clearSelection = useEditorStore((state) => state.clearSelection);
  const tree = useEditorStore(selectLayerTree);
  const { t } = useI18n();
  const elements = new Map(doc?.elements.map((element) => [element.id, element]));

  return (
    <aside aria-label={t.layers.title} className="flex h-full min-h-0 flex-col">
      {fileName && (
        <p
          className="truncate border-b px-3 py-2 font-medium text-sm"
          title={fileName}
          data-testid="file-name"
        >
          {fileName}
        </p>
      )}
      <div className="flex items-center justify-between gap-2 border-b px-3 py-2">
        <h2 className="font-medium text-sm">
          {t.layers.title}
          {doc ? <span className="text-muted-foreground"> ({doc.elements.length})</span> : null}
        </h2>
        <div className="flex gap-1">
          <Button variant="ghost" size="xs" disabled={!doc} onClick={selectAll}>
            {t.layers.all}
          </Button>
          <Button
            variant="ghost"
            size="xs"
            disabled={selection.length === 0}
            onClick={clearSelection}
          >
            {t.layers.none}
          </Button>
          {onCollapse ? (
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={onCollapse}
              aria-label={t.layers.hide}
              title={t.layers.hide}
            >
              <PanelLeftCloseIcon />
            </Button>
          ) : null}
        </div>
      </div>
      <ScrollArea className="min-h-0 flex-1">
        {!doc ? (
          <p className="p-3 text-muted-foreground text-sm">{t.layers.empty}</p>
        ) : (
          <div className="p-1.5">
            <LayerList nodes={tree} depth={0} elements={elements} />
          </div>
        )}
      </ScrollArea>
      {doc && <p className="border-t px-3 py-2 text-muted-foreground text-xs">{t.layers.hint}</p>}
    </aside>
  );
}
