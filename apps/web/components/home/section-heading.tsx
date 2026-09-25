import { Reveal } from "./reveal";

type SectionHeadingProps = {
  index: string;
  eyebrow: string;
  title: string;
  lead?: string;
  from?: "left" | "right";
};

export function SectionHeading({
  index,
  eyebrow,
  title,
  lead,
  from = "left",
}: SectionHeadingProps) {
  return (
    <Reveal from={from} className="flex max-w-3xl flex-col gap-4">
      <p className="font-mono text-muted-foreground text-xs uppercase tracking-[0.2em]">
        {index} — {eyebrow}
      </p>
      <h2 className="text-balance font-display text-[clamp(2rem,8vw,3.75rem)] uppercase leading-[0.92]">
        {title}
      </h2>
      {lead ? <p className="max-w-2xl text-lg text-muted-foreground">{lead}</p> : null}
    </Reveal>
  );
}
