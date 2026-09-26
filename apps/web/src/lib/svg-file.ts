import { MAX_SVG_BYTES } from "@strokit/core";

export type FileReadErrorCode = "not-svg-file" | "too-large";

export class FileReadError extends Error {
  readonly code: FileReadErrorCode;

  constructor(code: FileReadErrorCode, message: string) {
    super(message);
    this.name = "FileReadError";
    this.code = code;
  }
}

/** Reads a user file as SVG markup, rejecting obvious mismatches before parsing. */
export async function readSvgFile(file: File): Promise<string> {
  const looksLikeSvg = file.type === "image/svg+xml" || file.name.toLowerCase().endsWith(".svg");
  if (!looksLikeSvg) throw new FileReadError("not-svg-file", "Escolha um arquivo .svg.");
  if (file.size > MAX_SVG_BYTES)
    throw new FileReadError("too-large", "O SVG passa do limite de 500 KB.");
  return file.text();
}

export function baseName(fileName: string): string {
  return fileName.replace(/\.svg$/i, "") || "logo";
}

export function downloadText(content: string, fileName: string, type: string): void {
  downloadBlob(new Blob([content], { type }), fileName);
}

export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  // Revoking right away can cut large downloads short in some browsers.
  window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
}
