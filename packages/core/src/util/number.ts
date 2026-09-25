/** Rounds to 4 decimals so generated CSS stays short and deterministic. */
export function round(value: number): number {
  return Math.round(value * 10_000) / 10_000;
}
