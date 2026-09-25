import { VERSION } from "@strokekit/core";

export default function EditorPage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col justify-center gap-4 px-4">
      <h1 className="font-semibold text-2xl">Editor</h1>
      <p className="text-muted-foreground">Em construção. core v{VERSION}</p>
    </main>
  );
}
