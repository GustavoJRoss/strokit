import type { Metadata } from "next";
import { EditorLoader } from "@/components/editor/editor-loader";

export const metadata: Metadata = {
  description: "Anime sua logo SVG e exporte código pronto: CSS, React ou Motion.",
};

export default function EditorPage() {
  return <EditorLoader />;
}
