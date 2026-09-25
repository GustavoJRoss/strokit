import type { Metadata } from "next";
import { EditorLoader } from "@/components/editor/editor-loader";

export const metadata: Metadata = {
  title: "Editor · strokekit",
};

export default function EditorPage() {
  return <EditorLoader />;
}
