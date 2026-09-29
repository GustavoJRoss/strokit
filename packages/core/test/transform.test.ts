import { describe, expect, it } from "vitest";
import {
  apply,
  determinant,
  IDENTITY,
  invert,
  isSimilarity,
  multiply,
  parseTransform,
} from "../src/svg/transform";

const close = (actual: readonly number[], expected: readonly number[]) => {
  for (const [index, value] of expected.entries()) expect(actual[index]).toBeCloseTo(value, 6);
};

describe("parseTransform", () => {
  it("treats a missing or empty transform as identity", () => {
    expect(parseTransform(undefined)).toEqual(IDENTITY);
    expect(parseTransform("  ")).toEqual(IDENTITY);
  });

  it("parses translate, scale and matrix, composing left to right", () => {
    expect(parseTransform("translate(10 20)")).toEqual([1, 0, 0, 1, 10, 20]);
    expect(parseTransform("scale(2)")).toEqual([2, 0, 0, 2, 0, 0]);
    expect(parseTransform("matrix(1,0,0,1,5,6)")).toEqual([1, 0, 0, 1, 5, 6]);
    // translate first, then scale in the translated space: x' = 2·x + 10
    close(parseTransform("translate(10, 0) scale(2)") ?? [], [2, 0, 0, 2, 10, 0]);
  });

  it("parses rotate around a point", () => {
    const matrix = parseTransform("rotate(90 10 10)");
    expect(matrix).not.toBeNull();
    close(apply(matrix ?? IDENTITY, 20, 10), [10, 20]);
    close(apply(matrix ?? IDENTITY, 10, 10), [10, 10]);
  });

  it("rejects unknown functions, bad numbers and leftovers", () => {
    expect(parseTransform("perspective(3)")).toBeNull();
    expect(parseTransform("translate(a b)")).toBeNull();
    expect(parseTransform("translate(1 2) junk")).toBeNull();
    expect(parseTransform("matrix(1 2 3)")).toBeNull();
  });
});

describe("matrix helpers", () => {
  it("inverts a matrix", () => {
    const matrix = parseTransform("translate(10 5) scale(0.5)") ?? IDENTITY;
    const inverse = invert(matrix);
    expect(inverse).not.toBeNull();
    close(multiply(matrix, inverse ?? IDENTITY), IDENTITY);
  });

  it("does not invert a singular matrix", () => {
    expect(invert([0, 0, 0, 0, 1, 1])).toBeNull();
  });

  it("detects mirroring through the determinant", () => {
    expect(determinant(parseTransform("scale(-1 1)") ?? IDENTITY)).toBeLessThan(0);
  });

  it("tells similarities from skew and non-uniform scale", () => {
    expect(isSimilarity(parseTransform("translate(3 4) rotate(30) scale(2)") ?? IDENTITY)).toBe(
      true,
    );
    expect(isSimilarity(parseTransform("scale(-2 2)") ?? IDENTITY)).toBe(true);
    expect(isSimilarity(parseTransform("scale(2 1)") ?? IDENTITY)).toBe(false);
    expect(isSimilarity(parseTransform("skewX(20)") ?? IDENTITY)).toBe(false);
  });
});
