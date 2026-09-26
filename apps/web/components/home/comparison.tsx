"use client";

import { useI18n } from "@/lib/i18n/provider";
import { Reveal } from "./reveal";
import { SectionHeading } from "./section-heading";

const TOOLS = ["strokit", "SVGator", "GSAP", "Lottie"] as const;

/** Honest by design: strokit is narrow on purpose (stroke effects for logos and loaders). */
export function Comparison() {
  const { t } = useI18n();
  const copy = t.home.comparison;
  return (
    <section className="border-t">
      <div className="mx-auto flex max-w-6xl flex-col gap-12 px-4 py-24 sm:px-6">
        <SectionHeading index="06" eyebrow={copy.eyebrow} title={copy.title} lead={copy.lead} />
        <Reveal from="left" className="overflow-x-auto border">
          <table className="w-full min-w-[640px] border-collapse text-left text-sm">
            <caption className="sr-only">{copy.caption}</caption>
            <thead>
              <tr className="border-b">
                <th
                  scope="col"
                  className="p-4 font-mono text-muted-foreground text-xs uppercase tracking-widest"
                >
                  {copy.criterion}
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
              {copy.rows.map((row) => (
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
