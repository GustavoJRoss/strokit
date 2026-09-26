import { applyPreset, createEmptySpec } from "@strokit/core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearDraft, DRAFT_KEY, readDraft, writeDraft } from "@/lib/draft";

const shared = () => ({
  svg: '<svg viewBox="0 0 1 1"><path d="M0 0"/></svg>',
  spec: applyPreset(createEmptySpec("x"), ["sk-0"], "draw"),
});

beforeEach(() => window.localStorage.clear());
afterEach(() => vi.restoreAllMocks());

describe("draft", () => {
  it("round-trips through localStorage and validates the spec", () => {
    expect(writeDraft(shared(), 123)).toBe(true);
    expect(JSON.parse(window.localStorage.getItem(DRAFT_KEY) ?? "{}")).toMatchObject({
      version: 1,
      savedAt: 123,
    });
    expect(readDraft()).toEqual(shared());
    clearDraft();
    expect(readDraft()).toBeNull();
  });

  it.each([
    ["missing", null],
    ["not JSON", "{"],
    ["wrong version", '{"version":2,"svg":"<svg/>","spec":{}}'],
    ["empty svg", '{"version":1,"svg":" ","spec":{}}'],
    ["invalid spec", '{"version":1,"svg":"<svg/>","spec":{"version":9}}'],
  ])("returns null for a %s draft", (_label, raw) => {
    if (raw !== null) window.localStorage.setItem(DRAFT_KEY, raw);
    expect(readDraft()).toBeNull();
  });

  it("does not throw when storage is unavailable", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("full", "QuotaExceededError");
    });
    expect(writeDraft(shared())).toBe(false);
    vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(() => clearDraft()).not.toThrow();
  });
});
