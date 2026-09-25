import type { SvgElementNode } from "./tree";

export const DRAWABLE_TAGS = [
  "path",
  "line",
  "polyline",
  "polygon",
  "rect",
  "circle",
  "ellipse",
] as const;

export type DrawableTag = (typeof DRAWABLE_TAGS)[number];

export type DrawableElement = {
  /** "sk-0", "sk-1"… stable by document order. */
  id: string;
  tag: DrawableTag;
  hasFill: boolean;
  hasStroke: boolean;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  /** Filled in by browser measurement, when available. */
  length?: number;
};

export type SvgDocument = {
  viewBox: [number, number, number, number];
  width?: number;
  height?: number;
  elements: DrawableElement[];
  /** Sanitized, normalized tree. Drawables carry `data-sk-id`. */
  root: SvgElementNode;
  /** `root` serialized. */
  raw: string;
};
