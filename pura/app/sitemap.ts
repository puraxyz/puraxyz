import type { MetadataRoute } from "next";
import { readdirSync } from "fs";
import { join } from "path";

const BASE = "https://pura.xyz";

function slugsFrom(dir: string): string[] {
  try {
    return readdirSync(join(process.cwd(), "content", dir))
      .filter((f) => f.endsWith(".mdx"))
      .map((f) => f.replace(/\.mdx$/, ""));
  } catch {
    return [];
  }
}

export default function sitemap(): MetadataRoute.Sitemap {
  const staticPages = [
    "",
    "/gateway",
    "/explainer",
    "/about",
    "/pricing",
    "/blog",
    "/docs",
    "/paper",
    "/deploy",
    "/monitor",
    "/simulate",
    "/status",
  ];

  const blogSlugs = slugsFrom("blog");
  const docsSlugs = slugsFrom("docs");

  const entries: MetadataRoute.Sitemap = staticPages.map((path) => ({
    url: `${BASE}${path}`,
    lastModified: new Date(),
  }));

  for (const slug of blogSlugs) {
    entries.push({ url: `${BASE}/blog/${slug}`, lastModified: new Date() });
  }
  for (const slug of docsSlugs) {
    entries.push({ url: `${BASE}/docs/${slug}`, lastModified: new Date() });
  }

  return entries;
}
