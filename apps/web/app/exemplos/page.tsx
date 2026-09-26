import type { Metadata } from "next";
import { ExamplesView } from "./examples-view";

export const metadata: Metadata = {
  description: "Componentes React e Motion gerados pelo strokit, rodando neste site.",
};

export default function ExamplesPage() {
  return <ExamplesView />;
}
