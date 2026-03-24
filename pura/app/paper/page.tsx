import Link from "next/link";
import { getAllContent } from "@/lib/content";
import styles from "./page.module.css";

export const metadata = { title: "Paper" };

const MAIN_SECTIONS = [
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
];

const SUBSECTIONS = ["offchain", "pricing", "verification", "thermodynamic"];

export default function PaperIndex() {
  const all = getAllContent("paper");
  const main = MAIN_SECTIONS.map((slug) =>
    all.find((s) => s.slug === slug)
  ).filter(Boolean);
  const sub = SUBSECTIONS.map((slug) =>
    all.find((s) => s.slug === slug)
  ).filter(Boolean);

  return (
    <div className={styles.page}>
      <h1>Paper: Backpressure Economics</h1>
      <p className={styles.subtitle}>
        Capacity-constrained monetary flow control for agent economies
      </p>
      <p className={styles.pdfLink}>
        <a
          href="https://github.com/puraxyz/puraxyz/blob/main/docs/paper/main.pdf"
          target="_blank"
          rel="noopener noreferrer"
        >
          Download full paper (PDF)
        </a>
      </p>

      <ol className={styles.sectionList}>
        {main.map((s, i) => (
          <li key={s!.slug} className={styles.sectionItem}>
            <Link href={`/paper/${s!.slug}`} className={styles.sectionLink}>
              <span className={styles.sectionNumber}>{i}</span>
              <span className={styles.sectionTitle}>{s!.meta.title}</span>
              {s!.meta.description && (
                <span className={styles.sectionDesc}>
                  {s!.meta.description}
                </span>
              )}
            </Link>
          </li>
        ))}
      </ol>

      <div className={styles.subsections}>
        <h2>Extended sections</h2>
        <ul className={styles.sectionList}>
          {sub.map((s) => (
            <li key={s!.slug} className={styles.sectionItem}>
              <Link href={`/paper/${s!.slug}`} className={styles.sectionLink}>
                <span className={styles.sectionNumber}>&mdash;</span>
                <span className={styles.sectionTitle}>{s!.meta.title}</span>
                {s!.meta.description && (
                  <span className={styles.sectionDesc}>
                    {s!.meta.description}
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      </div>

      <div className={styles.citation}>
        <strong>Citation:</strong> If you use this work, please cite:{" "}
        <em>
          Backpressure Economics: Capacity-Constrained Monetary Flow Control for
          Agent Economies
        </em>
        , 2025.
      </div>

      <p className={styles.note}>
        The full LaTeX source is available at{" "}
        <a
          href="https://github.com/puraxyz/puraxyz/tree/main/docs/paper"
          target="_blank"
          rel="noopener noreferrer"
        >
          github.com/puraxyz/puraxyz
        </a>
        .
      </p>
    </div>
  );
}
