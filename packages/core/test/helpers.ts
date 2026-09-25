import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { DOMParser } from "linkedom";
import type { DomParserLike } from "../src/svg/parse";

const fixturesDir = join(dirname(fileURLToPath(import.meta.url)), "fixtures");

export const parser = new DOMParser() as unknown as DomParserLike;

export function fixture(name: string): string {
  return readFileSync(join(fixturesDir, name), "utf8");
}
