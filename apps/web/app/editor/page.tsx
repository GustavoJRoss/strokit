import { presets } from "@strokekit/core";

export default function EditorPage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col justify-center gap-4 px-4">
      <h1 className="font-semibold text-2xl">Editor</h1>
      <p className="text-muted-foreground">
        Em construção. Presets disponíveis:{" "}
        {Object.values(presets)
          .map((preset) => preset.label)
          .join(", ")}
        .
      </p>
    </main>
  );
}
