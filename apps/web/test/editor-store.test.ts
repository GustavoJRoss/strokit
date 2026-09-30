import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { getInitialState, useEditorStore } from "@/store/editor-store";
import {
  selectActiveTrack,
  selectCompiled,
  selectCssExport,
  selectLayerTree,
  selectPreviewMarkup,
} from "@/store/selectors";

const example = (file: string) =>
  readFileSync(join(import.meta.dirname, "..", "public", "examples", file), "utf8");

const store = () => useEditorStore.getState();

describe("editor store", () => {
  beforeEach(() => useEditorStore.setState(getInitialState()));

  it("loads an SVG and animates every layer with draw", () => {
    store().loadSvg(example("orbita.svg"), "Órbita");
    const { doc, spec, playback } = store();
    expect(doc?.elements).toHaveLength(4);
    expect(spec.name).toBe("Órbita");
    expect(spec.global.a11y.label).toBe("Órbita");
    expect(spec.global.autoStroke.enabled).toBe(false);
    expect(spec.tracks).toHaveLength(1);
    expect(spec.tracks[0]?.targets).toEqual(["sk-0", "sk-1", "sk-2", "sk-3"]);
    expect(playback.restartToken).toBe(1);
  });

  it("enables auto-stroke for fill-only logos and resolves class styles", () => {
    store().loadSvg(example("pico.svg"), "Pico");
    expect(store().spec.global.autoStroke.enabled).toBe(true);
    expect(selectCompiled(store())?.warnings).toEqual([]);

    store().loadSvg(example("onda.svg"), "Onda");
    expect(store().doc?.elements.map((element) => element.stroke ?? element.fill)).toEqual([
      "#0ea5e9",
      "#38bdf8",
      "#7dd3fc",
      "#0369a1",
    ]);
  });

  it("keeps the previous document when an import fails", () => {
    store().loadSvg(example("orbita.svg"), "Órbita");
    expect(() => store().loadSvg("<html/>", "x")).toThrowError(
      expect.objectContaining({ code: "not-svg" }),
    );
    expect(store().fileName).toBe("Órbita");
  });

  it("selects with replace, toggle and range modes", () => {
    store().loadSvg(example("orbita.svg"), "Órbita");
    store().select("sk-1");
    expect(store().selection).toEqual(["sk-1"]);
    store().select("sk-3", "toggle");
    expect(store().selection).toEqual(["sk-1", "sk-3"]);
    store().select("sk-3", "toggle");
    store().select("sk-1");
    store().select("sk-3", "range");
    expect(store().selection).toEqual(["sk-1", "sk-2", "sk-3"]);
    store().selectAll();
    expect(store().selection).toHaveLength(4);
    store().clearSelection();
    expect(store().selection).toEqual([]);
  });

  it("applies presets to the selection, or to everything without one", () => {
    store().loadSvg(example("orbita.svg"), "Órbita");
    store().select("sk-2");
    store().applyPresetToSelection("comet");
    expect(store().spec.tracks.map((track) => track.targets)).toEqual([
      ["sk-0", "sk-1", "sk-3"],
      ["sk-2"],
    ]);
    expect(selectActiveTrack(store())?.id).toBe("track-1");

    store().clearSelection();
    store().applyPresetToSelection("comet");
    expect(store().spec.tracks).toHaveLength(1);
    expect(selectActiveTrack(store())?.targets).toHaveLength(4);
  });

  it("updates timing and global settings through the spec", () => {
    store().loadSvg(example("pico.svg"), "Pico");
    const trackId = store().spec.tracks[0]?.id ?? "";
    store().updateTiming(trackId, { duration: 2400, iterations: "infinite" });
    store().setA11yLabel("Carregando");
    store().setAutoStroke({ width: 4 });
    const css = selectCssExport(store()) ?? "";
    expect(css).toContain("2400ms");
    expect(css).toContain("infinite");
    expect(css).toContain('aria-label="Carregando"');
    // Visual units: 4% of pico's 200-wide viewBox.
    expect(css).toContain("stroke-width: 8;");
  });

  it("controls preview playback without touching the spec", () => {
    store().loadSvg(example("orbita.svg"), "Órbita");
    const spec = store().spec;
    store().togglePlaying();
    store().setRate(0.5);
    store().setBackground("dark");
    store().setReducedMotion(true);
    store().restart();
    expect(store().playback).toEqual({
      playing: true,
      rate: 0.5,
      reducedMotion: true,
      background: "dark",
      restartToken: 2,
    });
    expect(store().spec).toBe(spec);
  });
});

