import { describe, expect, it, vi } from "vitest";
import { memoizeLast } from "@/lib/memoize";

describe("memoizeLast", () => {
  it("recomputes only when an argument identity changes", () => {
    const fn = vi.fn((a: object, b: number) => ({ a, b }));
    const memo = memoizeLast(fn);
    const key = {};
    const first = memo(key, 1);
    expect(memo(key, 1)).toBe(first);
    expect(memo({}, 1)).not.toBe(first);
    expect(memo(key, 2)).not.toBe(first);
    expect(fn).toHaveBeenCalledTimes(3);
  });
});
