import { type ImportWarning, ShareError, SvgImportError } from "@strokit/core";
import type { Dictionary } from "./i18n/dictionaries/pt";
import { FileReadError } from "./svg-file";

/** Errors are translated by code; the core's Portuguese message is only a fallback. */
export function importErrorMessage(error: unknown, t: Dictionary): string {
  const messages = t.importing;
  if (error instanceof SvgImportError) return messages.svgErrors[error.code] ?? error.message;
  if (error instanceof ShareError) return messages.shareErrors[error.code] ?? error.message;
  if (error instanceof FileReadError) return messages.fileErrors[error.code] ?? error.message;
  return messages.generic;
}

export function importWarningMessage(warning: ImportWarning, t: Dictionary): string {
  const messages = t.importing.warnings;
  switch (warning.code) {
    case "removed-element":
      return messages.removedElement(warning.element);
    case "unsupported-css-selector":
      return messages.unsupportedSelector(warning.selector);
    case "missing-viewbox":
      return messages.missingViewBox;
  }
}
