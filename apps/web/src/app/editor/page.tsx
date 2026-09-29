import type { Metadata } from "next";
import { EditorLoader } from "@/components/editor/editor-loader";
import { BASE_OPEN_GRAPH, BASE_TWITTER } from "@/lib/seo";

const DESCRIPTION = "Anime sua logo SVG e exporte código pronto: CSS, React ou Motion.";
const TITLE = "Editor · strokit";

export const metadata: Metadata = {
  description: DESCRIPTION,
  alternates: { canonical: "/editor" },
  openGraph: { ...BASE_OPEN_GRAPH, title: TITLE, description: DESCRIPTION, url: "/editor" },
  twitter: { ...BASE_TWITTER, title: TITLE, description: DESCRIPTION },
};

export default function EditorPage() {
  return <EditorLoader />;
}
