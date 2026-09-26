"use client";

import dynamic from "next/dynamic";
import { useI18n } from "@/lib/i18n/provider";
import { LazyMount } from "./lazy-mount";
import { SectionHeading } from "./section-heading";

const Playground = dynamic(() => import("./playground").then((module) => module.Playground), {
  ssr: false,
  loading: () => <PlaygroundFallback />,
});

function PlaygroundFallback() {
  const { t } = useI18n();
  return (
    <div className="flex h-96 items-center justify-center border text-muted-foreground text-sm">
      {t.home.playground.loading}
    </div>
  );
}

/** The core + Shiki load only when the playground gets close to the viewport. */
export function PlaygroundSection() {
  const { t } = useI18n();
  const copy = t.home.playground;
  return (
    <section id="playground" className="scroll-mt-20 border-t">
      <div className="mx-auto flex max-w-6xl flex-col gap-12 px-4 py-24 sm:px-6">
        <SectionHeading
          index="03"
          eyebrow={copy.eyebrow}
          title={copy.title}
          lead={copy.lead}
          from="right"
        />
        <LazyMount fallback={<PlaygroundFallback />}>
          <Playground />
        </LazyMount>
      </div>
    </section>
  );
}
