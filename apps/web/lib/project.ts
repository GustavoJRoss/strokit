import {
  encodeShare,
  PROJECT_EXTENSION,
  SHARE_HASH_PREFIX,
  SHARE_URL_LIMIT,
  type SharedAnimation,
  serializeProject,
} from "@strokekit/core";
import { downloadText } from "./svg-file";

export function isProjectFile(file: File): boolean {
  return file.name.toLowerCase().endsWith(".json") || file.type === "application/json";
}

export function slug(value: string): string {
  return (
    value
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "logo"
  );
}

/** Hash for the current animation, or null when it would not fit in a URL. */
export function shareHash(shared: SharedAnimation): string | null {
  const hash = `${SHARE_HASH_PREFIX}${encodeShare(shared)}`;
  return hash.length > SHARE_URL_LIMIT ? null : hash;
}

export function downloadProject(shared: SharedAnimation): void {
  downloadText(
    serializeProject(shared),
    `${slug(shared.spec.name)}${PROJECT_EXTENSION}`,
    "application/json",
  );
}
