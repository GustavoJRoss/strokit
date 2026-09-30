"use client";

import {
  colorSchema,
  type DrawableElement,
  getLayer,
  type LayerOverride,
  type LayerPatch,
  type SvgDocument,
  strokeScales,
  toVisualWidth,
} from "@strokit/core";
import { CrosshairIcon, RotateCcwIcon } from "lucide-react";
import { useEffect, useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toHexColor } from "@/lib/color";
import { useI18n } from "@/lib/i18n/provider";
import { cn } from "@/lib/utils";
import { useEditorStore } from "@/store/editor-store";
import { CollapsibleSection } from "./collapsible-section";
import { NumberField } from "./number-field";
import { SelectField } from "./select-field";

const INHERIT = "inherit";

type ColorFieldProps = {
  label: string;
  /** Current color: the override, or the SVG's own. */
  value: string | undefined;
  /** Shown when there is no color at all (e.g. "Automatic"). */
  placeholder: string;
  overridden: boolean;
  onChange: (value: string | undefined) => void;
};

/** Native color picker + text field (any CSS color the core accepts) + back to the original. */
function ColorField({ label, value, placeholder, overridden, onChange }: ColorFieldProps) {
  const id = useId();
  const errorId = useId();
  const { t } = useI18n();
  const copy = t.params.layer;
  const [draft, setDraft] = useState(value ?? "");
  const [invalid, setInvalid] = useState(false);

  useEffect(() => {
    setDraft(value ?? "");
    setInvalid(false);
  }, [value]);

  const commit = () => {
    const text = draft.trim();
    if (text === (value ?? "")) return;
    if (text === "") {
      onChange(undefined);
      return;
    }
    const parsed = colorSchema.safeParse(text);
    setInvalid(!parsed.success);
    if (parsed.success) onChange(parsed.data);
  };

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={id} className="text-sm">
          {label}
        </Label>
        <div className="flex items-center gap-1">
          <input
            type="color"
            aria-label={label}
            value={toHexColor(value) ?? "#000000"}
            onChange={(event) => onChange(event.target.value)}
            className="size-7 shrink-0 cursor-pointer rounded-md border bg-transparent p-0.5"
          />
          <Input
            id={id}
            aria-label={copy.colorText(label)}
            aria-invalid={invalid || undefined}
            aria-describedby={invalid ? errorId : undefined}
            value={draft}
            placeholder={placeholder}
            spellCheck={false}
            className="h-7 w-28 font-mono text-xs"
            onChange={(event) => setDraft(event.target.value)}
            onBlur={commit}
            onKeyDown={(event) => {
              if (event.key === "Enter") commit();
            }}
          />
          <Button
            variant="ghost"
            size="icon-xs"
            disabled={!overridden}
            onClick={() => onChange(undefined)}
            aria-label={`${label}: ${copy.original}`}
            title={copy.original}
          >
            <RotateCcwIcon />
          </Button>
        </div>
      </div>
      {invalid && (
        <p id={errorId} className="text-destructive text-xs">
          {copy.invalidColor}
        </p>
      )}
    </div>
  );
}

function NameField({ id, override }: { id: string; override: LayerOverride }) {
  const updateLayers = useEditorStore((state) => state.updateLayers);
  const inputId = useId();
  const hintId = useId();
  const { t } = useI18n();
  const copy = t.params.layer;
  const [draft, setDraft] = useState(override.name ?? "");

  useEffect(() => setDraft(override.name ?? ""), [override.name]);

  const commit = () => {
    const name = draft.trim().slice(0, 60);
    if (name !== (override.name ?? "")) updateLayers({ name: name || undefined }, [id]);
  };

  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={inputId} className="text-sm">
        {copy.name}
      </Label>
      <Input
        id={inputId}
        value={draft}
        maxLength={60}
        placeholder={copy.namePlaceholder}
        aria-describedby={hintId}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === "Enter") commit();
        }}
      />
      <p id={hintId} className="text-muted-foreground text-xs">
        {copy.nameHint}
      </p>
    </div>
  );
}

/** Effective stroke of an element (override or SVG) and what to call it when it has none. */
function strokeOf(element: DrawableElement, override: LayerOverride, auto: boolean) {
  if (override.stroke !== undefined) return override.stroke;
  if (element.hasStroke) return element.stroke;
  return auto ? (override.fill ?? element.fill) : undefined;
}

/** The SVG's own stroke width of an element, in the unit the sliders use. */
function nativeWidth(
  element: DrawableElement,
  doc: SvgDocument | null,
  visual: boolean,
): number | undefined {
  if (element.strokeWidth === undefined || !doc) return element.strokeWidth;
  if (!visual) return element.strokeWidth;
  const { unit, scales } = strokeScales(doc);
  return toVisualWidth(element.strokeWidth, unit, scales.get(element.id) ?? 1);
}

