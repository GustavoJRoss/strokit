import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getInitialState, useEditorStore } from "@/store/editor-store";
import {
  selectActiveTrack,
  selectAnimationKey,
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
    store().restart();
    expect(store().playback).toEqual({
      playing: true,
      rate: 0.5,
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

    store().undo();
    expect(store().doc?.elements).toHaveLength(1);
    store().undo();
    expect(store().doc).toBeNull();
    expect(store().history.past).toHaveLength(0);

    store().redo();
    store().redo();
    expect(store().doc?.elements).toHaveLength(2);
    expect(store().history.future).toHaveLength(0);
  });

  it("drops the redo stack when something new is drawn", () => {
    store().enterDraw();
    store().addDrawnShapes(["M0 0H10V10H0Z"], "Desenho");
    store().undo();
    expect(store().history.future).toHaveLength(1);
    store().addDrawnShapes(["M0 0L5 5"], "Desenho");
    expect(store().history.future).toHaveLength(0);
  });

  it("ignores undo and redo when there is nothing to do", () => {
    store().enterDraw();
    store().undo();
    store().redo();
    expect(store().doc).toBeNull();
  });
});

describe("deleting layers", () => {
  beforeEach(() => useEditorStore.setState(getInitialState()));

  it("does nothing without a document or a selection", () => {
    expect(store().deleteLayers()).toBe(false);
    store().loadSvg(example("orbita.svg"), "Órbita");
    expect(store().deleteLayers()).toBe(false);
    expect(store().doc?.elements).toHaveLength(4);
  });

  it("deletes the selection and keeps the rest animated, renumbered", () => {
    store().loadSvg(example("orbita.svg"), "Órbita");
    store().select("sk-1");
    expect(store().deleteLayers()).toBe(true);
    const { doc, spec, selection } = store();
    expect(doc?.elements.map((element) => element.id)).toEqual(["sk-0", "sk-1", "sk-2"]);
    expect(spec.tracks.flatMap((track) => track.targets).sort()).toEqual(["sk-0", "sk-1", "sk-2"]);
    expect(selection).toEqual([]);
  });

  it("carries layer edits to the new ids", () => {
    store().loadSvg(example("orbita.svg"), "Órbita");
    store().updateLayers({ strokeWidth: 7 }, ["sk-3"]);
    store().select("sk-0");
    store().deleteLayers();
    expect(store().spec.layers).toEqual({ "sk-2": { strokeWidth: 7 } });
  });

  it("brings everything back with undo", () => {
    store().loadSvg(example("orbita.svg"), "Órbita");
    const before = store().spec;
    store().selectAll();
    store().deleteLayers();
    expect(store().doc).toBeNull();
    store().undo();
    expect(store().doc?.elements).toHaveLength(4);
    expect(store().spec).toBe(before);
    expect(store().fileName).toBe("Órbita");
  });

  it("can be undone while drawing too", () => {
    store().enterDraw();
    store().addDrawnShapes(["M0 0H10V10H0Z"], "Desenho");
    store().addDrawnShapes(["M20 20L30 30"], "Desenho");
    store().select("sk-0");
    store().deleteLayers();
    expect(store().doc?.elements).toHaveLength(1);
    store().undo();
    expect(store().doc?.elements).toHaveLength(2);
  });

  it("deletes the whole drawing down to a blank canvas when drawing", () => {
    store().enterDraw();
    store().addDrawnShapes(["M0 0H10V10H0Z"], "Desenho");
    store().deleteLayers();
    expect(store().doc).toBeNull();
    expect(store().draw.active).toBe(true);
    store().addDrawnShapes(["M0 0L5 5"], "Desenho");
    expect(store().doc?.elements).toHaveLength(1);
  });
});

