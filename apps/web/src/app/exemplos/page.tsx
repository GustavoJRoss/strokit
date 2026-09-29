import type { Metadata } from "next";
import { BASE_OPEN_GRAPH, BASE_TWITTER } from "@/lib/seo";
import { ExamplesView } from "./examples-view";

const DESCRIPTION = "Componentes React e Motion gerados pelo strokit, rodando neste site.";
const TITLE = "Componentes exportados · strokit";

export const metadata: Metadata = {
  description: DESCRIPTION,
  alternates: { canonical: "/exemplos" },
  openGraph: { ...BASE_OPEN_GRAPH, title: TITLE, description: DESCRIPTION, url: "/exemplos" },
  twitter: { ...BASE_TWITTER, title: TITLE, description: DESCRIPTION },
};

export default function ExamplesPage() {
  return <ExamplesView />;
}