describe("selectors", () => {
  beforeEach(() => useEditorStore.setState(getInitialState()));

  it("return null without a document", () => {
    expect(selectCompiled(store())).toBeNull();
    expect(selectCssExport(store())).toBeNull();
    expect(selectPreviewMarkup(store())).toBeNull();
    expect(selectActiveTrack(store())).toBeNull();
  });

  it("memoize on spec identity", () => {
    store().loadSvg(example("orbita.svg"), "Órbita");
    const first = selectCssExport(store());
    store().setHovered("sk-1");
    store().select("sk-1");
    expect(selectCssExport(store())).toBe(first);
    store().setA11yLabel("outro");
    expect(selectCssExport(store())).not.toBe(first);
  });

  it("render the exact exported CSS in the preview, plus element ids", () => {
    store().loadSvg(example("orbita.svg"), "Órbita");
    const exported = selectCssExport(store()) ?? "";
    const preview = selectPreviewMarkup(store()) ?? "";
    const style = (markup: string) => /<style>([\s\S]*)<\/style>/.exec(markup)?.[1];
    expect(style(preview)).toBe(style(exported));
    expect(preview).toContain('data-sk-id="sk-0"');
    expect(exported).not.toContain("data-sk-id");
  });

  it("edits the selected layers and resets them", () => {
    store().loadSvg(example("orbita.svg"), "Órbita");
    store().updateLayers({ stroke: "#e11d48" });
    expect(store().spec.layers).toBeUndefined();

    store().selectMany(["sk-0", "sk-2"]);
    store().updateLayers({ stroke: "#e11d48", strokeWidth: 3 });
    expect(Object.keys(store().spec.layers ?? {})).toEqual(["sk-0", "sk-2"]);
    expect(selectCssExport(store())).toContain(
      "var(--sk-layer-0-stroke, var(--sk-stroke, #e11d48))",
    );

    store().resetLayers(["sk-0"]);
    expect(Object.keys(store().spec.layers ?? {})).toEqual(["sk-2"]);
    store().resetLayers();
    expect(store().spec.layers).toBeUndefined();
  });

  it("selects groups and toggles them", () => {
    store().loadSvg(example("orbita.svg"), "Órbita");
    store().selectMany(["sk-1", "sk-2"]);
    expect(store().selection).toEqual(["sk-1", "sk-2"]);
    store().selectMany(["sk-2", "sk-3"], "toggle");
    expect(store().selection).toEqual(["sk-1", "sk-2", "sk-3"]);
    store().selectMany(["sk-2", "sk-3"], "toggle");
    expect(store().selection).toEqual(["sk-1"]);
  });

  it("sets the start point from the canvas and selects the layer", () => {
    store().loadSvg(example("anel.svg"), "Anel");
    store().setTool("start");
    store().setLayerStart("sk-1", 0.25);
    expect(store().spec.layers).toEqual({ "sk-1": { start: 0.25 } });
    expect(store().selection).toEqual(["sk-1"]);
    store().setLayerStart("sk-1", 0);
    expect(store().spec.layers).toBeUndefined();
    store().loadSvg(example("anel.svg"), "Anel");
    expect(store().tool).toBe("select");
  });

  it("replaces the SVG keeping animations and edits of the layers that remain", () => {
    store().loadSvg(example("orbita.svg"), "Órbita");
    store().select("sk-3");
    store().applyPresetToSelection("comet");
    store().updateLayers({ name: "Lua" });
    const markup = example("orbita.svg").replace(/<circle cx="126"[^>]*\/>/, "");
    const result = store().replaceSvg(markup);
    expect(result.removed).toEqual(["sk-3"]);
    expect(store().doc?.elements).toHaveLength(3);
    expect(store().spec.tracks.map((track) => track.preset)).toEqual(["draw-fill"]);
    expect(store().spec.layers).toBeUndefined();
    expect(store().selection).toEqual([]);

    expect(() => store().replaceSvg("<html/>")).toThrowError(
      expect.objectContaining({ code: "not-svg" }),
    );
    expect(store().doc?.elements).toHaveLength(3);
  });

  it("derives the layer tree from the document", () => {
    expect(selectLayerTree(store())).toEqual([]);
    store().loadSvg(example("pico.svg"), "Pico");
    expect(selectLayerTree(store()).map((node) => node.kind)).toEqual([
      "layer",
      "group",
      "layer",
      "layer",
    ]);
  });
});