describe("undo and redo", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useEditorStore.setState(getInitialState());
    store().loadSvg(example("orbita.svg"), "Órbita");
  });
  afterEach(() => vi.useRealTimers());

  const trackId = () => store().spec.tracks[0]?.id ?? "";

  it("starts empty, and does nothing when there is nothing to undo or redo", () => {
    const spec = store().spec;
    store().undo();
    store().redo();
    expect(store().spec).toBe(spec);
    expect(store().history.past).toHaveLength(0);
  });

  it("undoes and redoes a spec edit", () => {
    const before = store().spec;
    store().updateTiming(trackId(), { duration: 3 });
    const after = store().spec;
    store().undo();
    expect(store().spec).toBe(before);
    store().redo();
    expect(store().spec).toBe(after);
  });

  it("undoes preset and layer edits one by one", () => {
    const initial = store().spec;
    store().selectAll();
    store().applyPresetToSelection("pulse");
    const afterPreset = store().spec;
    store().updateLayers({ strokeWidth: 7 });
    store().undo();
    expect(store().spec).toBe(afterPreset);
    store().undo();
    expect(store().spec).toBe(initial);
  });

  it("merges a burst of the same edit into one step", () => {
    const before = store().spec;
    for (let i = 1; i <= 20; i++) {
      store().updateTiming(trackId(), { duration: i / 10 });
      vi.advanceTimersByTime(20);
    }
    expect(store().history.past).toHaveLength(1);
    store().undo();
    expect(store().spec).toBe(before);
  });

  it("keeps edits of different fields, or after a pause, as separate steps", () => {
    store().updateTiming(trackId(), { duration: 2 });
    store().updateTiming(trackId(), { delay: 1 });
    expect(store().history.past).toHaveLength(2);
    vi.advanceTimersByTime(600);
    store().updateTiming(trackId(), { delay: 2 });
    expect(store().history.past).toHaveLength(3);
  });

  it("drops the redo stack when something new is edited", () => {
    store().updateTiming(trackId(), { duration: 2 });
    store().undo();
    expect(store().history.future).toHaveLength(1);
    store().updateTiming(trackId(), { duration: 4 });
    expect(store().history.future).toHaveLength(0);
  });

  it("keeps at most 100 steps", () => {
    for (let i = 0; i < 120; i++) {
      store().setA11yLabel(`label ${i}`);
      vi.advanceTimersByTime(600);
    }
    expect(store().history.past).toHaveLength(100);
  });

  it("is not affected by selection, hover or playback", () => {
    store().select("sk-0");
    store().setHovered("sk-1");
    store().togglePlaying();
    store().setExportTab("react");
    expect(store().history.past).toHaveLength(0);
  });

  it("restores the document and the selection with it", () => {
    store().select("sk-1");
    store().deleteLayers();
    expect(store().doc?.elements).toHaveLength(3);
    store().undo();
    expect(store().doc?.elements).toHaveLength(4);
    expect(store().selection).toEqual(["sk-1"]);
    store().redo();
    expect(store().doc?.elements).toHaveLength(3);
  });

  it("is cleared by loading another SVG and by reset", () => {
    store().updateTiming(trackId(), { duration: 2 });
    store().loadSvg(example("pico.svg"), "Pico");
    expect(store().history.past).toHaveLength(0);
    store().updateTiming(trackId(), { duration: 2 });
    store().reset();
    expect(store().history.past).toHaveLength(0);
  });

  it("shares one history between drawing and spec edits", () => {
    store().enterDraw();
    store().addDrawnShapes(["M0 0L10 10"], "Desenho");
    store().updateTiming(trackId(), { duration: 5 });
    store().undo();
    expect(store().doc?.elements).toHaveLength(5);
    store().undo();
    expect(store().doc?.elements).toHaveLength(4);
  });
});

describe("moving layers", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useEditorStore.setState(getInitialState());
    store().loadSvg(example("orbita.svg"), "Órbita");
  });
  afterEach(() => vi.useRealTimers());

  const transformOf = (id: string) => {
    const find = (
      node: NonNullable<ReturnType<typeof store>["doc"]>["root"],
    ): string | undefined => {
      if (node.attrs["data-sk-id"] === id) return node.attrs.transform;
      for (const child of node.children) {
        if (child.type !== "element") continue;
        const found = find(child);
        if (found !== undefined) return found;
      }
      return undefined;
    };
    return store().doc ? find(store().doc?.root as never) : undefined;
  };

  it("edits the SVG, keeping ids, animations and selection", () => {
    const tracks = store().spec.tracks;
    store().select("sk-1");
    store().moveLayers(["sk-1"], 4, -2);
    // This layer was already rotated: the move goes in front of it.
    expect(transformOf("sk-1")).toBe("translate(4 -2) rotate(-28 80 80)");
    expect(store().doc?.elements).toHaveLength(4);
    expect(store().spec.tracks.map((track) => track.targets)).toEqual(
      tracks.map((track) => track.targets),
    );
    expect(store().selection).toEqual(["sk-1"]);
  });

  it("is one undo step, and redo moves it again", () => {
    store().moveLayers(["sk-0"], 5, 5);
    store().undo();
    expect(transformOf("sk-0")).toBeUndefined();
    store().redo();
    expect(transformOf("sk-0")).toBe("translate(5 5)");
  });

  it("folds repeated nudges of the same layers into one step, but not a drag", () => {
    store().moveLayers(["sk-0"], 1, 0, true);
    store().moveLayers(["sk-0"], 1, 0, true);
    store().moveLayers(["sk-0"], 1, 0, true);
    expect(store().history.past).toHaveLength(1);
    expect(transformOf("sk-0")).toBe("translate(3 0)");
    store().moveLayers(["sk-0"], 1, 0);
    store().moveLayers(["sk-0"], 1, 0);
    expect(store().history.past).toHaveLength(3);
  });

  it("does nothing without a document, layers or distance", () => {
    store().moveLayers(["sk-0"], 0, 0);
    store().moveLayers([], 5, 5);
    expect(store().history.past).toHaveLength(0);
    useEditorStore.setState(getInitialState());
    store().moveLayers(["sk-0"], 5, 5);
    expect(store().doc).toBeNull();
  });
});

