import type { Metadata } from "next";
import { CodeSection } from "@/components/home/code-section";
import { Comparison } from "@/components/home/comparison";
import { GallerySection } from "@/components/home/gallery";
import { Hero } from "@/components/home/hero";
import { HowItWorks } from "@/components/home/how-it-works";
import { OpenSource } from "@/components/home/open-source";
import { PlaygroundSection } from "@/components/home/playground-section";
import { Problem } from "@/components/home/problem";
import { SiteFooter } from "@/components/home/site-footer";
import { SiteHeader } from "@/components/home/site-header";
import { Support } from "@/components/home/support";
import { DocumentTitle } from "@/lib/i18n/provider";
import { BASE_OPEN_GRAPH, BASE_TWITTER } from "@/lib/seo";

const DESCRIPTION =
  "Ferramenta code-first para animar logos e loaders em SVG. Exporte CSS puro, componente React tipado ou Motion, sem runtime e respeitando prefers-reduced-motion.";
const TITLE = "strokit — anime sua logo SVG e exporte código";

export const metadata: Metadata = {
  description: DESCRIPTION,
  alternates: { canonical: "/" },
  openGraph: { ...BASE_OPEN_GRAPH, title: TITLE, description: DESCRIPTION, url: "/" },
  twitter: { ...BASE_TWITTER, title: TITLE, description: DESCRIPTION },
};

export default function Home() {
  return (
    <div id="topo" className="flex min-h-dvh flex-col">
      <DocumentTitle page="home" />
      <SiteHeader />
      <main className="flex-1 overflow-x-clip">
        <Hero />
        <div className="border-t">
          <Problem />
        </div>
        <HowItWorks />
        <PlaygroundSection />
        <GallerySection />
        <CodeSection />
        <Comparison />
        <OpenSource />
        <Support />
      </main>
      <SiteFooter />
    </div>
  );
}
