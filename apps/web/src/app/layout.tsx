import type { Metadata } from "next";
import "./globals.css";
import { Archivo, Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { LOCALE_BOOT_SCRIPT } from "@/lib/i18n/locales";
import { I18nProvider } from "@/lib/i18n/provider";
import { BASE_OPEN_GRAPH, BASE_TWITTER } from "@/lib/seo";
import { site } from "@/lib/site";
import { structuredData } from "@/lib/structured-data";
import { cn } from "@/lib/utils";

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-mono" });
// Variable width axis: headlines use the expanded, heavy cut.
const archivo = Archivo({ subsets: ["latin"], axes: ["wdth"], variable: "--font-display" });

const DESCRIPTION = "Anime sua logo SVG e exporte código pronto: CSS, React ou Motion.";

// The visible <title> is rendered by DocumentTitle (React 19 head hoisting), not by `title`
// here — see docs/ARCHITECTURE.md's decision log. `openGraph.title`/`twitter.title` are
// different tags (og:title / twitter:title) and don't touch the <title> element.
export const metadata: Metadata = {
  description: DESCRIPTION,
  metadataBase: new URL(site.url),
  alternates: { canonical: "/" },
  robots: { index: true, follow: true },
  openGraph: {
    ...BASE_OPEN_GRAPH,
    url: site.url,
    title: "strokit — anime sua logo SVG e exporte código",
    description: DESCRIPTION,
  },
  twitter: {
    ...BASE_TWITTER,
    title: "strokit — anime sua logo SVG e exporte código",
    description: DESCRIPTION,
  },
  verification: { google: process.env.NEXT_PUBLIC_GSC_VERIFICATION },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-BR"
      className={cn("font-sans", geist.variable, geistMono.variable, archivo.variable)}
      suppressHydrationWarning
    >
      <head>
        {/* Before the first paint: marks JS as available (reveal animations) and, when the visitor's
            language isn't Portuguese, hides the page until React swaps the texts. */}
        <script
          // biome-ignore lint/security/noDangerouslySetInnerHtml: static, first-party boot script
          dangerouslySetInnerHTML={{ __html: LOCALE_BOOT_SCRIPT }}
        />
        <script
          type="application/ld+json"
          // biome-ignore lint/security/noDangerouslySetInnerHtml: static, first-party structured data
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      </head>
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <I18nProvider>{children}</I18nProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