describe("grouping layers", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useEditorStore.setState(getInitialState());
    store().loadSvg(example("orbita.svg"), "Órbita");
  });
  afterEach(() => vi.useRealTimers());

  const kinds = () => selectLayerTree(store()).map((node) => node.kind);

  it("groups the selection, selects the group and keeps every layer animated", () => {
    store().selectMany(["sk-1", "sk-3"]);
    expect(store().groupSelection()).toBeNull();
    // The group takes the place of the top layer (sk-3), so the others close ranks below it.
    expect(kinds()).toEqual(["layer", "layer", "group"]);
    expect(store().selection).toEqual(["sk-2", "sk-3"]);
    expect(store().doc?.elements).toHaveLength(4);
    expect(
      store()
        .spec.tracks.flatMap((track) => track.targets)
        .sort(),
    ).toEqual(["sk-0", "sk-1", "sk-2", "sk-3"]);
  });

  it("carries a layer edit to the renumbered id", () => {
    store().updateLayers({ strokeWidth: 7 }, ["sk-2"]);
    store().selectMany(["sk-0", "sk-3"]);
    store().groupSelection();
    // Group = sk-0 + sk-3, placed at the end: the layer left out (sk-2) is now second, sk-1.
    expect(store().spec.layers).toEqual({ "sk-1": { strokeWidth: 7 } });
  });

  it("explains what cannot be grouped, without leaving a step in the history", () => {
    store().select("sk-0");
    expect(store().groupSelection()).toBe("too-few");
    store().clearSelection();
    expect(store().groupSelection()).toBe("too-few");
    expect(store().history.past).toHaveLength(0);
  });

  it("undoes and redoes a group", () => {
    const before = store().doc;
    store().selectMany(["sk-0", "sk-1"]);
    store().groupSelection();
    expect(kinds()).toContain("group");
    store().undo();
    expect(store().doc).toBe(before);
    expect(kinds().every((kind) => kind === "layer")).toBe(true);
    store().redo();
    expect(kinds()).toContain("group");
  });

  it("ungroups, and says when there is no group", () => {
    store().selectMany(["sk-0", "sk-1"]);
    expect(store().ungroupSelection()).toBe("no-group");
    store().groupSelection();
    expect(store().ungroupSelection()).toBeNull();
    expect(kinds().every((kind) => kind === "layer")).toBe(true);
    expect(store().selection).toEqual(["sk-0", "sk-1"]);
  });

  it("moves a group as one node", () => {
    store().selectMany(["sk-0", "sk-1"]);
    store().groupSelection();
    store().moveLayers(["sk-0", "sk-1"], 4, 2);
    expect(store().doc?.raw).toContain('<g transform="translate(4 2)">');
  });
});

describe("drawing over shapes", () => {
  beforeEach(() => useEditorStore.setState(getInitialState()));

  it("starts off, and is armed by setDrawOver", () => {
    store().enterDraw();
    expect(store().draw.overShapes).toBe(false);
    store().setDrawOver(true);
    expect(store().draw.overShapes).toBe(true);
  });

  it("is dropped by a new shape, another tool, and by entering or leaving draw mode", () => {
    store().enterDraw();
    store().setDrawOver(true);
    store().addDrawnShapes(["M0 0L10 10"], "Desenho");
    expect(store().draw.overShapes).toBe(false);

    store().setDrawOver(true);
    store().setDrawTool("rect");
    expect(store().draw.overShapes).toBe(false);

    store().setDrawOver(true);
    store().exitDraw();
    expect(store().draw.overShapes).toBe(false);
    store().setDrawOver(true);
    store().enterDraw();
    expect(store().draw.overShapes).toBe(false);
  });
});

describe("restarting the preview", () => {
  beforeEach(() => {
    useEditorStore.setState(getInitialState());
    store().loadSvg(example("orbita.svg"), "Órbita");
  });

  const token = () => store().playback.restartToken;

  it("does not restart when a layer is moved, grouped, ungrouped or deleted, or on undo and redo", () => {
    const start = token();
    store().moveLayers(["sk-0"], 3, 3);
    store().selectMany(["sk-0", "sk-1"]);
    store().groupSelection();
    store().ungroupSelection();
    store().select("sk-2");
    store().deleteLayers();
    store().undo();
    store().redo();
    expect(token()).toBe(start);
  });

  it("restarts only on an explicit restart, or when another SVG is loaded", () => {
    const start = token();
    store().restart();
    expect(token()).toBe(start + 1);
    store().loadSvg(example("pico.svg"), "Pico");
    expect(token()).toBe(start + 2);
  });

  it("has an animation key that ignores which layers a step animates, but not its settings", () => {
    const key = selectAnimationKey(store());
    store().selectMany(["sk-0", "sk-1"]);
    store().groupSelection();
    store().moveLayers(["sk-0"], 2, 2);
    expect(selectAnimationKey(store())).toBe(key);

    const track = store().spec.tracks[0];
    store().updateTiming(track?.id ?? "", { duration: 9 });
    expect(selectAnimationKey(store())).not.toBe(key);
  });
});
