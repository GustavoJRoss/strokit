import { type AnimationSpec, animationSpecSchema } from "./schema";

export const CURRENT_SPEC_VERSION = 1;

export class SpecVersionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SpecVersionError";
  }
}

/**
 * Upgrades any older spec shape to the current version. Runs before validation, so old
 * share links and `.strokekit.json` files keep working. v1 is the first version: passthrough.
 */
export function migrate(input: unknown): unknown {
  if (typeof input !== "object" || input === null) {
    throw new SpecVersionError("Spec must be an object");
  }
  const version = (input as { version?: unknown }).version;
  if (version === CURRENT_SPEC_VERSION) return input;
  throw new SpecVersionError(`Unsupported spec version: ${String(version)}`);
}

/** migrate → validate. Throws `SpecVersionError` or `ZodError`. */
export function parseSpec(input: unknown): AnimationSpec {
  return animationSpecSchema.parse(migrate(input));
}
