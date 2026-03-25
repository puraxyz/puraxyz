import Link from "next/link";
import { getAllContent } from "@/lib/content";
import styles from "./page.module.css";

export const metadata = { title: "Docs" };

const CATEGORIES: { id: string; label: string; slugs: string[] }[] = [
  {
    id: "getting-started",
    label: "Getting started",
    slugs: [
      "getting-started",
      "getting-started-gateway",
      "getting-started-platform",
      "getting-started-openclaw",
      "getting-started-defi",
      "getting-started-lightning",
      "getting-started-relay",
    ],
  },
  {
    id: "architecture",
    label: "Architecture",
    slugs: [
      "products",
      "four-planes",
      "five-objects",
      "contracts",
      "gateway",
      "economy-factory",
    ],
  },
  {
    id: "reference",
    label: "Reference",
    slugs: [
      "sdk",
      "simulation",
      "hosted",
      "router",
      "shadow-mode",
      "nip-xx",
    ],
  },
];

export default function DocsIndex() {
  const docs = getAllContent("docs");
  const docMap = new Map(docs.map((d) => [d.slug, d]));

  // Collect any docs not listed in categories
  const categorized = new Set(CATEGORIES.flatMap((c) => c.slugs));
  const uncategorized = docs.filter((d) => !categorized.has(d.slug));

  return (
    <div className={styles.page}>
      <h1>Documentation</h1>
      <p className={styles.subtitle}>
        Guides, architecture, and API reference
      </p>

      <nav className={styles.tocNav}>
        {CATEGORIES.map((cat) => (
          <a key={cat.id} href={`#${cat.id}`} className={styles.tocLink}>
            {cat.label}
          </a>
        ))}
        {uncategorized.length > 0 && (
          <a href="#other" className={styles.tocLink}>Other</a>
        )}
      </nav>

      {CATEGORIES.map((cat) => {
        const catDocs = cat.slugs
          .map((s) => docMap.get(s))
          .filter(Boolean);
        if (catDocs.length === 0) return null;
        return (
          <section key={cat.id} id={cat.id} className={styles.category}>
            <h2 className={styles.catHeading}>{cat.label}</h2>
            <div className={styles.grid}>
              {catDocs.map((doc) => (
                <Link
                  key={doc!.slug}
                  href={`/docs/${doc!.slug}`}
                  className={styles.card}
                >
                  <div className={styles.cardTitle}>{doc!.meta.title}</div>
                  {doc!.meta.description && (
                    <div className={styles.cardDesc}>{doc!.meta.description}</div>
                  )}
                </Link>
              ))}
            </div>
          </section>
        );
      })}

      {uncategorized.length > 0 && (
        <section id="other" className={styles.category}>
          <h2 className={styles.catHeading}>Other</h2>
          <div className={styles.grid}>
            {uncategorized.map((doc) => (
              <Link
                key={doc.slug}
                href={`/docs/${doc.slug}`}
                className={styles.card}
              >
                <div className={styles.cardTitle}>{doc.meta.title}</div>
                {doc.meta.description && (
                  <div className={styles.cardDesc}>{doc.meta.description}</div>
                )}
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
