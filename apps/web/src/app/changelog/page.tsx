import type { Metadata } from "next";
import { BASE_OPEN_GRAPH, BASE_TWITTER } from "@/lib/seo";
import { ChangelogView } from "./changelog-view";

const DESCRIPTION = "O que já foi implementado no strokit, em ordem cronológica.";
const TITLE = "Changelog · strokit";

export const metadata: Metadata = {
  description: DESCRIPTION,
  alternates: { canonical: "/changelog" },
  openGraph: { ...BASE_OPEN_GRAPH, title: TITLE, description: DESCRIPTION, url: "/changelog" },
  twitter: { ...BASE_TWITTER, title: TITLE, description: DESCRIPTION },
};

export default function ChangelogPage() {
  return <ChangelogView />;
}
