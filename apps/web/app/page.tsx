import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col justify-center gap-6 px-4">
      <h1 className="font-semibold text-4xl tracking-tight">strokit</h1>
      <p className="text-lg text-muted-foreground">
        Arraste sua logo SVG, escolha um preset e exporte código pronto: CSS puro, componente React
        ou Motion.
      </p>
      <Link className="underline underline-offset-4" href="/editor">
        Abrir o editor
      </Link>
    </main>
  );
}
