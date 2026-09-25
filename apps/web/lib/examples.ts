export type Example = { id: string; name: string; file: string; description: string };

/** Original sample logos (no real brands) in `public/examples/`. */
export const EXAMPLES: Example[] = [
  { id: "orbita", name: "Órbita", file: "orbita.svg", description: "Só traços, várias cores" },
  { id: "pico", name: "Pico", file: "pico.svg", description: "Só preenchimento" },
  { id: "onda", name: "Onda", file: "onda.svg", description: "Cores por classe CSS" },
  {
    id: "assinatura",
    name: "Assinatura",
    file: "assinatura.svg",
    description: "Um traço contínuo",
  },
  { id: "anel", name: "Anel", file: "anel.svg", description: "Formas fechadas, bom para loaders" },
  { id: "selo", name: "Selo", file: "selo.svg", description: "Círculos e polígono" },
];

export async function fetchExample(example: Example): Promise<string> {
  const response = await fetch(`/examples/${example.file}`);
  if (!response.ok) throw new Error(`Não foi possível carregar o exemplo ${example.name}.`);
  return response.text();
}
