'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  SignedIn,
  SignedOut,
  SignInButton,
  UserButton,
} from '@clerk/nextjs'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import styles from './TopNav.module.css'

const NAV_LINKS = [
  { href: '/registry', label: 'Registry' },
  { href: '/compare', label: 'Compare' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/docs', label: 'Docs' },
  { href: '/paper', label: 'Paper' },
  { href: '/about', label: 'About' },
]

export default function TopNav() {
  const [mounted, setMounted] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    setMounted(true)
    const onScroll = () => setScrolled(window.scrollY > 10)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Close menu on route change
  useEffect(() => {
    setMenuOpen(false)
  }, [pathname])

  const toggleMenu = useCallback(() => setMenuOpen((v) => !v), [])

  return (
    <>
      <nav className={`${styles.nav} ${scrolled || menuOpen ? styles.scrolled : ''}`}>
        <div className={styles.inner}>
          {/* Logo */}
          <Link href="/" className={styles.logo}>
            vr.dev
            <span className={styles.logoDivider}>|</span>
            <span className={styles.logoTagline}>AI Verifiable Rewards</span>
          </Link>

          {/* Center links (desktop) */}
          <div className={styles.links}>
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`${styles.link} ${pathname?.startsWith(link.href) ? styles.activeLink : ''}`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Auth (desktop) */}
          <div className={styles.auth}>
            {mounted && (
              <>
                <SignedOut>
                  <SignInButton mode="modal">
                    <button className={styles.signInBtn}>Sign In</button>
                  </SignInButton>
                </SignedOut>
                <SignedIn>
                  <Link href="/dashboard" className={styles.keysLink}>
                    Dashboard
                  </Link>
                  <Link href="/keys" className={styles.keysLink}>
                    API Keys
                  </Link>
                  <UserButton
                    afterSignOutUrl="/"
                    appearance={{
                      elements: {
                        avatarBox: { width: 32, height: 32 },
                      },
                    }}
                  />
                </SignedIn>
              </>
            )}
          </div>

          {/* Hamburger button (mobile) */}
          <button
            className={styles.hamburger}
            onClick={toggleMenu}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
          >
            <span className={`${styles.hamburgerLine} ${menuOpen ? styles.hamburgerOpen : ''}`} />
            <span className={`${styles.hamburgerLine} ${menuOpen ? styles.hamburgerOpen : ''}`} />
            <span className={`${styles.hamburgerLine} ${menuOpen ? styles.hamburgerOpen : ''}`} />
          </button>
        </div>
      </nav>

      {/* Mobile menu panel */}
      {menuOpen && (
        <div className={styles.mobileMenu}>
          <div className={styles.mobileLinks}>
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`${styles.mobileLink} ${pathname?.startsWith(link.href) ? styles.mobileLinkActive : ''}`}
              >
                {link.label}
              </Link>
            ))}
          </div>
          <div className={styles.mobileAuth}>
            {mounted && (
              <>
                <SignedOut>
                  <SignInButton mode="modal">
                    <button className={styles.signInBtn}>Sign In</button>
                  </SignInButton>
                </SignedOut>
                <SignedIn>
                  <Link href="/dashboard" className={styles.keysLink}>
                    Dashboard
                  </Link>
                  <Link href="/keys" className={styles.keysLink}>
                    API Keys
                  </Link>
                  <UserButton
                    afterSignOutUrl="/"
                    appearance={{
                      elements: {
                        avatarBox: { width: 32, height: 32 },
                      },
                    }}
                  />
                </SignedIn>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