export function LayerSection() {
  const doc = useEditorStore((state) => state.doc);
  const spec = useEditorStore((state) => state.spec);
  const selection = useEditorStore((state) => state.selection);
  const tool = useEditorStore((state) => state.tool);
  const setTool = useEditorStore((state) => state.setTool);
  const updateLayers = useEditorStore((state) => state.updateLayers);
  const resetLayers = useEditorStore((state) => state.resetLayers);
  const { t } = useI18n();
  const copy = t.params.layer;

  const elements = selection
    .map((id) => doc?.elements.find((element) => element.id === id))
    .filter((element): element is DrawableElement => element !== undefined);
  const first = elements[0];

  if (!first) {
    return (
      <CollapsibleSection id="layer" title={copy.title} summary={copy.none} defaultOpen>
        <p className="text-muted-foreground text-sm">{copy.selectHint}</p>
      </CollapsibleSection>
    );
  }

  const override = getLayer(spec, first.id);
  const many = elements.length > 1;
  const edited = elements.some((element) => Object.keys(getLayer(spec, element.id)).length > 0);
  const auto = spec.global.autoStroke.enabled;
  const set = (patch: LayerPatch) => updateLayers(patch);
  const stroke = strokeOf(first, override, auto);
  const fill = override.fill ?? first.fill;
  const hasStroke = stroke !== undefined && stroke !== "none";
  const visual = spec.global.strokeUnit === "visual";
  const width =
    override.strokeWidth ?? nativeWidth(first, doc, visual) ?? spec.global.autoStroke.width;
  const start = override.start ?? 0;
  const summary = many
    ? copy.selected(elements.length)
    : (override.name ?? t.layers.tags[first.tag]);

  return (
    <CollapsibleSection id="layer" title={copy.title} summary={summary} defaultOpen>
      {many ? (
        <p className="-mt-1 text-muted-foreground text-xs">{copy.editingMany(elements.length)}</p>
      ) : (
        <NameField key={first.id} id={first.id} override={override} />
      )}

      <div className="flex items-center justify-between gap-2">
        <Label htmlFor="layer-visible" className="text-sm">
          {copy.visible}
        </Label>
        <Switch
          id="layer-visible"
          checked={override.hidden !== true}
          onCheckedChange={(visible) => set({ hidden: visible ? undefined : true })}
        />
      </div>

      <ColorField
        label={copy.stroke}
        value={stroke}
        placeholder={copy.noColor}
        overridden={override.stroke !== undefined}
        onChange={(value) => set({ stroke: value })}
      />
      <ColorField
        label={copy.fill}
        value={first.tag === "line" ? undefined : fill}
        placeholder={copy.noColor}
        overridden={override.fill !== undefined}
        onChange={(value) => set({ fill: value })}
      />

      <NumberField
        label={copy.strokeWidth}
        unit={visual ? "%" : undefined}
        value={width}
        min={0}
        max={100}
        step={0.5}
        onChange={(strokeWidth) => set({ strokeWidth })}
      />
      <NumberField
        label={copy.opacity}
        unit="%"
        value={Math.round((override.opacity ?? 1) * 100)}
        min={0}
        max={100}
        step={1}
        onChange={(percent) => set({ opacity: percent === 100 ? undefined : percent / 100 })}
      />
      {hasStroke && (
        <>
          <SelectField
            label={copy.linecap}
            value={override.linecap ?? INHERIT}
            options={[
              { value: INHERIT, label: copy.fromSvg },
              ...(["butt", "round", "square"] as const).map((value) => ({
                value,
                label: copy.linecaps[value],
              })),
            ]}
            onChange={(value) => set({ linecap: value === INHERIT ? undefined : value })}
          />
          <SelectField
            label={copy.linejoin}
            value={override.linejoin ?? INHERIT}
            options={[
              { value: INHERIT, label: copy.fromSvg },
              ...(["miter", "round", "bevel"] as const).map((value) => ({
                value,
                label: copy.linejoins[value],
              })),
            ]}
            onChange={(value) => set({ linejoin: value === INHERIT ? undefined : value })}
          />
        </>
      )}

      <div className="flex flex-col gap-2">
        <NumberField
          label={copy.start}
          unit="%"
          value={Math.round(start * 1000) / 10}
          min={0}
          max={100}
          step={0.5}
          onChange={(percent) => set({ start: percent === 0 ? undefined : percent / 100 })}
        />
        <Button
          variant={tool === "start" ? "default" : "outline"}
          size="sm"
          aria-pressed={tool === "start"}
          onClick={() => setTool(tool === "start" ? "select" : "start")}
          className="self-start"
        >
          <CrosshairIcon data-icon="inline-start" />
          {copy.pickStart}
        </Button>
        <p
          className={cn("text-xs", tool === "start" ? "text-foreground" : "text-muted-foreground")}
          aria-live="polite"
        >
          {tool === "start" ? copy.picking : copy.startHint}
        </p>
      </div>
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor="layer-reverse" className="text-sm">
          {copy.reverse}
        </Label>
        <Switch
          id="layer-reverse"
          checked={override.reverse === true}
          onCheckedChange={(reverse) => set({ reverse: reverse ? true : undefined })}
        />
      </div>

      <Button
        variant="outline"
        size="sm"
        disabled={!edited}
        onClick={() => resetLayers()}
        className="self-start"
      >
        <RotateCcwIcon data-icon="inline-start" />
        {copy.reset}
      </Button>
    </CollapsibleSection>
  );
}
