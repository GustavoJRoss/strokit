import { Reveal } from "./reveal";
import { SectionHeading } from "./section-heading";

const TOOLS = ["strokit", "SVGator", "GSAP", "Lottie"] as const;

const ROWS: { label: string; values: [string, string, string, string] }[] = [
  {
    label: "Como você cria",
    values: ["Presets + ajustes", "Editor visual", "Código na mão", "After Effects"],
  },
  {
    label: "O que vai para o projeto",
    values: ["CSS / TSX legível", "SVG exportado", "Seu código + lib", "JSON + player"],
  },
  {
    label: "JS extra no bundle",
    values: ["Nenhum (CSS/React)", "Opcional", "Biblioteca", "Player"],
  },
  { label: "Cores do tema", values: ["var(--sk-stroke)", "Limitado", "Manual", "Difícil"] },
  { label: "Reduced motion", values: ["Automático", "Manual", "Manual", "Manual"] },
  { label: "Animações complexas", values: ["Não é o foco", "Sim", "Sim", "Sim"] },
];

/** Honest by design: strokit is narrow on purpose (stroke effects for logos and loaders). */
export function Comparison() {
  return (
    <section className="border-t">
      <div className="mx-auto flex max-w-6xl flex-col gap-12 px-4 py-24 sm:px-6">
        <SectionHeading
          index="06"
          eyebrow="Comparação honesta"
          title="Faz uma coisa. E faz em código."
          lead="O strokit não substitui ferramentas de motion design. Ele resolve o caso mais comum: dar vida ao traço de uma logo ou loader."
        />
        <Reveal from="left" className="overflow-x-auto border">
          <table className="w-full min-w-[640px] border-collapse text-left text-sm">
            <caption className="sr-only">Comparação entre strokit, SVGator, GSAP e Lottie</caption>
            <thead>
              <tr className="border-b">
                <th
                  scope="col"
                  className="p-4 font-mono text-muted-foreground text-xs uppercase tracking-widest"
                >
                  Critério
                </th>
                {TOOLS.map((tool) => (
                  <th
                    key={tool}
                    scope="col"
                    className={
                      tool === "strokit"
                        ? "bg-foreground p-4 font-display text-background uppercase"
                        : "p-4 font-display uppercase"
                    }
                  >
                    {tool}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ROWS.map((row) => (
                <tr key={row.label} className="border-b last:border-b-0">
                  <th scope="row" className="p-4 font-medium">
                    {row.label}
                  </th>
                  {row.values.map((value, index) => (
                    <td
                      key={TOOLS[index]}
                      className={
                        index === 0
                          ? "bg-foreground/[0.04] p-4 font-medium"
                          : "p-4 text-muted-foreground"
                      }
                    >
                      {value}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </Reveal>
      </div>
    </section>
  );
}
