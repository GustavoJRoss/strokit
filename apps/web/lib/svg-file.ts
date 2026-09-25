import { MAX_SVG_BYTES } from "@strokekit/core";

export class FileReadError extends Error {}

/** Reads a user file as SVG markup, rejecting obvious mismatches before parsing. */
export async function readSvgFile(file: File): Promise<string> {
  const looksLikeSvg = file.type === "image/svg+xml" || file.name.toLowerCase().endsWith(".svg");
  if (!looksLikeSvg) throw new FileReadError("Escolha um arquivo .svg.");
  if (file.size > MAX_SVG_BYTES) throw new FileReadError("O SVG passa do limite de 500 KB.");
  return file.text();
}

export function baseName(fileName: string): string {
  return fileName.replace(/\.svg$/i, "") || "logo";
}

export function downloadText(content: string, fileName: string, type: string): void {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}
