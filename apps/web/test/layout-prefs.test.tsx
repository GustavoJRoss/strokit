import { act, fireEvent, render, renderHook, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CollapsibleSection } from "@/components/editor/collapsible-section";
import {
  PREFS_PREFIX,
  readPref,
  resetPrefs,
  usePersistentState,
  writePref,
} from "@/lib/use-persistent-state";

beforeEach(() => window.localStorage.clear());
afterEach(() => vi.restoreAllMocks());

describe("usePersistentState", () => {
  it("starts from the default and remembers updates", () => {
    const { result, unmount } = renderHook(() => usePersistentState("x", false));
    expect(result.current[0]).toBe(false);
    act(() => result.current[1](true));
    expect(result.current[0]).toBe(true);
    expect(window.localStorage.getItem(`${PREFS_PREFIX}x`)).toBe("true");
    unmount();
    expect(renderHook(() => usePersistentState("x", false)).result.current[0]).toBe(true);
  });

  it("falls back to the default after resetPrefs, leaving unrelated keys alone", () => {
    window.localStorage.setItem("other", "1");
    const { result } = renderHook(() => usePersistentState("y", "a"));
    act(() => result.current[1]("b"));
    act(() => resetPrefs());
    expect(result.current[0]).toBe("a");
    expect(window.localStorage.getItem(`${PREFS_PREFIX}y`)).toBeNull();
    expect(window.localStorage.getItem("other")).toBe("1");
  });

  it("keeps working when storage is unavailable or holds garbage", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(() => writePref("z", 1)).not.toThrow();
    vi.restoreAllMocks();
    window.localStorage.setItem(`${PREFS_PREFIX}bad`, "{not json");
    expect(readPref("bad", 7)).toBe(7);
  });
});

describe("CollapsibleSection", () => {
  it("shows the summary only while closed and remembers the open state", () => {
    const { unmount } = render(
      <CollapsibleSection id="t" title="Animação" summary="1500 ms">
        <p>campos</p>
      </CollapsibleSection>,
    );
    const trigger = screen.getByRole("button", { name: /Animação/ });
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(trigger).toHaveTextContent("1500 ms");
    expect(screen.queryByText("campos")).toBeNull();

    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(trigger).not.toHaveTextContent("1500 ms");
    expect(screen.getByText("campos")).toBeInTheDocument();
    unmount();

    render(
      <CollapsibleSection id="t" title="Animação" summary="1500 ms">
        <p>campos</p>
      </CollapsibleSection>,
    );
    expect(screen.getByRole("button", { name: /Animação/ })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
  });

  it("can start open and shows an alert even when closed", () => {
    render(
      <CollapsibleSection id="p" title="Preset" defaultOpen alert={<span>aviso</span>}>
        <p>lista</p>
      </CollapsibleSection>,
    );
    expect(screen.getByRole("button", { name: /Preset/ })).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("aviso")).toBeInTheDocument();
  });
});
