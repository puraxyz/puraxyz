import styles from "./Footer.module.css";

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <span>MIT License &middot; Spilt Contributors 2026</span>
        <div className={styles.links}>
          <a href="https://github.com/spiltdev/spilt" target="_blank" rel="noopener noreferrer">
            GitHub
          </a>
          <a href="https://sepolia.basescan.org/address/0x8e999a246afea241cf3c1d400dd7786cf591fa88" target="_blank" rel="noopener noreferrer">
            Basescan
          </a>
        </div>
      </div>
    </footer>
  );
}
