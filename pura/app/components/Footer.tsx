import Link from "next/link";
import styles from "./Footer.module.css";

const FOOTER_LINKS = [
  { href: "/docs", label: "docs" },
  { href: "/paper", label: "paper" },
  { href: "/blog", label: "blog" },
  { href: "/pricing", label: "pricing" },
  { href: "/about", label: "about" },
  { href: "/monitor", label: "monitor" },
  { href: "/status", label: "status" },
];

export function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.top}>
          <div className={styles.links}>
            {FOOTER_LINKS.map(({ href, label }) => (
              <Link key={href} href={href}>
                {label}
              </Link>
            ))}
          </div>
          <div className={styles.socials}>
            <a
              href="https://github.com/puraxyz/puraxyz"
              target="_blank"
              rel="noopener noreferrer"
            >
              github
            </a>
            <a
              href="https://github.com/puraxyz/puraxyz/issues"
              target="_blank"
              rel="noopener noreferrer"
            >
              report an issue
            </a>
          </div>
        </div>
        <div className={styles.bottom}>
          pura.xyz
        </div>
      </div>
    </footer>
  );
}
