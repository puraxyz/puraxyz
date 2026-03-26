import { notFound } from "next/navigation";
import { compileMDX } from "next-mdx-remote/rsc";
import type { ComponentPropsWithoutRef } from "react";
import remarkMath from "remark-math";
import remarkGfm from "remark-gfm";
import rehypeKatex from "rehype-katex";
import rehypeSlug from "rehype-slug";
import { getContentSlugs, getContentSource } from "@/lib/content";
import { extractHeadings } from "@/lib/extractHeadings";
import Accent from "../../components/Accent";
import CodeBlock from "../../components/CodeBlock";
import TableOfContents from "../../components/TableOfContents";
import ProductGraph from "../../components/ProductGraph";
import styles from "./page.module.css";

function DocTable(props: ComponentPropsWithoutRef<"table">) {
  return (
    <div className={styles.tableWrap}>
      <table {...props} />
    </div>
  );
}

const mdxComponents = {
  Accent,
  ProductGraph,
  pre: CodeBlock,
  table: DocTable,
};

const katexMacros = {
  "\\R": "\\mathbb{R}",
  "\\N": "\\mathbb{N}",
  "\\E": "\\mathbb{E}",
  "\\Csmooth": "\\bar{C}",
  "\\Craw": "C",
  "\\tasktype": "\\tau",
  "\\bps": "\\mathrm{BPS}",
};

export function generateStaticParams() {
  return getContentSlugs("docs").map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  try {
    const { meta } = getContentSource("docs", slug);
    return { title: meta.title };
  } catch {
    return { title: "Docs" };
  }
}

export default async function DocPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  let source;
  try {
    source = getContentSource("docs", slug);
  } catch {
    notFound();
  }

  const headings = extractHeadings(source.content);

  const { content } = await compileMDX({
    source: source.content,
    options: {
      mdxOptions: {
        remarkPlugins: [remarkMath, remarkGfm],
        rehypePlugins: [[rehypeKatex, { macros: katexMacros }], rehypeSlug],
      },
    },
    components: mdxComponents,
  });

  return (
    <div className={styles.layout}>
      {headings.length > 0 && (
        <aside className={styles.sidebar}>
          <TableOfContents sections={headings} />
        </aside>
      )}
      <div className={styles.article}>
        <h1>{source.meta.title}</h1>
        {content}
      </div>
    </div>
  );
}
