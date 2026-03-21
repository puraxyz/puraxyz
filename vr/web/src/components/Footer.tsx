'use client'

import Link from 'next/link'
import styles from './Footer.module.css'

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.footerInner}>
        <div className={styles.footerBrand}>
          <Link href="/" className={styles.footerLogo}>
            vr.dev
          </Link>
          <p>Verify what AI agents actually changed</p>
        </div>
        <div className={styles.footerLinks}>
          <div className={styles.footerCol}>
            <h5>Product</h5>
            <Link href="/registry">Registry</Link>
            <Link href="/docs/quickstart">Docs</Link>
            <Link href="/demos">Demos</Link>
            <Link href="/keys">API Keys</Link>
          </div>
          <div className={styles.footerCol}>
            <h5>Company</h5>
            <Link href="/about">About</Link>
            <Link href="/terms">Terms</Link>
          </div>
          <div className={styles.footerCol}>
            <h5>Community</h5>
            <a href="https://github.com/vrDotDev/vr-dev" target="_blank" rel="noopener noreferrer">GitHub</a>
            <a href="https://bsky.app/profile/vr.dev" target="_blank" rel="noopener noreferrer">Bluesky</a>
          </div>
        </div>
      </div>
      <div className={styles.footerBottom}>
        <p>&copy; {new Date().getFullYear()} vr.dev. All rights reserved.</p>
      </div>
    </footer>
  )
}
