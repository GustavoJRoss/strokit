"use client";

import {
  describeParams,
  type EasingPreset,
  getPreset,
  presetIds,
  type Timing,
  type Track,
} from "@strokekit/core";
import { TriangleAlertIcon } from "lucide-react";
import { useId } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { useEditorStore } from "@/store/editor-store";
import { selectActiveTrack, selectCompiled } from "@/store/selectors";
import { NumberField } from "./number-field";

const EASINGS: { value: EasingPreset; label: string }[] = [
  { value: "linear", label: "Linear" },
  { value: "ease", label: "Suave" },
  { value: "ease-in", label: "Acelerar" },
  { value: "ease-out", label: "Desacelerar" },
  { value: "ease-in-out", label: "Acelerar e desacelerar" },
];

const DIRECTIONS: { value: Timing["direction"]; label: string }[] = [
  { value: "normal", label: "Normal" },
  { value: "reverse", label: "Reversa" },
  { value: "alternate", label: "Vai e volta" },
  { value: "alternate-reverse", label: "Volta e vai" },
];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-4 p-4">
      <h2 className="font-medium text-sm">{title}</h2>
      {children}
    </section>
  );
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

  return (
    <Section title="Preset">
      <div className="grid gap-2">
        {presetIds.map((id) => {
          const preset = getPreset(id);
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
            ? `Aplica às ${selectionCount} camada(s) selecionada(s).`
            : "Sem seleção: aplica a todas as camadas."}
        </p>
      )}
    </Section>
  );
}

function PresetParamsFields({ track }: { track: Track }) {
  const updateParams = useEditorStore((state) => state.updateParams);
  const fields = describeParams(getPreset(track.preset).paramsSchema);
  const params = track.params as Record<string, unknown>;
  return fields.map((field) => {
    if (field.kind === "number") {
      return (
        <NumberField
          key={field.key}
          label={field.label}
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
          label={field.label}
          value={String(params[field.key] ?? "")}
          options={field.options.map((option) => ({ value: option, label: option }))}
          onChange={(value) => updateParams(track.id, { [field.key]: value })}
        />
      );
    }
    return (
      <div key={field.key} className="flex items-center justify-between">
        <Label className="text-sm">{field.label}</Label>
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

  if (!track) {
    return (
      <Section title="Animação">
        <p className="text-muted-foreground text-sm">
          {hasSelection
            ? "A camada selecionada não tem preset. Escolha um acima."
            : "Selecione uma camada para editar a animação dela."}
        </p>
      </Section>
    );
  }

  const { timing } = track;
  const infinite = timing.iterations === "infinite";
  const easing = typeof timing.easing === "string" ? timing.easing : "";
  const set = (patch: Partial<Timing>) => updateTiming(track.id, patch);

  return (
    <Section title="Animação">
      <p className="-mt-2 text-muted-foreground text-xs">
        {getPreset(track.preset).label} · {track.targets.length} camada(s)
      </p>
      <NumberField
        label="Duração"
        unit="ms"
        value={timing.duration}
        min={100}
        max={10_000}
        step={50}
        onChange={(duration) => set({ duration })}
      />
      <NumberField
        label="Atraso"
        unit="ms"
        value={timing.delay}
        min={0}
        max={5000}
        step={50}
        onChange={(delay) => set({ delay })}
      />
      <SelectField
        label="Easing"
        value={easing}
        placeholder="Personalizado"
        options={EASINGS}
        onChange={(value) => set({ easing: value })}
      />
      <NumberField
        label="Repetições"
        value={timing.iterations === "infinite" ? 1 : timing.iterations}
        min={1}
        max={20}
        disabled={infinite}
        onChange={(iterations) => set({ iterations })}
      />
      <div className="flex items-center justify-between">
        <Label htmlFor="iterations-infinite" className="text-sm">
          Repetir para sempre
        </Label>
        <Switch
          id="iterations-infinite"
          checked={infinite}
          onCheckedChange={(checked) => set({ iterations: checked ? "infinite" : 1 })}
        />
      </div>
      <SelectField
        label="Direção"
        value={timing.direction}
        options={DIRECTIONS}
        onChange={(direction) => set({ direction })}
      />
      <PresetParamsFields track={track} />
    </Section>
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

  return (
    <Section title="Geral">
      <div className="flex flex-col gap-2">
        <Label htmlFor={labelId} className="text-sm">
          Rótulo acessível
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
          Traço automático
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
          label="Largura do traço"
          value={global.autoStroke.width}
          min={0.5}
          max={20}
          step={0.5}
          onChange={(width) => setAutoStroke({ width })}
        />
      )}
      <p className="text-muted-foreground text-xs">
        Camadas só com preenchimento ganham um traço na cor do preenchimento para os presets de
        traço funcionarem.
      </p>
      {missing > 0 && (
        <Alert>
          <TriangleAlertIcon />
          <AlertTitle>{missing} camada(s) sem traço</AlertTitle>
          <AlertDescription>
            O preset desenha o traço, mas essas camadas só têm preenchimento. Ative o traço
            automático para vê-las animar.
          </AlertDescription>
        </Alert>
      )}
    </Section>
  );
}

export function ParamsPanel() {
  return (
    <aside aria-label="Parâmetros" className="flex min-h-0 flex-col border-l">
      <ScrollArea className="min-h-0 flex-1">
        <PresetPicker />
        <Separator />
        <TimingSection />
        <Separator />
        <GlobalSection />
      </ScrollArea>
    </aside>
  );
}