describe("draw mode", () => {
  beforeEach(() => useEditorStore.setState(getInitialState()));

  it("starts inactive with the pencil as the tool", () => {
    expect(store().draw.active).toBe(false);
    expect(store().draw.tool).toBe("pencil");
  });

  it("adds a pencil stroke (curved path data) like any other shape", () => {
    store().enterDraw();
    store().addDrawnShapes(["M0 0C1 1 5 10 10 10C13 10 18 1 20 0"], "Desenho");
    expect(store().doc?.elements).toHaveLength(1);
    expect(store().doc?.elements[0]?.tag).toBe("path");
  });

  it("leaves the document alone when entered and exited", () => {
    expect(store().draw.active).toBe(false);
    store().enterDraw();
    expect(store().draw.active).toBe(true);
    expect(store().doc).toBeNull();
    store().exitDraw();
    expect(store().draw.active).toBe(false);
    expect(store().doc).toBeNull();
  });

  it("creates a blank SVG on the first shape, animated with the default preset", () => {
    store().enterDraw();
    store().addDrawnShapes(["M0 0H100V100H0Z"], "Desenho");
    const { doc, spec, selection, fileName } = store();
    expect(fileName).toBe("Desenho");
    expect(doc?.viewBox).toEqual([0, 0, 512, 512]);
    expect(doc?.elements).toHaveLength(1);
    expect(spec.tracks[0]?.targets).toEqual(["sk-0"]);
    expect(selection).toEqual(["sk-0"]);
    // 2% of the larger side of the blank canvas.
    expect(doc?.elements[0]?.strokeWidth).toBeCloseTo(10.24);
  });

  it("adds shapes on top of an imported SVG and keeps its animation", () => {
    store().loadSvg(example("orbita.svg"), "Órbita");
    const before = store().doc?.elements.length ?? 0;
    const firstTrack = store().spec.tracks[0];
    store().enterDraw();
    store().addDrawnShapes(["M0 0L10 10", "M5 5L20 20"], "Desenho");
    const { doc, spec, selection } = store();
    expect(doc?.elements).toHaveLength(before + 2);
    expect(selection).toEqual([`sk-${before}`, `sk-${before + 1}`]);
    expect(spec.tracks.flatMap((track) => track.targets)).toContain(`sk-${before + 1}`);
    expect(spec.tracks[0]?.preset).toBe(firstTrack?.preset);
  });

  it("measures new strokes in the same unit as the width slider", () => {
    store().loadSvg(example("pico.svg"), "Pico");
    const [, , width, height] = store().doc?.viewBox ?? [0, 0, 0, 0];
    store().enterDraw();
    store().setDrawStyle({ width: 10, color: "#ff0000" });
    store().addDrawnShapes(["M0 0L10 10"], "Desenho");
    const drawn = store().doc?.elements.at(-1);
    expect(drawn?.stroke).toBe("#ff0000");
    expect(drawn?.strokeWidth).toBeCloseTo(Math.max(width, height) * 0.1);
  });

  it("undoes and redoes shapes, back to a blank canvas", () => {
    store().enterDraw();
    store().addDrawnShapes(["M0 0H10V10H0Z"], "Desenho");
    store().addDrawnShapes(["M20 20L30 30"], "Desenho");
    expect(store().doc?.elements).toHaveLength(2);

    store().undoDraw();
    expect(store().doc?.elements).toHaveLength(1);
    store().undoDraw();
    expect(store().doc).toBeNull();
    expect(store().draw.past).toHaveLength(0);

    store().redoDraw();
    store().redoDraw();
    expect(store().doc?.elements).toHaveLength(2);
    expect(store().draw.future).toHaveLength(0);
  });

  it("drops the redo stack when something new is drawn", () => {
    store().enterDraw();
    store().addDrawnShapes(["M0 0H10V10H0Z"], "Desenho");
    store().undoDraw();
    expect(store().draw.future).toHaveLength(1);
    store().addDrawnShapes(["M0 0L5 5"], "Desenho");
    expect(store().draw.future).toHaveLength(0);
  });

  it("ignores undo and redo when there is nothing to do", () => {
    store().enterDraw();
    store().undoDraw();
    store().redoDraw();
    expect(store().doc).toBeNull();
  });
});
