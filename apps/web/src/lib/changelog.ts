import type { Dictionary } from "./i18n/dictionaries/pt";

export type ChangelogId = keyof Dictionary["changelog"];
export type ChangelogEntry = { id: ChangelogId; date: string };

/**
 * User-facing milestones, newest first. Dates are the commit dates (YYYY-MM-DD); titles and
 * bodies live in the dictionaries (`t.changelog[id]`), like every other piece of UI text.
 */
export const CHANGELOG: ChangelogEntry[] = [
  { id: "delete-layers", date: "2026-09-30" },
  { id: "pen-tool", date: "2026-09-30" },
  { id: "freehand-pencil", date: "2026-09-30" },
  { id: "draw-shapes", date: "2026-09-30" },
  { id: "consistent-stroke-width", date: "2026-09-30" },
  { id: "animation-sequence", date: "2026-09-30" },
  { id: "shine-preset", date: "2026-09-30" },
  { id: "fade-preset", date: "2026-09-29" },
  { id: "seo", date: "2026-09-29" },
  { id: "leaner-presets", date: "2026-09-28" },
  { id: "open-source-section", date: "2026-09-28" },
  { id: "layer-editing", date: "2026-09-26" },
  { id: "three-languages", date: "2026-09-26" },
  { id: "open-source-license", date: "2026-09-26" },
  { id: "react-motion-export", date: "2026-09-25" },
  { id: "video-export", date: "2026-09-25" },
  { id: "complete-presets", date: "2026-09-25" },
  { id: "editor-mvp", date: "2026-09-25" },
];
