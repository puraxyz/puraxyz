"use client";

import { useEffect, useState } from "react";
import styles from "./TableOfContents.module.css";

interface Section {
  id: string;
  label: string;
  level: 2 | 3;
}

export default function TableOfContents({ sections }: { sections: Section[] }) {
  const [activeId, setActiveId] = useState("");

  useEffect(() => {
    const els = sections
      .map((s) => document.getElementById(s.id))
      .filter(Boolean) as HTMLElement[];

    if (!els.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
            break;
          }
        }
      },
      { rootMargin: "-80px 0px -60% 0px", threshold: 0 }
    );

    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [sections]);

  return (
    <nav className={styles.toc} aria-label="Table of contents">
      <ul className={styles.list}>
        {sections.map((s) => (
          <li key={s.id} className={s.level === 3 ? styles.indent : undefined}>
            <a
              href={`#${s.id}`}
              className={activeId === s.id ? styles.active : styles.link}
              onClick={(e) => {
                e.preventDefault();
                document.getElementById(s.id)?.scrollIntoView({ behavior: "smooth" });
              }}
            >
              {s.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
