import { notFound } from "next/navigation";
import { compileMDX } from "next-mdx-remote/rsc";
import remarkGfm from "remark-gfm";
import rehypeSlug from "rehype-slug";
import { getContentSlugs, getContentSource } from "@/lib/content";
import styles from "./page.module.css";

export function generateStaticParams() {
  return getContentSlugs("blog").map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  try {
    const { meta } = getContentSource("blog", slug);
    return { title: meta.title };
  } catch {
    return { title: "Blog" };
  }
}

export default async function BlogPost({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  let source;
  try {
    source = getContentSource("blog", slug);
  } catch {
    notFound();
  }

  const { content } = await compileMDX({
    source: source.content,
    options: {
      mdxOptions: {
        remarkPlugins: [remarkGfm],
        rehypePlugins: [rehypeSlug],
      },
    },
  });

  return (
    <div className={styles.article}>
      <h1>{source.meta.title}</h1>
      {source.meta.date && <p className={styles.meta}>{source.meta.date}</p>}
      {content}
    </div>
  );
}
