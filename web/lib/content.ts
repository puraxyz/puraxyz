import fs from "fs";
import path from "path";
import matter from "gray-matter";

const CONTENT_DIR = path.join(process.cwd(), "content");

export interface ContentMeta {
  title: string;
  order?: number;
  description?: string;
  date?: string;
  [key: string]: unknown;
}

export function getContentSlugs(section: string): string[] {
  const dir = path.join(CONTENT_DIR, section);
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".mdx"))
    .map((f) => f.replace(/\.mdx$/, ""));
}

export function getContentSource(section: string, slug: string) {
  const filePath = path.join(CONTENT_DIR, section, `${slug}.mdx`);
  const raw = fs.readFileSync(filePath, "utf8");
  const { data, content } = matter(raw);
  return { meta: data as ContentMeta, content };
}

export function getAllContent(section: string) {
  return getContentSlugs(section)
    .map((slug) => {
      const { meta } = getContentSource(section, slug);
      return { slug, meta };
    })
    .sort((a, b) => (a.meta.order ?? 99) - (b.meta.order ?? 99));
}
