// lz-string is CommonJS: the default import is the one form Node ESM and bundlers agree on.
import LZString from "lz-string";
import { parseSpec } from "../spec/migrate";
import type { AnimationSpec } from "../spec/schema";

/** Practical limit for the `#s=` hash (ARCHITECTURE §9). Above it, offer `.strokit.json`. */
export const SHARE_URL_LIMIT = 8000;

export const SHARE_HASH_PREFIX = "#s=";

export const PROJECT_FORMAT = "strokit";
export const PROJECT_EXTENSION = ".strokit.json";

/** What a link or project file carries: the sanitized SVG and the spec. */
export type SharedAnimation = { svg: string; spec: AnimationSpec };

export type ProjectFile = {
  format: typeof PROJECT_FORMAT;
  version: 1;
  svg: string;
  spec: AnimationSpec;
};

export type ShareErrorCode =
  | "invalid-content"
  | "missing-svg"
  | "invalid-spec"
  | "corrupt-link"
  | "invalid-json"
  | "not-project";

/** `code` is what UIs translate; `message` is a Portuguese fallback. */
export class ShareError extends Error {
  readonly code: ShareErrorCode;

  constructor(code: ShareErrorCode, message: string) {
    super(message);
    this.name = "ShareError";
    this.code = code;
  }
}

function fromPayload(payload: unknown): SharedAnimation {
  if (typeof payload !== "object" || payload === null)
    throw new ShareError("invalid-content", "Conteúdo inválido.");
  const { svg, spec } = payload as { svg?: unknown; spec?: unknown };
  if (typeof svg !== "string" || svg.trim() === "")
    throw new ShareError("missing-svg", "O SVG está faltando.");
  try {
    return { svg, spec: parseSpec(spec) };
  } catch {
    throw new ShareError(
      "invalid-spec",
      "A animação salva é inválida ou de uma versão não suportada.",
    );
  }
}

/** SVG + spec → value for the URL hash (without the `#s=` prefix). Never sent to a server. */
export function encodeShare(shared: SharedAnimation): string {
  return LZString.compressToEncodedURIComponent(
    JSON.stringify({ svg: shared.svg, spec: shared.spec }),
  );
}

/** Accepts the value with or without `#s=`. Runs `migrate()` + validation on the spec. */
export function decodeShare(value: string): SharedAnimation {
  const encoded = value.startsWith(SHARE_HASH_PREFIX)
    ? value.slice(SHARE_HASH_PREFIX.length)
    : value;
  const json = LZString.decompressFromEncodedURIComponent(encoded);
  if (!json) throw new ShareError("corrupt-link", "O link está incompleto ou corrompido.");
  try {
    return fromPayload(JSON.parse(json));
  } catch (error) {
    if (error instanceof ShareError) throw error;
    throw new ShareError("corrupt-link", "O link está incompleto ou corrompido.");
  }
}

export function serializeProject(shared: SharedAnimation): string {
  const project: ProjectFile = {
    format: PROJECT_FORMAT,
    version: 1,
    svg: shared.svg,
    spec: shared.spec,
  };
  return `${JSON.stringify(project, null, 2)}\n`;
}

export function parseProject(text: string): SharedAnimation {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new ShareError("invalid-json", "O arquivo não é um JSON válido.");
  }
  if ((data as { format?: unknown } | null)?.format !== PROJECT_FORMAT) {
    throw new ShareError("not-project", "O arquivo não é um projeto do strokit.");
  }
  return fromPayload(data);
}
