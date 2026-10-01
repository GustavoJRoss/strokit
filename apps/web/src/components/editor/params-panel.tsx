"use client";

import {
  type AnimationSpec,
  describeParams,
  getPreset,
  moveStep,
  type PresetId,
  presetIds,
  type Timing,
  type Track,
} from "@strokit/core";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  PanelRightCloseIcon,
  Trash2Icon,
  TriangleAlertIcon,
} from "lucide-react";
import { useId } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { useI18n } from "@/lib/i18n/provider";
import { cn } from "@/lib/utils";
import { useEditorStore } from "@/store/editor-store";
import { selectActiveTrack, selectChain, selectCompiled } from "@/store/selectors";
import { CollapsibleSection } from "./collapsible-section";
import { EasingField, easingLabel } from "./easing-field";
import { LayerSection } from "./layer-inspector";
import { NumberField } from "./number-field";
import { SelectField } from "./select-field";

/** True when swapping the step's preset would break the sequence (outline preset mid-chain). */
function replaceBlocked(spec: AnimationSpec, trackId: string, preset: PresetId): boolean {
  const track = spec.tracks.find((item) => item.id === trackId);
  return track !== undefined && getPreset(preset).kind === "stroke" && track.after !== undefined;
}

const DIRECTIONS: Timing["direction"][] = ["normal", "reverse", "alternate", "alternate-reverse"];

/** Translated label of a preset param / enum option, falling back to the core's metadata. */
function lookup(table: Record<string, string> | undefined, key: string, fallback: string): string {
  return table?.[key] ?? fallback;
}

function SequenceSection() {
  const hasDoc = useEditorStore((state) => state.doc !== null);
  const spec = useEditorStore((state) => state.spec);
  const chain = useEditorStore(selectChain);
  const activeTrack = useEditorStore(selectActiveTrack);
  const addStep = useEditorStore((state) => state.addStepToSelection);
  const removeStep = useEditorStore((state) => state.removeStep);
  const moveStepAction = useEditorStore((state) => state.moveStep);
  const selectStep = useEditorStore((state) => state.selectStep);
  const { t } = useI18n();
  const copy = t.params.sequence;
  // Outline presets only start a sequence; everything else can follow any step.
  const addable = presetIds.filter((id) => chain.length === 0 || getPreset(id).kind !== "stroke");

  return (
    <CollapsibleSection
      id="sequence"
      title={copy.title}
      defaultOpen
      summary={copy.summary(chain.length)}
    >
      {chain.length === 0 ? (
        <p className="text-muted-foreground text-sm">{copy.empty}</p>
      ) : (
        <ol className="grid gap-1.5" aria-label={copy.title}>
          {chain.map((track, index) => (
            <li
              key={track.id}
              className={cn(
                "flex items-center gap-1 rounded-lg border pr-1 text-sm",
                track.id === activeTrack?.id ? "border-primary bg-primary/5" : "",
              )}
            >
              <button
                type="button"
                aria-pressed={track.id === activeTrack?.id}
                onClick={() => selectStep(track.id)}
                className="flex min-w-0 flex-1 items-center justify-between gap-2 rounded-lg px-3 py-2 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span className="truncate font-medium">
                  {copy.step(index + 1, t.presets[track.preset].label)}
                </span>
                <span className="shrink-0 text-muted-foreground text-xs">
                  {track.timing.duration} ms
                </span>
              </button>
              {chain.length > 1 && (
                <>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    aria-label={copy.moveUp}
                    title={copy.moveUp}
                    disabled={moveStep(spec, track.id, -1) === spec}
                    onClick={() => moveStepAction(track.id, -1)}
                  >
                    <ArrowUpIcon />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    aria-label={copy.moveDown}
                    title={copy.moveDown}
                    disabled={moveStep(spec, track.id, 1) === spec}
                    onClick={() => moveStepAction(track.id, 1)}
                  >
                    <ArrowDownIcon />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    aria-label={copy.remove}
                    title={copy.remove}
                    onClick={() => removeStep(track.id)}
                  >
                    <Trash2Icon />
                  </Button>
                </>
              )}
            </li>
          ))}
        </ol>
      )}
      {hasDoc && (
        <SelectField
          label={copy.addLabel}
          value=""
          placeholder={copy.add}
          options={addable.map((id) => ({ value: id, label: t.presets[id].label }))}
          onChange={(id) => addStep(id)}
        />
      )}
      <p className="text-muted-foreground text-xs">
        {copy.hint}
        {chain.length > 0 ? ` ${copy.outlineFirst}` : ""}
      </p>
    </CollapsibleSection>
  );
}

function PresetPicker() {
  const hasDoc = useEditorStore((state) => state.doc !== null);
  const selectionCount = useEditorStore((state) => state.selection.length);
  const activeTrack = useEditorStore(selectActiveTrack);
  const chain = useEditorStore(selectChain);
  const applyToSelection = useEditorStore((state) => state.applyPresetToSelection);
  const replaceStepPreset = useEditorStore((state) => state.replaceStepPreset);
  const spec = useEditorStore((state) => state.spec);
  const { t } = useI18n();
  // Inside a sequence a preset replaces the step being edited, not the whole sequence.
  const inSequence = activeTrack !== null && chain.length > 1;
  const applyPreset = (id: PresetId) =>
    inSequence ? replaceStepPreset(activeTrack.id, id) : applyToSelection(id);

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
          // An outline preset cannot be swapped into the middle of a sequence.
          const blocked =
            inSequence && spec.tracks.length > 0 && replaceBlocked(spec, activeTrack.id, id);
          return (
            <button
              key={id}
              type="button"
              disabled={!hasDoc || blocked}
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
      {hasDoc && !inSequence && (
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
  const spec = useEditorStore((state) => state.spec);
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
  const followed = spec.tracks.some((item) => item.after === track.id);
  const chained = track.after !== undefined;
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
      {chained && <p className="-mt-2 text-muted-foreground text-xs">{copy.delayAfterPrevious}</p>}
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
          disabled={followed}
          onCheckedChange={(checked) => set({ iterations: checked ? "infinite" : 1 })}
        />
      </div>
      {followed && <p className="-mt-2 text-muted-foreground text-xs">{copy.loopLast}</p>}
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
          unit={global.strokeUnit === "visual" ? "%" : undefined}
          value={global.autoStroke.width}
          min={0.5}
          max={100}
          step={0.5}
          onChange={(width) => setAutoStroke({ width })}
        />
      )}
      <p className="text-muted-foreground text-xs">{copy.autoStrokeHint}</p>
      {global.strokeUnit === "visual" && (
        <p className="text-muted-foreground text-xs">{copy.strokeWidthHint}</p>
      )}
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
        <LayerSection />
        <SequenceSection />
        <PresetPicker />
        <TimingSection />
        <GlobalSection />
      </ScrollArea>
    </aside>
  );
}
