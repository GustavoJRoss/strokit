import { site } from "./site";

/**
 * Next.js does NOT deep-merge `openGraph`/`twitter` between a page's metadata and the layout's —
 * a page-level object fully replaces the parent's. So every page that sets its own `openGraph`
 * or `twitter` must spread these back in, or it silently loses the image and card type.
 */
export const OG_IMAGE = { url: "/og-image.png", width: 1200, height: 630, alt: site.name };

export const BASE_OPEN_GRAPH: {
  type: "website";
  siteName: string;
  locale: string;
  images: (typeof OG_IMAGE)[];
} = {
  type: "website",
  siteName: site.name,
  locale: "pt_BR",
  images: [OG_IMAGE],
};

export const BASE_TWITTER: { card: "summary_large_image"; images: string[] } = {
  card: "summary_large_image",
  images: [OG_IMAGE.url],
};
