import type { Metadata } from "next";
import "./globals.css";
import { Archivo, Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { cn } from "@/lib/utils";

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-mono" });
// Variable width axis: headlines use the expanded, heavy cut.
const archivo = Archivo({ subsets: ["latin"], axes: ["wdth"], variable: "--font-display" });

export const metadata: Metadata = {
  title: "strokit",
  description: "Anime sua logo SVG e exporte código pronto: CSS, React ou Motion.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-BR"
      className={cn("font-sans", geist.variable, geistMono.variable, archivo.variable)}
      suppressHydrationWarning
    >
      <head>
        {/* Marks JS as available before the first paint: reveal animations only hide content then. */}
        <script
          // biome-ignore lint/security/noDangerouslySetInnerHtml: static, first-party one-liner
          dangerouslySetInnerHTML={{ __html: "document.documentElement.classList.add('js')" }}
        />
      </head>
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
