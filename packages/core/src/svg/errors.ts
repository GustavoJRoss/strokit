export type SvgImportErrorCode =
  | "empty"
  | "too-large"
  | "doctype"
  | "invalid-xml"
  | "not-svg"
  | "no-drawables";

export class SvgImportError extends Error {
  readonly code: SvgImportErrorCode;

  constructor(code: SvgImportErrorCode, message: string) {
    super(message);
    this.name = "SvgImportError";
    this.code = code;
  }
}

export type ImportWarning =
  | { code: "removed-element"; element: string }
  | { code: "unsupported-css-selector"; selector: string }
  | { code: "missing-viewbox" };
