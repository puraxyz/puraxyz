import { notFound } from "next/navigation";
import Link from "next/link";
import { compileMDX } from "next-mdx-remote/rsc";
import remarkMath from "remark-math";
import remarkGfm from "remark-gfm";
import rehypeKatex from "rehype-katex";
import rehypeSlug from "rehype-slug";
import { getContentSlugs, getContentSource } from "@/lib/content";
import styles from "./page.module.css";

const katexMacros = {
  "\\R": "\\mathbb{R}",
  "\\N": "\\mathbb{N}",
  "\\E": "\\mathbb{E}",
  "\\Csmooth": "\\bar{C}",
  "\\Craw": "C",
  "\\tasktype": "\\tau",
  "\\bps": "\\mathrm{BPS}",
};

const SECTION_ORDER = [
  "abstract",
  "introduction",
  "background",
  "model",
  "throughput",
  "protocol",
  "security",
  "evaluation",
  "discussion",
  "conclusion",
  "offchain",
  "pricing",
  "verification",
];

export function generateStaticParams() {
  return getContentSlugs("paper").map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  try {
    const { meta } = getContentSource("paper", slug);
    return { title: meta.title };
  } catch {
    return { title: "Paper" };
  }
}

export default async function PaperSection({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  let source;
  try {
    source = getContentSource("paper", slug);
  } catch {
    notFound();
  }

  const { content } = await compileMDX({
    source: source.content,
    options: {
      mdxOptions: {
        remarkPlugins: [remarkMath, remarkGfm],
        rehypePlugins: [[rehypeKatex, { macros: katexMacros }], rehypeSlug],
      },
    },
  });

  const idx = SECTION_ORDER.indexOf(slug);
  const prev = idx > 0 ? SECTION_ORDER[idx - 1] : null;
  const next = idx < SECTION_ORDER.length - 1 ? SECTION_ORDER[idx + 1] : null;

  return (
    <div className={styles.article}>
      <h1>{source.meta.title}</h1>
      {content}
      <nav className={styles.nav}>
        <span>
          {prev && (
            <Link href={`/paper/${prev}`}>&larr; Previous</Link>
          )}
        </span>
        <Link href="/paper">All sections</Link>
        <span>
          {next && (
            <Link href={`/paper/${next}`}>Next &rarr;</Link>
          )}
        </span>
      </nav>
    </div>
  );
}
