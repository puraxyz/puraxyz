import Link from "next/link";
import styles from "./Nav.module.css";

export function Nav() {
  return (
    <nav className={styles.bar}>
      <div className={styles.left}>
        <Link href="/" className={styles.session}>
          [pura<span className={styles.active}>*</span>]
        </Link>
        <Link href="/deploy" className={styles.tab}>
          1:deploy<span className={styles.inactive}>-</span>
        </Link>
      </div>
      <div className={styles.right}>
        <a
          href="https://backproto.io"
          target="_blank"
          rel="noopener noreferrer"
          className={styles.tab}
        >
          protocol ↗
        </a>
        <span className={styles.net}>
          base-sepolia <span className={styles.dot}>●</span>
        </span>
      </div>
    </nav>
  );
}
