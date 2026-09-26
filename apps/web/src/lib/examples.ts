import type { Dictionary } from "./i18n/dictionaries/pt";

export type ExampleId = keyof Dictionary["examples"];
export type Example = { id: ExampleId; file: string };

/** Original sample logos (no real brands) in `public/examples/`. Names live in the dictionaries. */
export const EXAMPLES: Example[] = [
  { id: "orbita", file: "orbita.svg" },
  { id: "pico", file: "pico.svg" },
  { id: "onda", file: "onda.svg" },
  { id: "assinatura", file: "assinatura.svg" },
  { id: "anel", file: "anel.svg" },
  { id: "selo", file: "selo.svg" },
];

export class ExampleLoadError extends Error {}

export async function fetchExample(example: Example): Promise<string> {
  const response = await fetch(`/examples/${example.file}`);
  if (!response.ok) throw new ExampleLoadError(example.id);
  return response.text();
}
