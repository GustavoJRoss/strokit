import { type AnimationSpec, animationSpecSchema } from "./schema";

export const CURRENT_SPEC_VERSION = 2;

export class SpecVersionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SpecVersionError";
  }
}

/**
 * Upgrades any older spec shape to the current version. Runs before validation, so old
 * share links and `.strokit.json` files keep working.
 *
 * v1 → v2: stroke widths became relative to the SVG (visual units). A v1 spec keeps measuring
 * them in the element's own units (`strokeUnit: "user"`), so it renders exactly as before.
 */
export function migrate(input: unknown): unknown {
  if (typeof input !== "object" || input === null) {
    throw new SpecVersionError("Spec must be an object");
  }
  const version = (input as { version?: unknown }).version;
  if (version === CURRENT_SPEC_VERSION) return input;
  if (version === 1) {
    const spec = input as { global?: unknown };
    const global = typeof spec.global === "object" && spec.global !== null ? spec.global : {};
    return { ...spec, version: 2, global: { ...global, strokeUnit: "user" } };
  }
  throw new SpecVersionError(`Unsupported spec version: ${String(version)}`);
}

/** migrate → validate. Throws `SpecVersionError` or `ZodError`. */
export function parseSpec(input: unknown): AnimationSpec {
  return animationSpecSchema.parse(migrate(input));
}
