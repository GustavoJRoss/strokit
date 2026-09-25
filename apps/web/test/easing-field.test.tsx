import { describe, expect, it } from "vitest";
import { curveOf } from "@/components/editor/easing-field";

describe("curveOf", () => {
  it("maps CSS easing keywords to their cubic-bezier curves", () => {
    expect(curveOf("linear")).toEqual([0, 0, 1, 1]);
    expect(curveOf("ease")).toEqual([0.25, 0.1, 0.25, 1]);
    expect(curveOf("ease-in-out")).toEqual([0.42, 0, 0.58, 1]);
  });

  it("returns custom curves unchanged", () => {
    expect(curveOf({ cubicBezier: [0.1, -0.4, 0.2, 1.4] })).toEqual([0.1, -0.4, 0.2, 1.4]);
  });
});
