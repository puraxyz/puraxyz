import Link from "next/link";
import { getAllContent } from "@/lib/content";
import styles from "./page.module.css";

export const metadata = { title: "Docs" };

export default function DocsIndex() {
  const docs = getAllContent("docs");

  return (
    <div className={styles.page}>
      <h1>Implementation</h1>
      <p className={styles.subtitle}>
        Contracts, SDK, and simulation source code
      </p>

      <div className={styles.grid}>
        {docs.map((doc) => (
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
    </div>
  );
}
