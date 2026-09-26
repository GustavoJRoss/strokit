import { highlight } from "@/lib/highlight";
import { CodeSectionView } from "./code-section-view";
import { codeSamples } from "./generated/code-samples";

/** Highlighting runs at build time (server); the view is translated on the client. */
export async function CodeSection() {
  const html = {
    css: await highlight(codeSamples.css, "html"),
    react: await highlight(codeSamples.react, "tsx"),
    motion: await highlight(codeSamples.motion, "tsx"),
  };
  return <CodeSectionView html={html} raw={codeSamples} />;
}
