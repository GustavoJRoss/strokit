/** mulberry32: tiny deterministic PRNG. Same seed, same sequence, in every environment. */
export function createRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
}

/** Deterministic Fisher–Yates permutation of `0..length-1`. */
export function shuffledIndices(length: number, seed: number): number[] {
  const random = createRandom(seed);
  const indices = Array.from({ length }, (_, index) => index);
  for (let i = length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [indices[i], indices[j]] = [indices[j] as number, indices[i] as number];
  }
  return indices;
}
