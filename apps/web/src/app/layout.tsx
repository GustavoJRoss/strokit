import type { Metadata } from "next";
import "./globals.css";
import { Archivo, Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { LOCALE_BOOT_SCRIPT } from "@/lib/i18n/locales";
import { I18nProvider } from "@/lib/i18n/provider";
import { cn } from "@/lib/utils";

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-mono" });
// Variable width axis: headlines use the expanded, heavy cut.
const archivo = Archivo({ subsets: ["latin"], axes: ["wdth"], variable: "--font-display" });

export const metadata: Metadata = {
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
        {/* Before the first paint: marks JS as available (reveal animations) and, when the visitor's
            language isn't Portuguese, hides the page until React swaps the texts. */}
        <script
          // biome-ignore lint/security/noDangerouslySetInnerHtml: static, first-party boot script
          dangerouslySetInnerHTML={{ __html: LOCALE_BOOT_SCRIPT }}
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
