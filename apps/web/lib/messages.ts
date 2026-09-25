import { type ImportWarning, ShareError, SvgImportError } from "@strokit/core";
import { FileReadError } from "./svg-file";

export function importErrorMessage(error: unknown): string {
  if (
    error instanceof SvgImportError ||
    error instanceof FileReadError ||
    error instanceof ShareError
  ) {
    return error.message;
  }
  if (error instanceof Error && error.message) return error.message;
  return "Não foi possível importar o SVG.";
}

export function importWarningMessage(warning: ImportWarning): string {
  switch (warning.code) {
    case "removed-element":
      return `Elemento <${warning.element}> removido por segurança ou por não ser suportado.`;
    case "unsupported-css-selector":
      return `Seletor CSS não suportado ignorado: ${warning.selector}`;
    case "missing-viewbox":
      return "O SVG não tinha viewBox; usamos o tamanho do arquivo.";
  }
}
