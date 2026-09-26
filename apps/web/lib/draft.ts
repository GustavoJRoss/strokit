import { parseSpec, type SharedAnimation } from "@strokit/core";

/** Work in progress, kept per viewer. Outside the `strokit:ui:` prefix: "Restaurar layout" keeps it. */
export const DRAFT_KEY = "strokit:draft";

type StoredDraft = { version: 1; svg: string; spec: unknown; savedAt: number };

export function writeDraft(shared: SharedAnimation, now = Date.now()): boolean {
  try {
    const draft: StoredDraft = { version: 1, svg: shared.svg, spec: shared.spec, savedAt: now };
    window.localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    return true;
  } catch {
    // Storage unavailable or full: the editor keeps working, it just can't restore later.
    return false;
  }
}

/** The saved draft, validated (migrate + schema) like links and project files; null when absent or invalid. */
export function readDraft(): SharedAnimation | null {
  try {
    const raw = window.localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as Partial<StoredDraft> | null;
    if (data?.version !== 1 || typeof data.svg !== "string" || data.svg.trim() === "") {
      return null;
    }
    return { svg: data.svg, spec: parseSpec(data.spec) };
  } catch {
    return null;
  }
}

export function clearDraft(): void {
  try {
    window.localStorage.removeItem(DRAFT_KEY);
  } catch {
    // Nothing to clear.
  }
}
