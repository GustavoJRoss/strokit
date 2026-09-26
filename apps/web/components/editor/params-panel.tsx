"use client";

import { describeParams, getPreset, presetIds, type Timing, type Track } from "@strokit/core";
import { PanelRightCloseIcon, TriangleAlertIcon } from "lucide-react";
import { useId } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useI18n } from "@/lib/i18n/provider";
import { cn } from "@/lib/utils";
import { useEditorStore } from "@/store/editor-store";
import { selectActiveTrack, selectCompiled } from "@/store/selectors";
import { CollapsibleSection } from "./collapsible-section";
import { EasingField, easingLabel } from "./easing-field";
import { NumberField } from "./number-field";

const DIRECTIONS: Timing["direction"][] = ["normal", "reverse", "alternate", "alternate-reverse"];

/** Translated label of a preset param / enum option, falling back to the core's metadata. */
function lookup(table: Record<string, string> | undefined, key: string, fallback: string): string {
  return table?.[key] ?? fallback;
}

function SelectField<T extends string>(props: {
  label: string;
  value: T | "";
  options: { value: T; label: string }[];
  placeholder?: string;
  onChange: (value: T) => void;
}) {
  const id = useId();
  return (
    <div className="flex items-center justify-between gap-2">
      <Label htmlFor={id} className="text-sm">
        {props.label}
      </Label>
      <Select value={props.value} onValueChange={(value) => props.onChange(value as T)}>
        <SelectTrigger id={id} size="sm" className="w-44">
          <SelectValue placeholder={props.placeholder} />
        </SelectTrigger>
        <SelectContent>
          {props.options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function PresetPicker() {
  const hasDoc = useEditorStore((state) => state.doc !== null);
  const selectionCount = useEditorStore((state) => state.selection.length);
  const activeTrack = useEditorStore(selectActiveTrack);
  const applyPreset = useEditorStore((state) => state.applyPresetToSelection);
  const { t } = useI18n();

  return (
    <CollapsibleSection
      id="preset"
      title={t.params.preset.title}
      defaultOpen
      summary={activeTrack ? t.presets[activeTrack.preset].label : t.params.preset.none}
    >
      <div className="grid gap-2">
        {presetIds.map((id) => {
          const preset = t.presets[id];
          const active = activeTrack?.preset === id;
          return (
            <button
              key={id}
              type="button"
              disabled={!hasDoc}
              aria-pressed={active}
              onClick={() => applyPreset(id)}
              className={cn(
                "flex flex-col items-start gap-0.5 rounded-lg border px-3 py-2 text-left text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50",
                active ? "border-primary bg-primary/5" : "hover:bg-muted",
              )}
            >
              <span className="font-medium">{preset.label}</span>
              <span className="text-muted-foreground text-xs">{preset.description}</span>
            </button>
          );
        })}
      </div>
      {hasDoc && (
        <p className="text-muted-foreground text-xs">
          {selectionCount > 0
            ? t.params.preset.appliesToSelection(selectionCount)
            : t.params.preset.appliesToAll}
        </p>
      )}
    </CollapsibleSection>
  );
}

function PresetParamsFields({ track }: { track: Track }) {
  const updateParams = useEditorStore((state) => state.updateParams);
  const { t } = useI18n();
  const labels: Record<string, string> = t.presetParams;
  const options: Record<string, Record<string, string>> = t.presetOptions;
  const fields = describeParams(getPreset(track.preset).paramsSchema);
  const params = track.params as Record<string, unknown>;
  return fields.map((field) => {
    if (field.kind === "number") {
      return (
        <NumberField
          key={field.key}
          label={lookup(labels, field.key, field.label)}
          value={Number(params[field.key] ?? field.min ?? 0)}
          min={field.min ?? 0}
          max={field.max ?? 100}
          step={field.step ?? 1}
          {...(field.unit ? { unit: field.unit } : {})}
          onChange={(value) => updateParams(track.id, { [field.key]: value })}
        />
      );
    }
    if (field.kind === "enum") {
      return (
        <SelectField
          key={field.key}
          label={lookup(labels, field.key, field.label)}
          value={String(params[field.key] ?? "")}
          options={field.options.map((option) => ({
            value: option.value,
            label: lookup(options[field.key], option.value, option.label),
          }))}
          onChange={(value) => updateParams(track.id, { [field.key]: value })}
        />
      );
    }
    return (
      <div key={field.key} className="flex items-center justify-between">
        <Label className="text-sm">{lookup(labels, field.key, field.label)}</Label>
        <Switch
          checked={Boolean(params[field.key])}
          onCheckedChange={(value) => updateParams(track.id, { [field.key]: value })}
        />
      </div>
    );
  });
}

function TimingSection() {
  const track = useEditorStore(selectActiveTrack);
  const hasSelection = useEditorStore((state) => state.selection.length > 0);
  const updateTiming = useEditorStore((state) => state.updateTiming);
  const { t } = useI18n();
  const copy = t.params.timing;

  if (!track) {
    return (
      <CollapsibleSection id="timing" title={copy.title} summary={copy.noTrackSummary}>
        <p className="text-muted-foreground text-sm">
          {hasSelection ? copy.layerWithoutPreset : copy.selectLayer}
        </p>
      </CollapsibleSection>
    );
  }

  const { timing } = track;
  const infinite = timing.iterations === "infinite";
  const set = (patch: Partial<Timing>) => updateTiming(track.id, patch);

  const repeats = timing.iterations === "infinite" ? copy.forever : copy.times(timing.iterations);

  return (
    <CollapsibleSection
      id="timing"
      title={copy.title}
      summary={copy.summary(timing.duration, easingLabel(timing.easing, t), repeats)}
    >
      <p className="-mt-1 text-muted-foreground text-xs">
        {copy.trackInfo(t.presets[track.preset].label, track.targets.length)}
      </p>
      <NumberField
        label={copy.duration}
        unit="ms"
        value={timing.duration}
        min={100}
        max={10_000}
        step={50}
        onChange={(duration) => set({ duration })}
      />
      <NumberField
        label={copy.delay}
        unit="ms"
        value={timing.delay}
        min={0}
        max={5000}
        step={50}
        onChange={(delay) => set({ delay })}
      />
      <EasingField value={timing.easing} onChange={(easing) => set({ easing })} />
      <NumberField
        label={copy.repetitions}
        value={timing.iterations === "infinite" ? 1 : timing.iterations}
        min={1}
        max={20}
        disabled={infinite}
        onChange={(iterations) => set({ iterations })}
      />
      <div className="flex items-center justify-between">
        <Label htmlFor="iterations-infinite" className="text-sm">
          {copy.repeatForever}
        </Label>
        <Switch
          id="iterations-infinite"
          checked={infinite}
          onCheckedChange={(checked) => set({ iterations: checked ? "infinite" : 1 })}
        />
      </div>
      <SelectField
        label={copy.direction}
        value={timing.direction}
        options={DIRECTIONS.map((value) => ({ value, label: copy.directions[value] }))}
        onChange={(direction) => set({ direction })}
      />
      <PresetParamsFields track={track} />
    </CollapsibleSection>
  );
}

function GlobalSection() {
  const hasDoc = useEditorStore((state) => state.doc !== null);
  const global = useEditorStore((state) => state.spec.global);
  const setA11yLabel = useEditorStore((state) => state.setA11yLabel);
  const setAutoStroke = useEditorStore((state) => state.setAutoStroke);
  const compiled = useEditorStore(selectCompiled);
  const missing =
    compiled?.warnings.filter((warning) => warning.code === "missing-stroke").length ?? 0;
  const labelId = useId();
  const { t } = useI18n();
  const copy = t.params.global;

  return (
    <CollapsibleSection
      id="global"
      title={copy.title}
      summary={copy.autoStrokeSummary(global.autoStroke.enabled)}
      alert={
        missing > 0 ? (
          <TriangleAlertIcon
            className="size-4 shrink-0 text-amber-600"
            aria-label={copy.missing(missing)}
          />
        ) : null
      }
    >
      <div className="flex flex-col gap-2">
        <Label htmlFor={labelId} className="text-sm">
          {copy.a11yLabel}
        </Label>
        <Input
          id={labelId}
          value={global.a11y.label}
          disabled={!hasDoc}
          onChange={(event) => setA11yLabel(event.target.value)}
        />
      </div>
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor="auto-stroke" className="text-sm">
          {copy.autoStroke}
        </Label>
        <Switch
          id="auto-stroke"
          checked={global.autoStroke.enabled}
          disabled={!hasDoc}
          onCheckedChange={(enabled) => setAutoStroke({ enabled })}
        />
      </div>
      {global.autoStroke.enabled && (
        <NumberField
          label={copy.strokeWidth}
          value={global.autoStroke.width}
          min={0.5}
          max={20}
          step={0.5}
          onChange={(width) => setAutoStroke({ width })}
        />
      )}
      <p className="text-muted-foreground text-xs">{copy.autoStrokeHint}</p>
      {missing > 0 && (
        <Alert>
          <TriangleAlertIcon />
          <AlertTitle>{copy.missing(missing)}</AlertTitle>
          <AlertDescription>
            {copy.missingBody}
            <Button
              size="xs"
              variant="outline"
              className="mt-2"
              onClick={() => setAutoStroke({ enabled: true })}
            >
              {copy.enableAutoStroke}
            </Button>
          </AlertDescription>
        </Alert>
      )}
    </CollapsibleSection>
  );
}

export function ParamsPanel({ onCollapse }: { onCollapse?: () => void }) {
  const { t } = useI18n();
  return (
    <aside aria-label={t.params.title} className="flex h-full min-h-0 flex-col">
      <div className="flex items-center gap-2 border-b px-3 py-2">
        {onCollapse ? (
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={onCollapse}
            aria-label={t.params.hide}
            title={t.params.hide}
          >
            <PanelRightCloseIcon />
          </Button>
        ) : null}
        <h2 className="font-medium text-sm">{t.params.title}</h2>
      </div>
      <ScrollArea className="min-h-0 flex-1">
        <PresetPicker />
        <TimingSection />
        <GlobalSection />
      </ScrollArea>
    </aside>
  );
}
