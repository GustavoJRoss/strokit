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
