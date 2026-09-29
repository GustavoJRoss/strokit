import type { MetadataRoute } from "next";
import { site } from "@/lib/site";

const ROUTES = ["", "/editor", "/exemplos", "/changelog"] as const;

// Required for `output: "export"`: this route has no per-request data, so it can be
// resolved once at build time.
export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return ROUTES.map((path) => ({
    url: `${site.url}${path}`,
    lastModified,
    changeFrequency: "monthly",
    priority: path === "" ? 1 : 0.7,
  }));
}
