import { site } from "./site";

const DESCRIPTION =
  "Ferramenta code-first para animar logos e loaders em SVG. Exporte CSS puro, componente React tipado ou Motion, sem runtime e respeitando prefers-reduced-motion.";

/** JSON-LD rendered once in the root layout; fully static, resolved at build time. */
export const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      name: site.name,
      url: site.url,
      description: DESCRIPTION,
      inLanguage: "pt-BR",
    },
    {
      "@type": "SoftwareApplication",
      name: site.name,
      url: site.url,
      description: DESCRIPTION,
      applicationCategory: "DeveloperApplication",
      operatingSystem: "Web",
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      license: site.repo.licenseUrl,
      author: { "@type": "Person", name: site.author },
    },
  ],
} as const;
