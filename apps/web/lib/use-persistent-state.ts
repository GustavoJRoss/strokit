"use client";

import { useCallback, useEffect, useState } from "react";

/** Prefix of every UI preference strokit keeps in localStorage. */
export const PREFS_PREFIX = "strokit:ui:";
const RESET_EVENT = "strokit:ui-reset";

export function readPref<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(PREFS_PREFIX + key);
    return raw === null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
}

export function writePref(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(PREFS_PREFIX + key, JSON.stringify(value));
  } catch {
    // Storage can be unavailable (private mode, blocked site data): keep working in memory.
  }
}

/** Removes every strokit UI preference and tells mounted hooks to fall back to their defaults. */
export function resetPrefs(): void {
  try {
    for (const key of Object.keys(window.localStorage)) {
      if (key.startsWith(PREFS_PREFIX)) window.localStorage.removeItem(key);
    }
  } catch {
    // Nothing stored, nothing to clear.
  }
  window.dispatchEvent(new Event(RESET_EVENT));
}

/**
 * `useState` remembered per viewer. UI preferences only (open sections, layout) —
 * never animation state, which lives in the AnimationSpec.
 */
export function usePersistentState<T>(key: string, fallback: T): [T, (value: T) => void] {
  const [value, setValue] = useState<T>(() => readPref(key, fallback));

  useEffect(() => {
    const onReset = () => setValue(fallback);
    window.addEventListener(RESET_EVENT, onReset);
    return () => window.removeEventListener(RESET_EVENT, onReset);
  }, [fallback]);

  const update = useCallback(
    (next: T) => {
      setValue(next);
      writePref(key, next);
    },
    [key],
  );

  return [value, update];
}
