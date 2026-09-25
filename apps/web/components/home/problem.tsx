import { Reveal } from "./reveal";
import { SectionHeading } from "./section-heading";

export function Problem() {
  return (
    <section className="mx-auto flex max-w-6xl flex-col gap-12 px-4 py-24 sm:px-6">
      <SectionHeading
        index="01"
        eyebrow="O problema"
        title="Animar uma logo não devia ser tão chato"
        lead="Hoje você escolhe entre duas opções ruins."
      />
      <div className="grid gap-6 md:grid-cols-2">
        <Reveal from="left" className="flex h-full flex-col gap-4 border p-6 sm:p-8">
          <h3 className="font-display text-2xl uppercase">Editores visuais</h3>
          <ul className="flex flex-col gap-2 text-muted-foreground">
            <li>— Feitos para designers, não para quem vive no código.</li>
            <li>— Exportar código limpo costuma ser pago.</li>
            <li>— Muitas vezes adicionam um player JS ao seu bundle.</li>
            <li>— Não conhecem seu tema, dark mode ou componentes.</li>
          </ul>
        </Reveal>
        <Reveal from="right" delay={120} className="flex h-full flex-col gap-4 border p-6 sm:p-8">
          <h3 className="font-display text-2xl uppercase">Código na mão</h3>
          <pre className="overflow-x-auto bg-muted p-4 font-mono text-sm leading-relaxed">
            <code>{`stroke-dasharray: 347.21; /* ??? */
stroke-dashoffset: 347.21;
animation: draw 1.2s /* ok? */;`}</code>
          </pre>
          <p className="text-muted-foreground">
            Controle total, mas acertar comprimentos, atrasos e easing vira tentativa e erro.
          </p>
        </Reveal>
      </div>
      <Reveal from="left">
        <p className="max-w-3xl font-display text-2xl uppercase leading-tight sm:text-3xl">
          O strokit fica no meio: você ajusta vendo o resultado e leva código que qualquer dev
          entende.
        </p>
      </Reveal>
    </section>
  );
}
