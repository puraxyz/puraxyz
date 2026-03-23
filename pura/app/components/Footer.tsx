import Link from "next/link";
import styles from "./Footer.module.css";

export function Footer() {
  return (
    <footer className={styles.bar}>
      <div className={styles.left}>
        <span className={styles.session}>[pura]</span>
        <Link href="/" className={styles.win}>
          0:dashboard<span className={styles.active}>*</span>
        </Link>
        <Link href="/deploy" className={styles.win}>
          1:deploy<span className={styles.inactive}>-</span>
        </Link>
      </div>
      <div className={styles.right}>
        <a
          href="https://backproto.io"
          target="_blank"
          rel="noopener noreferrer"
          className={styles.ext}
        >
          backproto.io
        </a>
        <span className={styles.sep}>│</span>
        <a
          href="https://github.com/backproto"
          target="_blank"
          rel="noopener noreferrer"
          className={styles.ext}
        >
          github
        </a>
        <span className={styles.sep}>│</span>
        <span className={styles.ts}>MIT</span>
      </div>
    </footer>
  );
}
